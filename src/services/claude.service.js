const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/config');
const memoryService = require('./memory.service');

/**
 * Claude AI ile doğal dil etkileşimi sağlayan servis
 */
class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey
    });
    this.model = config.anthropic.model;
  }

  /**
   * Sistem promptu - Asistanın karakterini ve görevini tanımlar
   */
  getSystemPrompt(availableCourts, customerContext = '') {
    const { pricing, businessHours, reservationRules, business } = config;

    return `Sen ${business.name} için profesyonel ve samimi bir rezervasyon asistanısın. WhatsApp üzerinden müşterilere yardımcı oluyorsun.

🎾 **İŞLETME BİLGİLERİ:**
- İsim: ${business.name}
- Konum: ${business.address}
- Telefon: ${business.phone}
- Email: ${business.email}

⏰ **ÇALIŞMA SAATLERİ:**
- Açılış: ${businessHours.openTime}
- Kapanış: ${businessHours.closeTime}
- Rezervasyon süresi: ${businessHours.slotDuration} dakika

💰 **FİYATLANDIRMA:**
- Hafta içi sabah (08:00-17:00): ${pricing.weekdayMorning}₺/saat
- Hafta içi akşam (17:00-23:00): ${pricing.weekdayEvening}₺/saat
- Hafta sonu (tüm gün): ${pricing.weekend}₺/saat

📋 **REZERVASYON KURALLARI:**
- Minimum süre: ${reservationRules.minDuration} dakika
- Maksimum süre: ${reservationRules.maxDuration} dakika
- İptal: ${reservationRules.cancellationHours} saat öncesinden
- Ödeme: Peşin (WhatsApp üzerinden bağlantı gönderilecek)

🏟️ **KORTLAR:**
${config.courts.map(c => `- ${c.name}`).join('\n')}

${customerContext}

📱 **GÖREVIN:**
1. Müşteriyi sıcak ve profesyonel bir şekilde karşıla
2. Rezervasyon için gerekli bilgileri topla:
   - İsim Soyisim
   - Email adresi
   - Tercih edilen tarih ve saat
   - Kaç kişi oynayacak
3. Müsait kortları kontrol et ve müşteriye öner
4. Fiyat bilgisini net olarak ilet
5. Rezervasyonu onayla ve email gönderileceğini belirt
6. Sorularını yanıtla ve yardımcı ol

🎯 **ÖNEMLİ KURALLAR:**
- Her zaman Türkçe konuş
- Samimi ama profesyonel ol
- Emoji kullanabilirsin ama abartma (2-3 emoji yeterli)
- Kısa ve net cevaplar ver
- Müşterinin ismini kullan (öğrendikten sonra)
- Eğer müsait kort yoksa alternatif saatler öner
- Belirsiz durumlarda soru sor

🔍 **MEVCUT KORT DURUMU:**
${availableCourts || 'Henüz bilgi yok, müşteriden tarih bilgisi al'}

💬 **KONUŞMA TARZI:**
- "Merhaba! ThePadelHouse'a hoş geldiniz 🎾"
- "Tabii ki yardımcı olabilirim!"
- "Hangi tarih ve saat aklınızda?"
- "Harika bir seçim!"
- "Rezervasyonunuz onaylandı, email gönderiyorum ✅"

Müşteriye yardımcı ol ve harika bir deneyim yaşat!`;
  }

  /**
   * Müşteri mesajını işle ve yanıt oluştur
   */
  async processMessage(phoneNumber, userMessage, availableCourts = null) {
    try {
      // Konuşma geçmişini al
      const { history, context, customerInfo } = memoryService.getFormattedHistory(phoneNumber);

      // Müşteri bilgisi varsa context'e ekle
      const systemPrompt = this.getSystemPrompt(availableCourts, context);

      // Mesajları hazırla
      const messages = [
        ...history,
        {
          role: 'user',
          content: userMessage
        }
      ];

      // Claude'a gönder
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: config.anthropic.maxTokens,
        system: systemPrompt,
        messages: messages
      });

      const assistantMessage = response.content[0].text;

      // Konuşmayı hafızaya kaydet
      memoryService.addMessage(phoneNumber, 'user', userMessage);
      memoryService.addMessage(phoneNumber, 'assistant', assistantMessage);

      // Müşteri bilgilerini çıkar ve kaydet (isim, email vb.)
      await this.extractAndSaveCustomerInfo(phoneNumber, userMessage, assistantMessage);

      return assistantMessage;

    } catch (error) {
      console.error('❌ Claude API hatası:', error);
      return 'Üzgünüm, şu anda bir teknik sorun yaşıyorum. Lütfen biraz sonra tekrar deneyin veya bizi arayın: ' + config.business.phone;
    }
  }

  /**
   * Mesajlardan müşteri bilgilerini çıkar ve kaydet
   */
  async extractAndSaveCustomerInfo(phoneNumber, userMessage, assistantMessage) {
    try {
      const currentInfo = memoryService.getCustomerInfo(phoneNumber) || {};
      const newInfo = {};

      // İsim tespiti
      if (!currentInfo.name) {
        const nameMatch = userMessage.match(/(?:benim adım|ismim|adım)\s+([a-zğüşıöçA-ZĞÜŞİÖÇ\s]+)/i);
        if (nameMatch) {
          newInfo.name = nameMatch[1].trim();
        }
      }

      // Email tespiti
      if (!currentInfo.email) {
        const emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          newInfo.email = emailMatch[1].toLowerCase();
        }
      }

      // Telefon numarası kaydet (zaten var ama ekleyelim)
      newInfo.phone = phoneNumber;

      // Yeni bilgi varsa kaydet
      if (Object.keys(newInfo).length > 0) {
        memoryService.saveCustomerInfo(phoneNumber, newInfo);
      }

    } catch (error) {
      console.error('⚠️  Müşteri bilgisi çıkarma hatası:', error);
    }
  }

  /**
   * Müşteriye hoş geldin mesajı gönder
   */
  async generateWelcomeMessage(phoneNumber) {
    const isReturning = memoryService.isReturningCustomer(phoneNumber);
    const customerInfo = memoryService.getCustomerInfo(phoneNumber);

    if (isReturning && customerInfo?.name) {
      return `Merhaba ${customerInfo.name}! Tekrar görmek güzel 🎾\n\nSize nasıl yardımcı olabilirim?`;
    }

    return `Merhaba! ${config.business.name}'a hoş geldiniz 🎾\n\nPadel kortu rezervasyonu için size yardımcı olabilirim. Hangi tarih ve saat dilimini tercih edersiniz?`;
  }
}

module.exports = new ClaudeService();
