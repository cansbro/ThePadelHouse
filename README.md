# 🎾 ThePadelHouse - Multi-Platform Rezervasyon Sistemi

**WhatsApp** ve **Instagram** üzerinden otomatik padel kortu rezervasyonu alan akıllı asistan sistemi.

## 🌟 Özellikler

- 📱 **WhatsApp Entegrasyonu** - Unipile API ile WhatsApp Business
- 📷 **Instagram Entegrasyonu** - Instagram DM ile rezervasyon (YENİ!)
- 🤖 **Akıllı AI Asistan** - Claude AI ile doğal dil işleme
- 📅 **Google Calendar** - Kort müsaitlik yönetimi
- 📧 **Email Onayları** - Otomatik rezervasyon onay emaili
- 🧠 **Akıllı Hafıza** - 200+ konuşmayı hatırlayan sistem
- 🏟️ **4 Kort Yönetimi** - Eş zamanlı kort takibi
- 💰 **Dinamik Fiyatlandırma** - Saat ve güne göre otomatik fiyat
- 🔄 **Multi-Platform** - Tek sistem, çoklu platform

## 🏗️ Sistem Mimarisi

```
src/
├── index.js                          # Ana sunucu
├── config/
│   └── config.js                     # Konfigürasyon (Multi-platform)
├── services/
│   ├── unipile.service.js            # Multi-Platform API (WhatsApp + Instagram)
│   ├── claude.service.js             # AI Asistan
│   ├── calendar.service.js           # Google Calendar
│   ├── email.service.js              # Email gönderim
│   └── memory.service.js             # Konuşma hafızası
└── controllers/
    └── reservation.controller.js     # Rezervasyon mantığı (Multi-platform)
```

## 📋 Gereksinimler

### API Keys & Hesaplar

1. **Unipile Account** - WhatsApp & Instagram için
   - Hesap oluştur: https://unipile.com
   - API Key al
   - WhatsApp Business hesabını bağla
   - Instagram Business hesabını bağla (opsiyonel)

2. **Anthropic API Key** - Claude AI için
   - Hesap oluştur: https://console.anthropic.com
   - API Key oluştur

3. **Google Calendar API**
   - Google Cloud Console'da proje oluştur
   - Calendar API'yi etkinleştir
   - Service Account oluştur ve JSON key indir

4. **Gmail Account** - Email gönderimi için
   - Gmail hesabı
   - App Password oluştur (2FA gerekli)

### Sistem Gereksinimleri

- Node.js 16+
- npm veya yarn
- İnternet bağlantısı

## 🚀 Kurulum

### 1. Projeyi Klonla

```bash
git clone <repository-url>
cd ThePadelHouse
```

### 2. Bağımlılıkları Yükle

```bash
npm install
```

### 3. Environment Variables

`.env` dosyası oluştur ve aşağıdaki bilgileri doldur:

```bash
# .env dosyasını oluştur
cp .env.example .env
```

`.env` dosyasını düzenle:

```env
# Unipile WhatsApp API
UNIPILE_API_KEY=sk_xxx
UNIPILE_DSN=xxx
UNIPILE_ACCOUNT_ID=xxx

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-xxx

# Google Calendar API
GOOGLE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=xxx@group.calendar.google.com

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Business Info
BUSINESS_NAME=ThePadelHouse
BUSINESS_PHONE=+90_xxx_xxx_xxxx
BUSINESS_EMAIL=info@thepadelhouse.com
BUSINESS_ADDRESS=İstanbul, Türkiye

# Server
PORT=3000
```

### 4. Sunucuyu Başlat

#### Development (Nodemon ile)

```bash
npm run dev
```

#### Production

```bash
npm start
```

Sunucu `http://localhost:3000` adresinde çalışacak.

## 🔧 API Endpoints

### Health Check

```bash
GET /health
```

Sistemin durumunu kontrol eder.

### Webhook (Unipile)

```bash
POST /webhook/unipile
```

Unipile'dan gelen mesajları alır.

### Manuel Mesaj Gönder (Test)

```bash
POST /api/send-message
Content-Type: application/json

{
  "phoneNumber": "+905551234567",
  "message": "Test mesajı"
}
```

### Mesaj Simülasyonu (Test)

```bash
POST /api/simulate-message
Content-Type: application/json

{
  "phoneNumber": "+905551234567",
  "message": "Yarın saat 18:00'da kort var mı?"
}
```

### Müşteri Bilgileri

```bash
GET /api/customer/:phoneNumber
```

### İstatistikler

```bash
GET /api/stats
```

### Webhook Kurulumu

```bash
POST /api/setup-webhook
Content-Type: application/json

{
  "webhookUrl": "https://yourdomain.com/webhook/unipile"
}
```

## 📱 Kullanım

### Müşteri Tarafı (WhatsApp)

Müşteriler WhatsApp'tan şu şekilde mesaj gönderebilir:

```
Merhaba, yarın saat 18:00'da kort var mı?

Cumartesi günü 16:00 için Kort 2'yi rezerve etmek istiyorum.

İsmim: Ahmet Yılmaz
Email: ahmet@example.com
```

### Sistem Yanıtları

```
Merhaba! ThePadelHouse'a hoş geldiniz 🎾

Yarın 18:00 için müsait kortlar:
- Kort 1 ✅
- Kort 3 ✅

Fiyat: 1600₺/saat

Hangi kortu tercih edersiniz?
```

## 🔄 Workflow

1. **Müşteri mesaj gönderir** → WhatsApp
2. **Unipile webhook tetiklenir** → Sunucuya mesaj gelir
3. **AI mesajı analiz eder** → Claude API
4. **Kort müsaitliği kontrol edilir** → Google Calendar
5. **Yanıt gönderilir** → WhatsApp
6. **Rezervasyon onaylanır** → Calendar + Email

## 🎯 Özellikler

### 1. Akıllı Hafıza
- Son 200 konuşmayı hatırlar
- Müşteri bilgilerini saklar (isim, email, geçmiş rezervasyonlar)
- Dönüşen müşterileri tanır

### 2. Dinamik Fiyatlandırma
- Hafta içi sabah (08:00-17:00): 1200₺
- Hafta içi akşam (17:00-23:00): 1600₺
- Hafta sonu (tüm gün): 1600₺

### 3. Rezervasyon Kuralları
- Minimum/Maksimum süre: 60 dakika
- İptal: 24 saat öncesinden
- Ödeme: Peşin

### 4. Email Onayları
- Profesyonel HTML template
- QR kod (opsiyonel)
- İptal linkleri

## 🚢 Deployment (Railway)

### Railway'e Deploy

1. Railway hesabı oluştur: https://railway.app

2. Yeni proje oluştur ve GitHub reposu bağla

3. Environment variables ekle (`.env` içindekiler)

4. Deploy et

5. Public URL al

6. Webhook'u ayarla:

```bash
curl -X POST https://your-app.railway.app/api/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-app.railway.app/webhook/unipile"}'
```

## 🧪 Test

### Lokal Test

```bash
# Test mesajı simüle et
curl -X POST http://localhost:3000/api/simulate-message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+905551234567",
    "message": "Merhaba, yarın saat 18:00 da kort var mı?"
  }'
```

### Health Check

```bash
curl http://localhost:3000/health
```

## 📊 Monitoring

### Loglar

Sunucu logları terminalde görünür:

```
📱 Gelen mesaj: +905551234567 - "Yarın saat 18:00'da kort var mı?"
✅ WhatsApp mesajı gönderildi: +905551234567
✅ Email gönderildi: messageId
```

### İstatistikler

```bash
curl http://localhost:3000/api/stats
```

## 🛠️ Troubleshooting

### WhatsApp bağlanamıyor

- `.env` dosyasındaki `UNIPILE_API_KEY` ve `UNIPILE_ACCOUNT_ID` doğru mu?
- Unipile hesabında WhatsApp bağlı mı?

### Email gönderilmiyor

- Gmail'de App Password oluşturuldu mu?
- 2FA aktif mi?

### Google Calendar çalışmıyor

- Service Account oluşturuldu mu?
- Private key doğru mu?
- Calendar ID doğru mu?
- Calendar, service account ile paylaşıldı mı?

### AI yanıt vermiyor

- Anthropic API Key doğru mu?
- API limitine ulaşılmadı mı?

## 📝 Konfigürasyon

Tüm ayarlar `src/config/config.js` dosyasında:

- Kort sayısı ve isimleri
- Fiyatlandırma
- Çalışma saatleri
- Rezervasyon kuralları
- Memory limitleri

## 🔐 Güvenlik

- API keyleri `.env` dosyasında saklanır
- `.env` dosyası `.gitignore`'da
- Webhook'lar için şifreleme önerilir (production)
- Rate limiting eklenebilir

## 📞 Destek

Sorularınız için:
- Email: support@thepadelhouse.com
- WhatsApp: +90 xxx xxx xxxx

## 📄 Lisans

MIT License

## 🙏 Katkıda Bulunanlar

- Claude AI - Asistan sistemi
- Unipile - WhatsApp API
- Google Calendar - Rezervasyon yönetimi

---

**ThePadelHouse** ile padel oynamanın keyfini çıkarın! 🎾
