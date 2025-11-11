const express = require('express');
const config = require('./config/config');
const reservationController = require('./controllers/reservation.controller');
const unipileService = require('./services/unipile.service');
const emailService = require('./services/email.service');
const memoryService = require('./services/memory.service');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (gerekirse)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

/**
 * Health Check Endpoint
 */
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'ThePadelHouse WhatsApp Reservation System',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Health Check - Sistemin durumunu kontrol et
 */
app.get('/health', async (req, res) => {
  try {
    // WhatsApp bağlantısını kontrol et
    const whatsappStatus = await unipileService.checkAccountStatus();

    // Email bağlantısını kontrol et
    const emailStatus = await emailService.testConnection();

    // Memory istatistikleri
    const memoryStats = memoryService.getStats();

    res.json({
      status: 'healthy',
      services: {
        whatsapp: whatsappStatus.isConnected ? 'connected' : 'disconnected',
        email: emailStatus ? 'connected' : 'disconnected',
        memory: 'active'
      },
      stats: memoryStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Webhook - Unipile'dan gelen mesajları al
 */
app.post('/webhook/unipile', async (req, res) => {
  try {
    console.log('📨 Webhook tetiklendi:', JSON.stringify(req.body, null, 2));

    const event = req.body;

    // Sadece yeni mesajları işle
    if (event.type === 'MESSAGE_CREATED' && event.object) {
      const message = event.object;

      // Sadece gelen mesajları işle (giden mesajları değil)
      if (message.is_incoming) {
        const phoneNumber = message.attendees?.[0]?.identifier || message.chat?.identifier;
        const text = message.text;

        if (phoneNumber && text) {
          // Mesajı işle (async olarak, webhook hemen 200 döndürsün)
          setImmediate(async () => {
            await reservationController.handleIncomingMessage(phoneNumber, text);
          });
        }
      }
    }

    // Hemen 200 döndür
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Webhook hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manuel mesaj gönderme endpoint (test için)
 */
app.post('/api/send-message', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber ve message gerekli'
      });
    }

    const result = await unipileService.sendMessage(phoneNumber, message);

    res.json(result);

  } catch (error) {
    console.error('❌ Manuel mesaj gönderme hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Manuel mesaj simülasyonu (test için)
 */
app.post('/api/simulate-message', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber ve message gerekli'
      });
    }

    // Mesajı controller'a gönder
    const result = await reservationController.handleIncomingMessage(phoneNumber, message);

    res.json(result);

  } catch (error) {
    console.error('❌ Simülasyon hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Müşteri geçmişini görüntüle (yönetici için)
 */
app.get('/api/customer/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const customerInfo = memoryService.getCustomerInfo(phoneNumber);
    const history = memoryService.getConversationHistory(phoneNumber, 50);

    res.json({
      customerInfo,
      conversationHistory: history,
      isReturning: memoryService.isReturningCustomer(phoneNumber)
    });

  } catch (error) {
    console.error('❌ Müşteri bilgisi alma hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * İstatistikler endpoint
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = memoryService.getStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ İstatistik hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Webhook kurulum endpoint
 */
app.post('/api/setup-webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'webhookUrl gerekli (örn: https://yourdomain.com/webhook/unipile)'
      });
    }

    const result = await unipileService.setupWebhook(webhookUrl);

    res.json(result);

  } catch (error) {
    console.error('❌ Webhook kurulum hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    path: req.path
  });
});

/**
 * Error Handler
 */
app.use((err, req, res, next) => {
  console.error('❌ Sunucu hatası:', err);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: err.message
  });
});

/**
 * Sunucuyu başlat
 */
const PORT = config.port;

app.listen(PORT, () => {
  console.log('\n🎾 ========================================');
  console.log(`   ThePadelHouse Rezervasyon Sistemi`);
  console.log('   ========================================');
  console.log(`   🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`   📱 WhatsApp: Aktif`);
  console.log(`   🤖 AI Asistan: Claude ${config.anthropic.model}`);
  console.log(`   📧 Email: ${config.email.user}`);
  console.log('   ========================================\n');

  // Başlangıç kontrollerini yap
  startupChecks();
});

/**
 * Başlangıç kontrolleri
 */
async function startupChecks() {
  console.log('🔍 Başlangıç kontrolleri yapılıyor...\n');

  // WhatsApp bağlantısı
  const whatsappStatus = await unipileService.checkAccountStatus();
  if (whatsappStatus.isConnected) {
    console.log('✅ WhatsApp bağlantısı başarılı');
  } else {
    console.log('⚠️  WhatsApp bağlantısı kurulamadı');
    console.log('   Lütfen .env dosyasındaki Unipile ayarlarını kontrol edin');
  }

  // Email bağlantısı
  const emailStatus = await emailService.testConnection();
  if (emailStatus) {
    console.log('✅ Email servisi bağlantısı başarılı');
  } else {
    console.log('⚠️  Email servisi bağlantısı kurulamadı');
    console.log('   Lütfen .env dosyasındaki email ayarlarını kontrol edin');
  }

  // API key kontrolü
  if (!config.anthropic.apiKey) {
    console.log('⚠️  Anthropic API key bulunamadı');
    console.log('   Lütfen .env dosyasına ANTHROPIC_API_KEY ekleyin');
  } else {
    console.log('✅ Claude AI API key bulundu');
  }

  if (!config.google.calendarId) {
    console.log('⚠️  Google Calendar ID bulunamadı');
    console.log('   Lütfen .env dosyasına GOOGLE_CALENDAR_ID ekleyin');
  } else {
    console.log('✅ Google Calendar yapılandırıldı');
  }

  console.log('\n📊 Memory Sistemi:');
  console.log(`   Maksimum konuşma: ${config.memory.maxConversations}`);
  console.log(`   Timeout: ${config.memory.conversationTimeout / (24 * 60 * 60 * 1000)} gün`);

  console.log('\n💰 Fiyatlandırma:');
  console.log(`   Hafta içi sabah: ${config.pricing.weekdayMorning}₺`);
  console.log(`   Hafta içi akşam: ${config.pricing.weekdayEvening}₺`);
  console.log(`   Hafta sonu: ${config.pricing.weekend}₺`);

  console.log('\n✨ Sistem hazır! WhatsApp mesajları bekleniyor...\n');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM sinyali alındı, sunucu kapatılıyor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT sinyali alındı, sunucu kapatılıyor...');
  process.exit(0);
});

module.exports = app;
