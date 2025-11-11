require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Unipile Configuration
  unipile: {
    apiKey: process.env.UNIPILE_API_KEY,
    dsn: process.env.UNIPILE_DSN,
    accountId: process.env.UNIPILE_ACCOUNT_ID,
    apiUrl: 'https://api.unipile.com/v1'
  },

  // Anthropic Claude API
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096
  },

  // Google Calendar
  google: {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeZone: 'Europe/Istanbul'
  },

  // Email Configuration
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: `"${process.env.BUSINESS_NAME}" <${process.env.EMAIL_USER}>`
  },

  // Business Information
  business: {
    name: process.env.BUSINESS_NAME || 'ThePadelHouse',
    phone: process.env.BUSINESS_PHONE,
    email: process.env.BUSINESS_EMAIL,
    address: process.env.BUSINESS_ADDRESS || 'İstanbul, Türkiye'
  },

  // Court Configuration
  courts: [
    { id: 1, name: 'Kort 1' },
    { id: 2, name: 'Kort 2' },
    { id: 3, name: 'Kort 3' },
    { id: 4, name: 'Kort 4' }
  ],

  // Pricing (in TL)
  pricing: {
    weekdayMorning: 1200,  // 08:00 - 17:00
    weekdayEvening: 1600,  // 17:00 - 23:00
    weekend: 1600          // Tüm gün
  },

  // Business Hours
  businessHours: {
    openTime: '08:00',
    closeTime: '23:00',
    slotDuration: 60  // dakika
  },

  // Reservation Rules
  reservationRules: {
    minDuration: 60,        // minimum rezervasyon süresi (dakika)
    maxDuration: 60,        // maksimum rezervasyon süresi (dakika)
    cancellationHours: 24,  // iptal için minimum süre (saat)
    paymentMethod: 'advance' // 'advance' veya 'on-site'
  },

  // Memory Configuration
  memory: {
    maxConversations: 200,  // Maksimum hatırlanacak konuşma sayısı
    conversationTimeout: 30 * 24 * 60 * 60 * 1000 // 30 gün (milisaniye)
  }
};
