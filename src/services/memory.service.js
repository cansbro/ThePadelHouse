const config = require('../config/config');

/**
 * Konuşma hafızasını yöneten servis
 * 200+ konuşmayı hafızada tutar ve müşterileri tanır
 */
class MemoryService {
  constructor() {
    // Her müşteri için konuşma geçmişi
    // Format: { phoneNumber: { messages: [], lastActivity: Date, customerInfo: {} } }
    this.conversations = new Map();
    this.maxConversations = config.memory.maxConversations;
    this.timeout = config.memory.conversationTimeout;

    // Periyodik olarak eski konuşmaları temizle
    this.startCleanupInterval();
  }

  /**
   * Konuşmaya yeni mesaj ekle
   */
  addMessage(phoneNumber, role, content) {
    if (!this.conversations.has(phoneNumber)) {
      this.conversations.set(phoneNumber, {
        messages: [],
        lastActivity: new Date(),
        customerInfo: {}
      });
    }

    const conversation = this.conversations.get(phoneNumber);
    conversation.messages.push({
      role,
      content,
      timestamp: new Date()
    });
    conversation.lastActivity = new Date();

    // Maksimum konuşma sayısını aşmamak için eski konuşmaları temizle
    this.enforceMaxConversations();
  }

  /**
   * Müşteri bilgilerini kaydet
   */
  saveCustomerInfo(phoneNumber, info) {
    if (!this.conversations.has(phoneNumber)) {
      this.conversations.set(phoneNumber, {
        messages: [],
        lastActivity: new Date(),
        customerInfo: {}
      });
    }

    const conversation = this.conversations.get(phoneNumber);
    conversation.customerInfo = {
      ...conversation.customerInfo,
      ...info,
      updatedAt: new Date()
    };
  }

  /**
   * Müşteri bilgilerini al
   */
  getCustomerInfo(phoneNumber) {
    const conversation = this.conversations.get(phoneNumber);
    return conversation ? conversation.customerInfo : null;
  }

  /**
   * Konuşma geçmişini al
   */
  getConversationHistory(phoneNumber, limit = 50) {
    const conversation = this.conversations.get(phoneNumber);
    if (!conversation) return [];

    // Son N mesajı al
    const messages = conversation.messages.slice(-limit);
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Claude API için formatlanmış konuşma geçmişi
   */
  getFormattedHistory(phoneNumber, limit = 20) {
    const history = this.getConversationHistory(phoneNumber, limit);
    const customerInfo = this.getCustomerInfo(phoneNumber);

    // Müşteri bilgisi varsa ekle
    let context = '';
    if (customerInfo && Object.keys(customerInfo).length > 0) {
      context = `\n\n[MÜŞTERİ BİLGİLERİ]\n`;
      if (customerInfo.name) context += `İsim: ${customerInfo.name}\n`;
      if (customerInfo.email) context += `Email: ${customerInfo.email}\n`;
      if (customerInfo.totalReservations) context += `Toplam Rezervasyon: ${customerInfo.totalReservations}\n`;
      if (customerInfo.lastReservation) context += `Son Rezervasyon: ${customerInfo.lastReservation}\n`;
      if (customerInfo.preferences) context += `Tercihler: ${customerInfo.preferences}\n`;
    }

    return { history, context, customerInfo };
  }

  /**
   * Müşterinin önceki rezervasyonlarını kaydet
   */
  addReservation(phoneNumber, reservationDetails) {
    const info = this.getCustomerInfo(phoneNumber) || {};
    const totalReservations = (info.totalReservations || 0) + 1;

    this.saveCustomerInfo(phoneNumber, {
      totalReservations,
      lastReservation: new Date().toISOString(),
      lastReservationDetails: reservationDetails
    });
  }

  /**
   * Maksimum konuşma sayısını aşmamak için eski konuşmaları temizle
   */
  enforceMaxConversations() {
    if (this.conversations.size <= this.maxConversations) return;

    // En eski konuşmaları bul ve sil
    const sorted = Array.from(this.conversations.entries())
      .sort((a, b) => a[1].lastActivity - b[1].lastActivity);

    const toRemove = sorted.slice(0, this.conversations.size - this.maxConversations);
    toRemove.forEach(([phoneNumber]) => {
      this.conversations.delete(phoneNumber);
    });
  }

  /**
   * Zaman aşımına uğramış konuşmaları temizle
   */
  cleanupOldConversations() {
    const now = new Date();
    const toRemove = [];

    this.conversations.forEach((conversation, phoneNumber) => {
      const age = now - conversation.lastActivity;
      if (age > this.timeout) {
        toRemove.push(phoneNumber);
      }
    });

    toRemove.forEach(phoneNumber => {
      this.conversations.delete(phoneNumber);
    });

    if (toRemove.length > 0) {
      console.log(`🧹 ${toRemove.length} eski konuşma temizlendi`);
    }
  }

  /**
   * Periyodik temizlik başlat
   */
  startCleanupInterval() {
    // Her gün bir kez eski konuşmaları temizle
    setInterval(() => {
      this.cleanupOldConversations();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Müşteri daha önce görüldü mü?
   */
  isReturningCustomer(phoneNumber) {
    const conversation = this.conversations.get(phoneNumber);
    if (!conversation) return false;

    const info = conversation.customerInfo;
    return info && (info.totalReservations > 0 || conversation.messages.length > 5);
  }

  /**
   * İstatistikler
   */
  getStats() {
    return {
      totalConversations: this.conversations.size,
      maxConversations: this.maxConversations,
      returningCustomers: Array.from(this.conversations.values())
        .filter(c => c.customerInfo?.totalReservations > 0).length
    };
  }
}

module.exports = new MemoryService();
