const axios = require('axios');
const config = require('../config/config');

/**
 * Unipile Multi-Platform API Servisi
 * WhatsApp + Instagram desteği
 */
class UnipileService {
  constructor() {
    this.apiUrl = config.unipile.apiUrl;
    this.apiKey = config.unipile.apiKey;

    // Platform hesap ID'leri
    this.accounts = {
      whatsapp: config.unipile.whatsapp.accountId,
      instagram: config.unipile.instagram.accountId
    };

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
   * Platform'dan mesaj gönder (WhatsApp veya Instagram)
   * @param {string} platform - 'whatsapp' veya 'instagram'
   * @param {string} identifier - Telefon numarası veya Instagram username
   * @param {string} message - Gönderilecek mesaj
   */
  async sendMessage(platform, identifier, message) {
    try {
      const accountId = this.accounts[platform];
      const platformConfig = config.platforms[platform];

      if (!accountId) {
        throw new Error(`${platform} account ID bulunamadı`);
      }

      // Identifier'ı formatla
      const formattedIdentifier = platform === 'whatsapp'
        ? this.formatPhoneNumber(identifier)
        : identifier;

      const identifierType = platform === 'whatsapp'
        ? 'PHONE_NUMBER'
        : 'USERNAME';

      const response = await this.client.post('/messages', {
        account_id: accountId,
        provider: platformConfig.provider,
        attendees: [
          {
            identifier: formattedIdentifier,
            type: identifierType
          }
        ],
        text: message
      });

      console.log(`✅ ${platformConfig.icon} ${platformConfig.name} mesajı gönderildi:`, formattedIdentifier);

      return {
        success: true,
        platform,
        messageId: response.data.object?.id,
        response: response.data
      };

    } catch (error) {
      console.error(`❌ ${platform} mesaj gönderim hatası:`, error.response?.data || error.message);
      return {
        success: false,
        platform,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Gelen mesajları al (tüm platformlar veya belirli platform)
   */
  async getMessages(platform = null, limit = 50) {
    try {
      const params = { limit };

      if (platform) {
        params.account_id = this.accounts[platform];
      }

      const response = await this.client.get('/messages', { params });

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
   * Webhook URL'ini ayarla (tüm platformlar için)
   */
  async setupWebhook(webhookUrl) {
    try {
      const results = {
        whatsapp: null,
        instagram: null
      };

      // WhatsApp webhook
      if (config.unipile.whatsapp.enabled && this.accounts.whatsapp) {
        try {
          const whatsappWebhook = await this.client.post('/webhook', {
            account_id: this.accounts.whatsapp,
            url: webhookUrl,
            events: ['MESSAGE_CREATED', 'MESSAGE_UPDATED']
          });
          results.whatsapp = { success: true, data: whatsappWebhook.data };
          console.log('✅ WhatsApp webhook ayarlandı:', webhookUrl);
        } catch (error) {
          results.whatsapp = { success: false, error: error.message };
          console.error('❌ WhatsApp webhook hatası:', error.message);
        }
      }

      // Instagram webhook
      if (config.unipile.instagram.enabled && this.accounts.instagram) {
        try {
          const instagramWebhook = await this.client.post('/webhook', {
            account_id: this.accounts.instagram,
            url: webhookUrl,
            events: ['MESSAGE_CREATED', 'MESSAGE_UPDATED']
          });
          results.instagram = { success: true, data: instagramWebhook.data };
          console.log('✅ Instagram webhook ayarlandı:', webhookUrl);
        } catch (error) {
          results.instagram = { success: false, error: error.message };
          console.error('❌ Instagram webhook hatası:', error.message);
        }
      }

      return {
        success: true,
        results
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
  async checkAccountStatus(platform) {
    try {
      const accountId = this.accounts[platform];

      if (!accountId) {
        return {
          success: false,
          isConnected: false,
          error: `${platform} account ID bulunamadı`
        };
      }

      const response = await this.client.get(`/accounts/${accountId}`);
      const status = response.data.object;
      const platformConfig = config.platforms[platform];

      console.log(`${platformConfig.icon} ${platformConfig.name} Hesap Durumu:`, {
        id: status.id,
        provider: status.provider,
        isConnected: status.is_connected,
        name: status.name
      });

      return {
        success: true,
        platform,
        isConnected: status.is_connected,
        account: status
      };

    } catch (error) {
      console.error(`❌ ${platform} hesap durumu kontrol hatası:`, error.response?.data || error.message);
      return {
        success: false,
        platform,
        isConnected: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Tüm hesapların durumunu kontrol et
   */
  async checkAllAccountsStatus() {
    const results = {};

    if (config.unipile.whatsapp.enabled) {
      results.whatsapp = await this.checkAccountStatus('whatsapp');
    }

    if (config.unipile.instagram.enabled) {
      results.instagram = await this.checkAccountStatus('instagram');
    }

    return results;
  }

  /**
   * Mesajı "okundu" olarak işaretle
   */
  async markAsRead(messageId, platform) {
    try {
      const accountId = this.accounts[platform];

      await this.client.patch(`/messages/${messageId}`, {
        account_id: accountId,
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
  async sendTypingIndicator(platform, identifier) {
    try {
      const accountId = this.accounts[platform];
      const platformConfig = config.platforms[platform];

      const formattedIdentifier = platform === 'whatsapp'
        ? this.formatPhoneNumber(identifier)
        : identifier;

      const identifierType = platform === 'whatsapp'
        ? 'PHONE_NUMBER'
        : 'USERNAME';

      await this.client.post('/chat/typing', {
        account_id: accountId,
        attendee: {
          identifier: formattedIdentifier,
          type: identifierType
        },
        provider: platformConfig.provider
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Yazıyor göstergesi hatası:', error.response?.data || error.message);
      return { success: false };
    }
  }

  /**
   * Telefon numarasını formatla (WhatsApp için)
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
  async sendMedia(platform, identifier, mediaUrl, caption = '') {
    try {
      const accountId = this.accounts[platform];
      const platformConfig = config.platforms[platform];

      const formattedIdentifier = platform === 'whatsapp'
        ? this.formatPhoneNumber(identifier)
        : identifier;

      const identifierType = platform === 'whatsapp'
        ? 'PHONE_NUMBER'
        : 'USERNAME';

      const response = await this.client.post('/messages', {
        account_id: accountId,
        provider: platformConfig.provider,
        attendees: [
          {
            identifier: formattedIdentifier,
            type: identifierType
          }
        ],
        attachments: [
          {
            url: mediaUrl
          }
        ],
        text: caption
      });

      console.log(`✅ ${platformConfig.icon} Medya gönderildi:`, formattedIdentifier);

      return {
        success: true,
        platform,
        messageId: response.data.object?.id
      };

    } catch (error) {
      console.error(`❌ ${platform} medya gönderim hatası:`, error.response?.data || error.message);
      return {
        success: false,
        platform,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Platform'u tespit et (mesaj objesinden)
   */
  detectPlatform(messageObject) {
    const accountId = messageObject.account_id;

    if (accountId === this.accounts.whatsapp) {
      return 'whatsapp';
    } else if (accountId === this.accounts.instagram) {
      return 'instagram';
    }

    return null;
  }

  /**
   * Mesaj gönderenin identifier'ını al
   */
  getIdentifierFromMessage(messageObject, platform) {
    // Attendees'den identifier al
    const attendee = messageObject.attendees?.find(a => !a.is_me);

    if (attendee) {
      return attendee.identifier;
    }

    // Chat identifier'ını kullan
    if (messageObject.chat?.identifier) {
      return messageObject.chat.identifier;
    }

    return null;
  }

  /**
   * API bağlantısını test et
   */
  async testConnection() {
    try {
      const statuses = await this.checkAllAccountsStatus();

      const whatsappOk = statuses.whatsapp?.isConnected || false;
      const instagramOk = statuses.instagram?.isConnected || false;

      return {
        whatsapp: whatsappOk,
        instagram: instagramOk,
        anyConnected: whatsappOk || instagramOk
      };
    } catch (error) {
      return {
        whatsapp: false,
        instagram: false,
        anyConnected: false
      };
    }
  }
}

module.exports = new UnipileService();
