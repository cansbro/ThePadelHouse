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
    service: 'ThePadelHouse Multi-Platform Reservation System',
    platforms: ['WhatsApp', 'Instagram'],
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Health Check - Sistemin durumunu kontrol et
 */
app.get('/health', async (req, res) => {
  try {
    // Tüm platformların bağlantısını kontrol et
    const platformStatuses = await unipileService.checkAllAccountsStatus();

    // Email bağlantısını kontrol et
    const emailStatus = await emailService.testConnection();

    // Memory istatistikleri
    const memoryStats = memoryService.getStats();

    // Platform istatistikleri
    const platformStats = await reservationController.getPlatformStats();

    res.json({
      status: 'healthy',
      services: {
        whatsapp: platformStatuses.whatsapp?.isConnected ? 'connected' : 'disconnected',
        instagram: platformStatuses.instagram?.isConnected ? 'connected' : 'disconnected',
        email: emailStatus ? 'connected' : 'disconnected',
        memory: 'active'
      },
      stats: {
        ...memoryStats,
        platforms: platformStats
      },
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
 * Webhook - Unipile'dan gelen mesajları al (WhatsApp + Instagram)
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
        // Platform'u tespit et
        const platform = unipileService.detectPlatform(message);

        if (!platform) {
          console.warn('⚠️  Platform tespit edilemedi:', message.account_id);
          return res.status(200).json({ received: true, warning: 'Unknown platform' });
        }

        // Identifier'ı al
        const identifier = unipileService.getIdentifierFromMessage(message, platform);
        const text = message.text;

        if (identifier && text) {
          // Mesajı işle (async olarak, webhook hemen 200 döndürsün)
          setImmediate(async () => {
            await reservationController.handleIncomingMessage(platform, identifier, text);
          });
        } else {
          console.warn('⚠️  Identifier veya text bulunamadı');
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
    const { platform, identifier, message } = req.body;

    if (!platform || !identifier || !message) {
      return res.status(400).json({
        success: false,
        error: 'platform, identifier ve message gerekli'
      });
    }

    if (!['whatsapp', 'instagram'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'platform "whatsapp" veya "instagram" olmalı'
      });
    }

    const result = await unipileService.sendMessage(platform, identifier, message);

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
    const { platform, identifier, message } = req.body;

    if (!platform || !identifier || !message) {
      return res.status(400).json({
        success: false,
        error: 'platform, identifier ve message gerekli'
      });
    }

    if (!['whatsapp', 'instagram'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'platform "whatsapp" veya "instagram" olmalı'
      });
    }

    // Mesajı controller'a gönder
    const result = await reservationController.handleIncomingMessage(platform, identifier, message);

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
app.get('/api/customer/:platform/:identifier', (req, res) => {
  try {
    const { platform, identifier } = req.params;
    const memoryKey = `${platform}:${identifier}`;

    const customerInfo = memoryService.getCustomerInfo(memoryKey);
    const history = memoryService.getConversationHistory(memoryKey, 50);

    res.json({
      platform,
      identifier,
      customerInfo,
      conversationHistory: history,
      isReturning: memoryService.isReturningCustomer(memoryKey)
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
app.get('/api/stats', async (req, res) => {
  try {
    const stats = memoryService.getStats();
    const platformStats = await reservationController.getPlatformStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        platforms: platformStats
      },
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
 * Platform istatistikleri
 */
app.get('/api/stats/platforms', async (req, res) => {
  try {
    const platformStats = await reservationController.getPlatformStats();

    res.json({
      success: true,
      platforms: platformStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Platform istatistik hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Webhook kurulum endpoint (tüm platformlar için)
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
 * Günlük özet gönder
 */
app.post('/api/send-daily-summary', async (req, res) => {
  try {
    const { platform, identifier } = req.body;

    if (!platform || !identifier) {
      return res.status(400).json({
        success: false,
        error: 'platform ve identifier gerekli'
      });
    }

    await reservationController.sendDailySummary(platform, identifier);

    res.json({
      success: true,
      message: 'Günlük özet gönderildi'
    });

  } catch (error) {
    console.error('❌ Günlük özet hatası:', error);
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
  console.log('   Multi-Platform (WhatsApp + Instagram)');
  console.log('   ========================================');
  console.log(`   🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`   📱 WhatsApp: ${config.unipile.whatsapp.enabled ? 'Aktif' : 'Pasif'}`);
  console.log(`   📷 Instagram: ${config.unipile.instagram.enabled ? 'Aktif' : 'Pasif'}`);
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

  // Platform bağlantıları
  const platformStatuses = await unipileService.checkAllAccountsStatus();

  if (platformStatuses.whatsapp) {
    if (platformStatuses.whatsapp.isConnected) {
      console.log('✅ WhatsApp bağlantısı başarılı');
    } else {
      console.log('⚠️  WhatsApp bağlantısı kurulamadı');
      console.log('   Lütfen .env dosyasındaki UNIPILE_WHATSAPP_ACCOUNT_ID ayarını kontrol edin');
    }
  }

  if (platformStatuses.instagram) {
    if (platformStatuses.instagram.isConnected) {
      console.log('✅ Instagram bağlantısı başarılı');
    } else {
      console.log('⚠️  Instagram bağlantısı kurulamadı');
      console.log('   Lütfen .env dosyasındaki UNIPILE_INSTAGRAM_ACCOUNT_ID ayarını kontrol edin');
    }
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

  console.log('\n🏟️  Kortlar:');
  config.courts.forEach(court => {
    console.log(`   - ${court.name}`);
  });

  console.log('\n✨ Sistem hazır! Mesajlar bekleniyor...\n');
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
