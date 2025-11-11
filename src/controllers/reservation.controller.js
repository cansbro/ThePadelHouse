const claudeService = require('../services/claude.service');
const calendarService = require('../services/calendar.service');
const emailService = require('../services/email.service');
const memoryService = require('../services/memory.service');
const unipileService = require('../services/unipile.service');
const config = require('../config/config');

/**
 * Multi-Platform Rezervasyon Controller
 * WhatsApp + Instagram desteği
 */
class ReservationController {

  /**
   * Gelen mesajı işle (WhatsApp veya Instagram)
   * @param {string} platform - 'whatsapp' veya 'instagram'
   * @param {string} identifier - Telefon numarası (WhatsApp) veya Username (Instagram)
   * @param {string} message - Mesaj içeriği
   */
  async handleIncomingMessage(platform, identifier, message) {
    try {
      const platformIcon = config.platforms[platform]?.icon || '💬';
      console.log(`${platformIcon} Gelen mesaj (${platform}): ${identifier} - "${message}"`);

      // Yazıyor göstergesi gönder (daha doğal görünür)
      await unipileService.sendTypingIndicator(platform, identifier);

      // Memory için unique key oluştur (platform + identifier)
      const memoryKey = `${platform}:${identifier}`;

      // Mesajı analiz et - rezervasyon talebi mi?
      const intent = await this.detectIntent(message);

      let aiResponse;

      if (intent.type === 'availability_check') {
        // Kort müsaitliği sorgusu
        const availability = await calendarService.getAvailableCourts(
          intent.date,
          intent.time
        );

        // AI'a mevcut kort durumunu ver ve yanıt oluştur
        const courtInfo = this.formatAvailabilityForAI(availability);
        aiResponse = await claudeService.processMessage(memoryKey, message, courtInfo);

      } else if (intent.type === 'reservation_request') {
        // Rezervasyon talebi - Önce müşteri bilgilerini kontrol et
        const customerInfo = memoryService.getCustomerInfo(memoryKey);

        if (!customerInfo?.name || !customerInfo?.email) {
          // Eksik bilgi var, AI'dan sorup almasını iste
          aiResponse = await claudeService.processMessage(memoryKey, message);
        } else {
          // Bilgiler tamam, rezervasyonu oluştur
          const reservation = await this.createReservation({
            platform,
            identifier,
            courtId: intent.courtId,
            date: intent.date,
            startTime: intent.time,
            customerInfo
          });

          if (reservation.success) {
            aiResponse = `Harika! Rezervasyonunuz oluşturuldu 🎉\n\n` +
              `📍 ${reservation.court.name}\n` +
              `📅 ${this.formatDate(reservation.date)}\n` +
              `🕐 ${reservation.startTime} - ${reservation.endTime}\n` +
              `💰 ${reservation.price}₺\n\n` +
              `Onay emaili ${customerInfo.email} adresinize gönderildi ✅\n\n` +
              `Görüşmek üzere! 🎾`;

            // Hafızaya rezervasyonu kaydet
            memoryService.addReservation(memoryKey, {
              platform,
              court: reservation.court.name,
              date: reservation.date,
              time: reservation.startTime,
              price: reservation.price
            });
          } else {
            aiResponse = `Üzgünüm, rezervasyon oluşturulurken bir sorun oluştu. ${reservation.message}`;
          }
        }

      } else if (intent.type === 'cancellation') {
        // İptal talebi
        aiResponse = await this.handleCancellation(platform, identifier, message);

      } else {
        // Genel sohbet - AI'a yönlendir
        aiResponse = await claudeService.processMessage(memoryKey, message);
      }

      // Yanıtı platformdan gönder
      await unipileService.sendMessage(platform, identifier, aiResponse);

      return {
        success: true,
        platform,
        identifier,
        response: aiResponse
      };

    } catch (error) {
      console.error('❌ Mesaj işleme hatası:', error);

      // Hata mesajı gönder
      const errorMessage = 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin veya bizi arayın.';
      await unipileService.sendMessage(platform, identifier, errorMessage);

      return {
        success: false,
        platform,
        identifier,
        error: error.message
      };
    }
  }

  /**
   * Mesajın amacını tespit et (basit intent detection)
   */
  async detectIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Tarih ve saat tespiti
    const dateMatch = message.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-]?(\d{2,4})?/);
    const timeMatch = message.match(/(\d{1,2})[:\.]?(\d{2})?/);

    // Kort numarası tespiti
    const courtMatch = message.match(/kort\s*(\d)/i);

    // İptal talebi
    if (lowerMessage.includes('iptal') || lowerMessage.includes('cancel')) {
      return { type: 'cancellation' };
    }

    // Müsaitlik sorgusu
    if (
      (lowerMessage.includes('müsait') || lowerMessage.includes('boş') || lowerMessage.includes('uygun')) &&
      (dateMatch || timeMatch)
    ) {
      return {
        type: 'availability_check',
        date: dateMatch ? this.parseDate(dateMatch) : null,
        time: timeMatch ? this.parseTime(timeMatch) : null
      };
    }

    // Rezervasyon talebi
    if (
      (lowerMessage.includes('rezervasyon') ||
       lowerMessage.includes('ayırt') ||
       lowerMessage.includes('rezerve') ||
       lowerMessage.includes('yer')) &&
      (dateMatch || timeMatch)
    ) {
      return {
        type: 'reservation_request',
        courtId: courtMatch ? parseInt(courtMatch[1]) : null,
        date: dateMatch ? this.parseDate(dateMatch) : null,
        time: timeMatch ? this.parseTime(timeMatch) : null
      };
    }

    // Genel sohbet
    return { type: 'general' };
  }

  /**
   * Rezervasyon oluştur
   */
  async createReservation(details) {
    const { platform, identifier, courtId, date, startTime, customerInfo } = details;

    // Calendar'a rezervasyon ekle
    const reservation = await calendarService.createReservation(
      courtId,
      date,
      startTime,
      {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: identifier,
        platform: platform
      }
    );

    if (reservation.success) {
      // Email gönder
      await emailService.sendReservationConfirmation({
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        court: reservation.court.name,
        date: reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        price: reservation.price,
        eventId: reservation.eventId
      });
    }

    return reservation;
  }

  /**
   * İptal işlemi
   */
  async handleCancellation(platform, identifier, message) {
    const memoryKey = `${platform}:${identifier}`;

    // AI'dan iptal işlemini yönetmesini iste
    const aiResponse = await claudeService.processMessage(
      memoryKey,
      message,
      'Müşteri rezervasyon iptali yapmak istiyor. Rezervasyon bilgilerini sor ve iptal işlemini yap.'
    );

    return aiResponse;
  }

  /**
   * Müsaitlik bilgisini AI için formatla
   */
  formatAvailabilityForAI(availability) {
    if (!availability.available) {
      return `❌ ${availability.message}\n\nAlternatif saatler önerebilirsin.`;
    }

    const courtList = availability.courts.map(c => c.name).join(', ');
    return `✅ Müsait Kortlar: ${courtList}\n` +
           `📅 Tarih: ${availability.date}\n` +
           `🕐 Saat: ${availability.startTime} - ${availability.endTime}\n` +
           `💰 Fiyat: ${availability.price}₺\n\n` +
           `Bu bilgiyi müşteriye samimi bir dille ilet ve rezervasyon yapmak isteyip istemediğini sor.`;
  }

  /**
   * Tarihi parse et (YYYY-MM-DD formatına çevir)
   */
  parseDate(match) {
    try {
      let day = match[1];
      let month = match[2];
      let year = match[3] || new Date().getFullYear();

      // 2 haneli yılı 4 haneli yap
      if (year.length === 2) {
        year = '20' + year;
      }

      // Sıfır padding ekle
      day = day.padStart(2, '0');
      month = month.padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Tarih parse hatası:', error);
      return null;
    }
  }

  /**
   * Saati parse et (HH:MM formatına çevir)
   */
  parseTime(match) {
    try {
      let hour = match[1];
      let minute = match[2] || '00';

      hour = hour.padStart(2, '0');
      minute = minute.padStart(2, '0');

      return `${hour}:${minute}`;
    } catch (error) {
      console.error('Saat parse hatası:', error);
      return null;
    }
  }

  /**
   * Tarihi okunabilir formata çevir
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Günlük özet mesajı gönder (isteğe bağlı - yöneticiye)
   */
  async sendDailySummary(platform, identifier) {
    try {
      const today = new Date();
      const dateStr = calendarService.formatDate(today);

      const schedule = await calendarService.getDaySchedule(dateStr);
      const stats = memoryService.getStats();

      const platformIcon = config.platforms[platform]?.icon || '💬';

      const summary = `${platformIcon} 📊 Günlük Özet - ${this.formatDate(dateStr)}\n\n` +
        `📅 Toplam Rezervasyon: ${schedule.length}\n` +
        `💬 Aktif Konuşma: ${stats.totalConversations}\n` +
        `👥 Dönüşen Müşteri: ${stats.returningCustomers}\n\n` +
        `Bugünün rezervasyonları:\n` +
        schedule.map(event =>
          `• ${event.summary} - ${new Date(event.start.dateTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
        ).join('\n');

      await unipileService.sendMessage(platform, identifier, summary);

    } catch (error) {
      console.error('❌ Günlük özet gönderme hatası:', error);
    }
  }

  /**
   * Platform istatistikleri
   */
  async getPlatformStats() {
    const stats = memoryService.getStats();
    const allConversations = memoryService.conversations;

    const platformStats = {
      whatsapp: 0,
      instagram: 0,
      total: stats.totalConversations
    };

    // Her platform için konuşma sayısını hesapla
    allConversations.forEach((conversation, key) => {
      if (key.startsWith('whatsapp:')) {
        platformStats.whatsapp++;
      } else if (key.startsWith('instagram:')) {
        platformStats.instagram++;
      }
    });

    return platformStats;
  }
}

module.exports = new ReservationController();
