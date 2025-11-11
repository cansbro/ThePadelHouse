const nodemailer = require('nodemailer');
const config = require('../config/config');

/**
 * Email gönderim servisi - Rezervasyon onayları için
 */
class EmailService {
  constructor() {
    // Gmail SMTP yapılandırması
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  /**
   * Rezervasyon onay emaili gönder
   */
  async sendReservationConfirmation(reservationDetails) {
    try {
      const {
        customerName,
        customerEmail,
        court,
        date,
        startTime,
        endTime,
        price,
        eventId
      } = reservationDetails;

      // Tarihi Türkçe formata çevir
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const mailOptions = {
        from: config.email.from,
        to: customerEmail,
        subject: `✅ Rezervasyon Onayı - ${config.business.name}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
    .detail-row { margin: 10px 0; }
    .label { font-weight: bold; color: #667eea; }
    .price { font-size: 24px; color: #764ba2; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎾 ${config.business.name}</h1>
      <p>Rezervasyon Onayı</p>
    </div>

    <div class="content">
      <p>Merhaba <strong>${customerName}</strong>,</p>

      <p>Rezervasyonunuz başarıyla oluşturuldu! Aşağıda rezervasyon detaylarınızı bulabilirsiniz:</p>

      <div class="detail-box">
        <div class="detail-row">
          <span class="label">🏟️ Kort:</span> ${court}
        </div>
        <div class="detail-row">
          <span class="label">📅 Tarih:</span> ${formattedDate}
        </div>
        <div class="detail-row">
          <span class="label">🕐 Saat:</span> ${startTime} - ${endTime}
        </div>
        <div class="detail-row">
          <span class="label">⏱️ Süre:</span> ${config.businessHours.slotDuration} dakika
        </div>
        <div class="detail-row">
          <span class="label">💰 Ücret:</span> <span class="price">${price}₺</span>
        </div>
      </div>

      <p><strong>⚠️ Önemli Bilgiler:</strong></p>
      <ul>
        <li>Lütfen rezervasyon saatinizden <strong>15 dakika önce</strong> gelerek ödemenizi yapın.</li>
        <li>İptal işlemleri için <strong>en az 24 saat öncesinden</strong> bilgi veriniz.</li>
        <li>Rezervasyon kodunuz: <code>${eventId}</code></li>
      </ul>

      <p>📍 <strong>Adres:</strong><br>${config.business.address}</p>

      <p>📞 <strong>İletişim:</strong><br>
        Telefon: ${config.business.phone}<br>
        Email: ${config.business.email}
      </p>

      <div style="text-align: center;">
        <p>Sizinle padel oynamak için sabırsızlanıyoruz! 🎾</p>
      </div>
    </div>

    <div class="footer">
      <p>Bu email ${config.business.name} WhatsApp Rezervasyon Sistemi tarafından otomatik olarak gönderilmiştir.</p>
      <p>© ${new Date().getFullYear()} ${config.business.name}. Tüm hakları saklıdır.</p>
    </div>
  </div>
</body>
</html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email gönderildi:', info.messageId);

      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ Email gönderim hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * İptal bildirimi emaili gönder
   */
  async sendCancellationEmail(cancellationDetails) {
    try {
      const {
        customerName,
        customerEmail,
        court,
        date,
        startTime
      } = cancellationDetails;

      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const mailOptions = {
        from: config.email.from,
        to: customerEmail,
        subject: `❌ Rezervasyon İptali - ${config.business.name}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #e74c3c; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #e74c3c; border-radius: 5px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎾 ${config.business.name}</h1>
      <p>Rezervasyon İptali</p>
    </div>

    <div class="content">
      <p>Merhaba <strong>${customerName}</strong>,</p>

      <p>Rezervasyonunuz başarıyla iptal edildi.</p>

      <div class="detail-box">
        <p><strong>İptal Edilen Rezervasyon:</strong></p>
        <p>🏟️ Kort: ${court}<br>
        📅 Tarih: ${formattedDate}<br>
        🕐 Saat: ${startTime}</p>
      </div>

      <p>Yeni bir rezervasyon yapmak için bize WhatsApp'tan ulaşabilirsiniz.</p>

      <p>Görüşmek üzere! 🎾</p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} ${config.business.name}</p>
    </div>
  </div>
</body>
</html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ İptal emaili gönderildi');

      return { success: true };

    } catch (error) {
      console.error('❌ İptal emaili gönderim hatası:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email bağlantısını test et
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email servisi bağlantısı başarılı');
      return true;
    } catch (error) {
      console.error('❌ Email servisi bağlantı hatası:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
