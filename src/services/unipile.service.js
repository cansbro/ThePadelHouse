const axios = require('axios');
const config = require('../config/config');

/**
 * Unipile WhatsApp API Entegrasyonu
 */
class UnipileService {
  constructor() {
    this.apiUrl = config.unipile.apiUrl;
    this.apiKey = config.unipile.apiKey;
    this.accountId = config.unipile.accountId;

    // Axios instance oluştur
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * WhatsApp mesajı gönder
   */
  async sendMessage(phoneNumber, message) {
    try {
      // Telefon numarasını formatla (+90 ile başlayacak şekilde)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const response = await this.client.post('/messages', {
        account_id: this.accountId,
        provider: 'WHATSAPP',
        attendees: [
          {
            identifier: formattedPhone,
            type: 'PHONE_NUMBER'
          }
        ],
        text: message
      });

      console.log('✅ WhatsApp mesajı gönderildi:', formattedPhone);

      return {
        success: true,
        messageId: response.data.object?.id,
        response: response.data
      };

    } catch (error) {
      console.error('❌ WhatsApp mesaj gönderim hatası:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Gelen mesajları al (webhook alternatifi)
   */
  async getMessages(limit = 50) {
    try {
      const response = await this.client.get('/messages', {
        params: {
          account_id: this.accountId,
          limit: limit
        }
      });

      return {
        success: true,
        messages: response.data.items || []
      };

    } catch (error) {
      console.error('❌ Mesajları alma hatası:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        messages: []
      };
    }
  }

  /**
   * Webhook URL'ini ayarla
   */
  async setupWebhook(webhookUrl) {
    try {
      const response = await this.client.post('/webhook', {
        account_id: this.accountId,
        url: webhookUrl,
        events: [
          'MESSAGE_CREATED',
          'MESSAGE_UPDATED'
        ]
      });

      console.log('✅ Webhook ayarlandı:', webhookUrl);

      return {
        success: true,
        response: response.data
      };

    } catch (error) {
      console.error('❌ Webhook kurulum hatası:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Hesap durumunu kontrol et
   */
  async checkAccountStatus() {
    try {
      const response = await this.client.get(`/accounts/${this.accountId}`);

      const status = response.data.object;

      console.log('📱 WhatsApp Hesap Durumu:', {
        id: status.id,
        provider: status.provider,
        isConnected: status.is_connected,
        name: status.name
      });

      return {
        success: true,
        isConnected: status.is_connected,
        account: status
      };

    } catch (error) {
      console.error('❌ Hesap durumu kontrol hatası:', error.response?.data || error.message);
      return {
        success: false,
        isConnected: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Mesajı "okundu" olarak işaretle
   */
  async markAsRead(messageId) {
    try {
      await this.client.patch(`/messages/${messageId}`, {
        account_id: this.accountId,
        is_read: true
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Mesaj okundu işaretleme hatası:', error.response?.data || error.message);
      return { success: false };
    }
  }

  /**
   * Yazıyor göstergesi gönder
   */
  async sendTypingIndicator(phoneNumber) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      await this.client.post('/chat/typing', {
        account_id: this.accountId,
        attendee: {
          identifier: formattedPhone,
          type: 'PHONE_NUMBER'
        },
        provider: 'WHATSAPP'
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Yazıyor göstergesi hatası:', error.response?.data || error.message);
      return { success: false };
    }
  }

  /**
   * Telefon numarasını formatla
   * Örnek: 5551234567 -> +905551234567
   */
  formatPhoneNumber(phoneNumber) {
    // Tüm boşluk ve özel karakterleri temizle
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Eğer + ile başlamıyorsa, +90 ekle
    if (!cleaned.startsWith('+')) {
      // 0 ile başlıyorsa çıkar
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      // 90 ile başlamıyorsa ekle
      if (!cleaned.startsWith('90')) {
        cleaned = '90' + cleaned;
      }
      // + ekle
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Medya dosyası gönder (resim, video, doküman)
   */
  async sendMedia(phoneNumber, mediaUrl, caption = '') {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const response = await this.client.post('/messages', {
        account_id: this.accountId,
        provider: 'WHATSAPP',
        attendees: [
          {
            identifier: formattedPhone,
            type: 'PHONE_NUMBER'
          }
        ],
        attachments: [
          {
            url: mediaUrl
          }
        ],
        text: caption
      });

      console.log('✅ Medya gönderildi:', formattedPhone);

      return {
        success: true,
        messageId: response.data.object?.id
      };

    } catch (error) {
      console.error('❌ Medya gönderim hatası:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * API bağlantısını test et
   */
  async testConnection() {
    try {
      const status = await this.checkAccountStatus();
      return status.success && status.isConnected;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new UnipileService();
