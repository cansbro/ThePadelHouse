const { google } = require('googleapis');
const config = require('../config/config');

/**
 * Google Calendar ile entegrasyon - Kort müsaitliğini yönetir
 */
class CalendarService {
  constructor() {
    // Google Calendar API istemcisi
    this.auth = new google.auth.JWT(
      config.google.clientEmail,
      null,
      config.google.privateKey,
      ['https://www.googleapis.com/auth/calendar']
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    this.calendarId = config.google.calendarId;
    this.timeZone = config.google.timeZone;
  }

  /**
   * Belirli bir tarih ve saat aralığında müsait kortları bul
   */
  async getAvailableCourts(date, startTime) {
    try {
      const { openTime, closeTime, slotDuration } = config.businessHours;

      // Tarih ve saati oluştur
      const requestedDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(requestedDateTime.getTime() + slotDuration * 60000);

      // İş saatleri kontrolü
      const requestedHour = requestedDateTime.getHours();
      const requestedMinute = requestedDateTime.getMinutes();
      const openHour = parseInt(openTime.split(':')[0]);
      const closeHour = parseInt(closeTime.split(':')[0]);

      if (requestedHour < openHour || requestedHour >= closeHour) {
        return {
          available: false,
          message: `Maalesef bu saat dilimi çalışma saatlerimiz dışında. Çalışma saatlerimiz: ${openTime} - ${closeTime}`
        };
      }

      // Mevcut rezervasyonları al
      const events = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: requestedDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const reservedCourts = new Set();
      if (events.data.items) {
        events.data.items.forEach(event => {
          // Event summary'den kort numarasını çıkar
          const courtMatch = event.summary?.match(/Kort (\d+)/);
          if (courtMatch) {
            reservedCourts.add(parseInt(courtMatch[1]));
          }
        });
      }

      // Müsait kortları bul
      const availableCourts = config.courts.filter(court => !reservedCourts.has(court.id));

      // Fiyat hesapla
      const price = this.calculatePrice(date, startTime);

      return {
        available: availableCourts.length > 0,
        courts: availableCourts,
        reservedCourts: Array.from(reservedCourts),
        date,
        startTime,
        endTime: this.formatTime(endDateTime),
        duration: config.businessHours.slotDuration,
        price,
        message: availableCourts.length > 0
          ? `${availableCourts.length} kort müsait: ${availableCourts.map(c => c.name).join(', ')}`
          : 'Bu saat diliminde maalesef tüm kortlar dolu.'
      };

    } catch (error) {
      console.error('❌ Calendar servis hatası:', error);
      throw new Error('Kort müsaitliği kontrol edilirken bir hata oluştu.');
    }
  }

  /**
   * Rezervasyon oluştur
   */
  async createReservation(courtId, date, startTime, customerInfo) {
    try {
      const court = config.courts.find(c => c.id === courtId);
      if (!court) {
        throw new Error('Geçersiz kort numarası');
      }

      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + config.businessHours.slotDuration * 60000);

      // Önce müsait mi kontrol et
      const availability = await this.getAvailableCourts(date, startTime);
      const isCourtAvailable = availability.courts.some(c => c.id === courtId);

      if (!isCourtAvailable) {
        return {
          success: false,
          message: `${court.name} bu saat diliminde müsait değil.`
        };
      }

      // Google Calendar'a etkinlik ekle
      const event = {
        summary: `${court.name} - ${customerInfo.name}`,
        description: `Rezervasyon Detayları:\n\nMüşteri: ${customerInfo.name}\nEmail: ${customerInfo.email}\nTelefon: ${customerInfo.phone}\nFiyat: ${availability.price}₺\n\nThePadelHouse Rezervasyon Sistemi`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: this.timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: this.timeZone,
        },
        colorId: courtId.toString(), // Her kort için farklı renk
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 gün önce
            { method: 'popup', minutes: 60 }, // 1 saat önce
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        court,
        date,
        startTime,
        endTime: this.formatTime(endDateTime),
        price: availability.price,
        message: 'Rezervasyonunuz başarıyla oluşturuldu!'
      };

    } catch (error) {
      console.error('❌ Rezervasyon oluşturma hatası:', error);
      return {
        success: false,
        message: 'Rezervasyon oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.'
      };
    }
  }

  /**
   * Rezervasyonu iptal et
   */
  async cancelReservation(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      return {
        success: true,
        message: 'Rezervasyonunuz başarıyla iptal edildi.'
      };

    } catch (error) {
      console.error('❌ Rezervasyon iptal hatası:', error);
      return {
        success: false,
        message: 'Rezervasyon iptal edilirken bir hata oluştu.'
      };
    }
  }

  /**
   * Belirli bir gün için tüm rezervasyonları getir
   */
  async getDaySchedule(date) {
    try {
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);

      const events = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return events.data.items || [];

    } catch (error) {
      console.error('❌ Günlük program alma hatası:', error);
      return [];
    }
  }

  /**
   * Fiyat hesapla (tarih ve saate göre)
   */
  calculatePrice(date, startTime) {
    const dateObj = new Date(`${date}T${startTime}:00`);
    const dayOfWeek = dateObj.getDay(); // 0 = Pazar, 6 = Cumartesi
    const hour = dateObj.getHours();

    const { weekdayMorning, weekdayEvening, weekend } = config.pricing;

    // Hafta sonu (Cumartesi veya Pazar)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return weekend;
    }

    // Hafta içi
    if (hour < 17) {
      return weekdayMorning; // Sabah
    } else {
      return weekdayEvening; // Akşam
    }
  }

  /**
   * Zamanı formatla (HH:MM)
   */
  formatTime(date) {
    return date.toTimeString().slice(0, 5);
  }

  /**
   * Tarihi formatla (YYYY-MM-DD)
   */
  formatDate(date) {
    return date.toISOString().slice(0, 10);
  }

  /**
   * Belirli bir tarih aralığı için müsait slotları listele
   */
  async getAvailableSlots(startDate, endDate) {
    try {
      const slots = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        const dateStr = this.formatDate(current);

        // Sadece çalışma saatleri içinde slotları kontrol et
        for (let hour = 8; hour < 23; hour++) {
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          const availability = await this.getAvailableCourts(dateStr, timeStr);

          if (availability.available) {
            slots.push({
              date: dateStr,
              time: timeStr,
              courts: availability.courts,
              price: availability.price
            });
          }
        }

        current.setDate(current.getDate() + 1);
      }

      return slots;

    } catch (error) {
      console.error('❌ Müsait slot listeleme hatası:', error);
      return [];
    }
  }
}

module.exports = new CalendarService();
