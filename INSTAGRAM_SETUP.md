# 📷 Instagram Entegrasyonu - Kurulum Rehberi

Bu rehber, ThePadelHouse rezervasyon sistemine Instagram desteği ekleme adımlarını içerir.

## 🎯 Instagram ile Neler Yapılabilir?

WhatsApp'taki tüm özellikler Instagram'da da çalışır:
- ✅ Instagram DM üzerinden rezervasyon alma
- ✅ Müşterilerle doğal dil ile konuşma
- ✅ Kort müsaitliği sorgulama
- ✅ Otomatik rezervasyon oluşturma
- ✅ Email onay gönderimi
- ✅ Müşteri hafızası (kim ne zaman rezervasyon yaptı)

## 📚 Adım Adım Kurulum

### 1. Unipile'da Instagram Hesabını Bağla

1. **Unipile Dashboard'a Gir**
   - https://app.unipile.com
   - Giriş yap

2. **Instagram Hesabını Bağla**
   - "Connect Account" butonu
   - "Instagram" seçeneği
   - ThePadelHouse Instagram Business hesabını bağla
   - İzinleri onayla

3. **Account ID'yi Al**
   - Bağlandıktan sonra "Accounts" sayfasına git
   - Instagram hesabını seç
   - Account ID'yi kopyala (örn: `acc_instagram_xxx`)

### 2. .env Dosyasını Güncelle

`.env` dosyasını aç ve Instagram ayarlarını ekle:

```env
# Instagram Account
UNIPILE_INSTAGRAM_ACCOUNT_ID=acc_instagram_xxx_buraya_yaz
UNIPILE_INSTAGRAM_ENABLED=true
```

### 3. Sunucuyu Yeniden Başlat

```bash
# Development
npm run dev

# Production
npm start
```

Terminal'de şunu görmelisin:

```
✅ Instagram bağlantısı başarılı
```

### 4. Webhook'u Ayarla (Deploy sonrası)

Railway veya başka bir platformda deploy ettikten sonra:

```bash
curl -X POST https://YOUR_DOMAIN.com/api/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://YOUR_DOMAIN.com/webhook/unipile"}'
```

Bu komut hem WhatsApp hem Instagram için webhook kurar.

## 🧪 Test Et

### Test 1: Health Check

```bash
curl https://YOUR_DOMAIN.com/health
```

Yanıt:

```json
{
  "status": "healthy",
  "services": {
    "whatsapp": "connected",
    "instagram": "connected",
    "email": "connected"
  }
}
```

### Test 2: Manuel Mesaj Gönder

```bash
curl -X POST https://YOUR_DOMAIN.com/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "identifier": "test_username",
    "message": "Merhaba! Test mesajı"
  }'
```

### Test 3: Instagram'dan Gerçek Mesaj

1. ThePadelHouse Instagram sayfasını aç
2. Mesaj gönder: "Merhaba, yarın saat 18:00'da kort var mı?"
3. AI yanıt vermeli!

## 📊 İstatistikler

Platform bazlı istatistikleri görmek için:

```bash
curl https://YOUR_DOMAIN.com/api/stats/platforms
```

Yanıt:

```json
{
  "success": true,
  "platforms": {
    "whatsapp": 45,
    "instagram": 23,
    "total": 68
  }
}
```

## 🔄 WhatsApp ve Instagram Farkları

| Özellik | WhatsApp | Instagram |
|---------|----------|-----------|
| Identifier | Telefon numarası (+905551234567) | Username (@username) |
| Mesaj Formatı | Aynı | Aynı |
| AI Yanıtları | Aynı | Aynı |
| Rezervasyon | Aynı | Aynı |
| Email Onayı | Aynı | Aynı |
| Hafıza | Aynı | Aynı |

## 💡 Kullanım Örnekleri

### Instagram'dan Rezervasyon

**Müşteri:**
```
Merhaba, bu cumartesi saat 16:00'da kort var mı?
```

**AI Yanıtı:**
```
Merhaba! ThePadelHouse'a hoş geldiniz 🎾

Cumartesi 16:00 için müsait kortlar:
- Kort 1 ✅
- Kort 3 ✅

Fiyat: 1600₺/saat

Hangi kortu tercih edersiniz?
```

**Müşteri:**
```
Kort 1'i istiyorum.
İsmim: Ayşe Demir
Email: ayse@example.com
```

**AI Yanıtı:**
```
Harika! Rezervasyonunuz oluşturuldu 🎉

📍 Kort 1
📅 Cumartesi, 15 Kasım 2025
🕐 16:00 - 17:00
💰 1600₺

Onay emaili ayse@example.com adresinize gönderildi ✅

Görüşmek üzere! 🎾
```

## 🛠️ Sorun Giderme

### Instagram bağlanamıyor

**Çözüm 1: Account ID kontrol**
- Unipile dashboard'dan Account ID'yi kopyala
- `.env` dosyasına doğru yapıştır
- Sunucuyu yeniden başlat

**Çözüm 2: Instagram Business hesap**
- Instagram hesabının Business veya Creator hesabı olması gerekir
- Normal kişisel hesaplar çalışmaz

**Çözüm 3: İzinler**
- Unipile'a verdiğin izinleri kontrol et
- Mesajlaşma izni olmalı

### Mesajlar gelmiyor

**Çözüm 1: Webhook kontrolü**
```bash
curl -X POST https://YOUR_DOMAIN.com/api/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://YOUR_DOMAIN.com/webhook/unipile"}'
```

**Çözüm 2: Logs kontrolü**
- Railway/Heroku loglarını kontrol et
- Webhook tetikleniyor mu?

**Çözüm 3: Account enabled kontrolü**
`.env` dosyasında:
```env
UNIPILE_INSTAGRAM_ENABLED=true
```

### Email gönderilmiyor (Instagram'dan)

Email göndermek için müşterinin email adresini vermesi gerekir. AI otomatik olarak sorar:

```
Harika! Rezervasyonunuzu oluşturmak için email adresinizi alabilir miyim?
```

## 🎨 Özelleştirme

### Platform-Specific Mesajlar

İsterseniz Instagram için özel mesajlar kullanabilirsiniz:

`src/services/claude.service.js` dosyasında:

```javascript
// Platform'a göre hoş geldin mesajı
if (platform === 'instagram') {
  return `Hey! 👋 ThePadelHouse Instagram'a hoş geldin 🎾\n\nPadel kortu rezervasyonu için size yardımcı olabilirim!`;
}
```

### Görsel/Emoji Kullanımı

Instagram'da daha fazla emoji kullanabilirsiniz:

```javascript
// Instagram için daha renkli yanıtlar
const platformEmojis = {
  whatsapp: '📱',
  instagram: '📷✨🎾'
};
```

## 🚀 Gelişmiş Özellikler

### Story/Post'tan Rezervasyon

Instagram Story veya Post'larınıza "DM'den rezervasyon yapın" diye ekleyin.
Müşteriler DM gönderdiğinde sistem otomatik devreye girer.

### Hızlı Yanıtlar

Instagram'da hızlı yanıt butonları ekleyebilirsiniz:
- "Kort Durumu"
- "Fiyatlar"
- "Rezervasyon Yap"

### Otomatik Karşılama

İlk mesajı gönderen herkese otomatik hoş geldin mesajı:

```javascript
if (isFirstMessage) {
  await unipileService.sendMessage('instagram', username,
    'Merhaba! ThePadelHouse\'a hoş geldiniz 🎾 Size nasıl yardımcı olabilirim?'
  );
}
```

## 📱 Müşteri Deneyimi

Instagram'dan rezervasyon yapan müşteriler:

1. **DM Gönderir** → "Yarın kort var mı?"
2. **Anında Yanıt** → AI kort durumunu kontrol eder
3. **Bilgi Toplar** → İsim, email, tercihler
4. **Rezervasyon Oluşturur** → Google Calendar + Email
5. **Onay Alır** → Email + Instagram DM

Tüm süreç otomatik ve hızlı!

## 🎯 İpuçları

1. **Profil Açıklaması:** Instagram profil açıklamanıza "DM'den 24/7 rezervasyon" ekleyin
2. **Story Highlight:** "Rezervasyon" highlight'ı oluşturun
3. **Otomatik Yanıt:** Çalışma saatleri dışında da yanıt verir
4. **Çoklu Dil:** İsterseniz İngilizce desteği de ekleyebilirsiniz

## 🆘 Destek

Sorun yaşarsan:
1. `/health` endpoint'ini kontrol et
2. Railway/Heroku loglarına bak
3. Unipile dashboard'u kontrol et
4. `.env` dosyasını tekrar gözden geçir

---

**Başarılar!** 📷🎾

ThePadelHouse artık hem WhatsApp hem Instagram'dan rezervasyon alıyor! 🚀
