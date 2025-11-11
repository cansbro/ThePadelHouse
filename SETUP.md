# 🛠️ ThePadelHouse - Kurulum Rehberi

Bu rehber, sistemi sıfırdan kurmak için tüm adımları içerir. Teknik bilginiz olmasa bile takip edebilirsiniz!

## 📚 İçindekiler

1. [Gerekli Hesapları Oluştur](#1-gerekli-hesapları-oluştur)
2. [API Keylerini Al](#2-api-keylerini-al)
3. [Projeyi Kur](#3-projeyi-kur)
4. [Test Et](#4-test-et)
5. [Deploy Et](#5-deploy-et)

---

## 1. Gerekli Hesapları Oluştur

### A. Unipile Hesabı (WhatsApp için)

1. **Hesap Oluştur**
   - Git: https://unipile.com
   - Sign Up tıkla
   - Email ve şifre ile hesap oluştur

2. **WhatsApp Bağla**
   - Dashboard'a gir
   - "Connect Account" > "WhatsApp Business"
   - QR kodu telefonunla tara
   - WhatsApp Business hesabını bağla

3. **API Key Al**
   - Settings > API Keys
   - "Create API Key" tıkla
   - API Key'i kaydet (örn: `sk_xxx`)

4. **Account ID Al**
   - Accounts sayfasına git
   - WhatsApp hesabını seç
   - Account ID'yi kopyala (örn: `acc_xxx`)

5. **DSN Al**
   - Settings > DSN
   - DSN'i kopyala

### B. Anthropic Hesabı (Claude AI için)

1. **Hesap Oluştur**
   - Git: https://console.anthropic.com
   - Sign Up tıkla
   - Email ile kayıt ol

2. **API Key Oluştur**
   - Console'a gir
   - API Keys > "Create Key"
   - Key'i kaydet (örn: `sk-ant-xxx`)

3. **Kredi Ekle**
   - Billing > Add Credits
   - En az $10 ekle (test için yeterli)

### C. Google Cloud Platform (Calendar için)

1. **Google Cloud Console**
   - Git: https://console.cloud.google.com
   - Yeni proje oluştur: "ThePadelHouse"

2. **Calendar API Etkinleştir**
   - APIs & Services > Library
   - "Google Calendar API" ara
   - Enable tıkla

3. **Service Account Oluştur**
   - IAM & Admin > Service Accounts
   - "Create Service Account"
   - İsim: `thepadelhouse-calendar`
   - Role: `Editor` veya `Calendar Editor`
   - Create Key > JSON
   - JSON dosyasını indir ve sakla

4. **Google Calendar Oluştur**
   - Google Calendar aç: https://calendar.google.com
   - Sol tarafta "+" > "Create new calendar"
   - İsim: `ThePadelHouse Reservations`
   - Time zone: `Europe/Istanbul`
   - Create Calendar

5. **Calendar'ı Paylaş**
   - Yeni oluşturduğun calendar'a sağ tık
   - Settings and sharing
   - Share with specific people
   - Service Account email'ini ekle (JSON dosyasında `client_email`)
   - Permission: `Make changes to events`

6. **Calendar ID Al**
   - Calendar Settings'te
   - "Integrate calendar" bölümünden Calendar ID'yi kopyala
   - (örn: `xxx@group.calendar.google.com`)

### D. Gmail (Email gönderimi için)

1. **2-Factor Authentication Aktif Et**
   - Gmail > Ayarlar > Güvenlik
   - 2-Step Verification'ı aç

2. **App Password Oluştur**
   - Google Account > Security
   - "App passwords" ara
   - App seç: "Mail"
   - Device seç: "Other" > "ThePadelHouse"
   - Generate
   - 16 haneli şifreyi kaydet (örn: `abcd efgh ijkl mnop`)

---

## 2. API Keylerini Al

Şimdi elinde olması gerekenler:

```
✅ Unipile API Key (sk_xxx)
✅ Unipile DSN
✅ Unipile Account ID (acc_xxx)
✅ Anthropic API Key (sk-ant-xxx)
✅ Google Service Account JSON dosyası
✅ Google Calendar ID (xxx@group.calendar.google.com)
✅ Gmail App Password (16 haneli)
```

---

## 3. Projeyi Kur

### A. Node.js Kur (Yoksa)

1. Git: https://nodejs.org
2. LTS versiyonu indir
3. Kur (Next > Next > Finish)
4. Terminal aç ve kontrol et:

```bash
node --version
# v18.x.x görmeli
```

### B. Projeyi İndir

```bash
# Git clone (repo varsa)
git clone <repository-url>
cd ThePadelHouse

# VEYA zip indir ve extract et
```

### C. Bağımlılıkları Yükle

```bash
npm install
```

### D. .env Dosyası Oluştur

1. `.env.example` dosyasını kopyala:

```bash
cp .env.example .env
```

2. `.env` dosyasını aç ve doldur:

```env
# Unipile
UNIPILE_API_KEY=sk_BURAYA_UNIPILE_API_KEY_YAZ
UNIPILE_DSN=BURAYA_DSN_YAZ
UNIPILE_ACCOUNT_ID=acc_BURAYA_ACCOUNT_ID_YAZ

# Anthropic
ANTHROPIC_API_KEY=sk-ant-BURAYA_ANTHROPIC_KEY_YAZ

# Google Calendar
GOOGLE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nBURAYA_PRIVATE_KEY_GELECEK\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=xxx@group.calendar.google.com

# Gmail
EMAIL_USER=senin_gmail_adresin@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop

# Business (ThePadelHouse bilgileri)
BUSINESS_NAME=ThePadelHouse
BUSINESS_PHONE=+90_xxx_xxx_xxxx
BUSINESS_EMAIL=info@thepadelhouse.com
BUSINESS_ADDRESS=İstanbul, Türkiye

# Server
PORT=3000
```

**Google Private Key için:**

JSON dosyasını aç, `private_key` alanını kopyala. Şu şekilde olacak:

```
"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----\n"
```

Tüm string'i (tırnak işaretleriyle birlikte) kopyala.

### E. Test Et

```bash
npm run dev
```

Terminal'de şunu göreceksin:

```
🎾 ========================================
   ThePadelHouse Rezervasyon Sistemi
   ========================================
   🚀 Sunucu çalışıyor: http://localhost:3000
   ...
✅ WhatsApp bağlantısı başarılı
✅ Email servisi bağlantısı başarılı
✅ Claude AI API key bulundu
✅ Google Calendar yapılandırıldı
```

---

## 4. Test Et

### Test 1: Health Check

Yeni terminal aç:

```bash
curl http://localhost:3000/health
```

Şöyle bir yanıt göreceksin:

```json
{
  "status": "healthy",
  "services": {
    "whatsapp": "connected",
    "email": "connected",
    "memory": "active"
  }
}
```

### Test 2: Mesaj Simülasyonu

```bash
curl -X POST http://localhost:3000/api/simulate-message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+905551234567",
    "message": "Merhaba, yarın saat 18:00 da kort var mı?"
  }'
```

Sunucu loglarında AI yanıtını göreceksin.

### Test 3: WhatsApp'tan Gerçek Mesaj

Kendi WhatsApp numaranla test et:

1. WhatsApp'ı aç
2. Unipile'a bağladığın numaraya mesaj gönder
3. "Merhaba" yaz
4. AI yanıt vermeli!

---

## 5. Deploy Et (Railway)

### Railway'e Deploy

1. **Railway Hesabı Oluştur**
   - Git: https://railway.app
   - GitHub ile giriş yap

2. **Yeni Proje Oluştur**
   - "New Project"
   - "Deploy from GitHub repo"
   - ThePadelHouse reposunu seç

3. **Environment Variables Ekle**
   - Settings > Variables
   - `.env` dosyasındaki tüm değişkenleri ekle
   - Tek tek veya toplu olarak (Raw Editor)

4. **Deploy**
   - Otomatik deploy olacak
   - 2-3 dakika bekle

5. **Public URL Al**
   - Settings > Domains
   - "Generate Domain"
   - URL'i kopyala (örn: `https://thepadelhouse-production.up.railway.app`)

6. **Webhook'u Ayarla**

```bash
curl -X POST https://BURAYA_RAILWAY_URL_YAZ/api/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://BURAYA_RAILWAY_URL_YAZ/webhook/unipile"}'
```

### Test Et

Railway URL'ine WhatsApp'tan mesaj gönder, çalışmalı!

---

## 🎉 Tamamlandı!

Artık sisteminiz çalışıyor! Müşteriler WhatsApp'tan rezervasyon yapabilir.

### Sonraki Adımlar

1. **ThePadelHouse Numarasını Bağla**
   - Unipile'da kendi numaranı çıkar
   - ThePadelHouse'ın WhatsApp Business numarasını bağla

2. **Google Calendar'ı Özelleştir**
   - Renkleri ayarla
   - Hatırlatmaları düzenle

3. **Email Template'i Özelleştir**
   - Logo ekle (opsiyonel)
   - Renkleri değiştir

4. **Fiyatları Güncelle**
   - `src/config/config.js` dosyasında `pricing` bölümü

---

## 🆘 Sorun mu Yaşıyorsun?

### WhatsApp bağlanamıyor

- Unipile dashboard'da hesap "connected" gösteriyor mu?
- API key doğru mu?
- Account ID doğru mu?

### Email gönderilmiyor

- Gmail'de 2FA açık mı?
- App password doğru mu?
- Gmail "Less secure apps" engellememiş mi?

### Calendar çalışmıyor

- Service Account JSON doğru mu?
- Calendar, service account ile paylaşılmış mı?
- Calendar ID doğru mu?

### AI yanıt vermiyor

- Anthropic API key doğru mu?
- Kredi var mı?
- API limit'e ulaşılmadı mı?

---

## 📞 Yardım

Sorun yaşarsan:
1. Sunucu loglarını kontrol et
2. `/health` endpoint'ini kontrol et
3. `.env` dosyasını tekrar kontrol et

**Başarılar!** 🎾
