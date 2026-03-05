// backend/services/email.service.js
const nodemailer = require('nodemailer');
const momentTz = require('moment-timezone');

const TIMEZONE = 'Asia/Kolkata';

// Calculate age helper
const calcAge = (dob) => {
  if (!dob) return null;
  return momentTz().tz(TIMEZONE).diff(momentTz(dob).tz(TIMEZONE), 'years');
};

// ✅ UPDATED: Create transporter with optimized settings
let transporter = null;

const createTransporter = () => {
  if (transporter) {
    return transporter; // Reuse existing connection
  }

  transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // ✅ Add these optimizations
    pool: true,              // Use connection pooling
    maxConnections: 5,       // Max 5 concurrent connections
    maxMessages: 10,         // Send 10 messages per connection
    rateDelta: 1000,         // 1 second between messages
    rateLimit: 5,            // Max 5 messages per rateDelta
    connectionTimeout: 10000, // 10 second connection timeout
    greetingTimeout: 5000,    // 5 second greeting timeout
    socketTimeout: 15000,     // 15 second socket timeout
  });

  // Handle errors
  transporter.on('error', (error) => {
    console.error('📧 Transporter error:', error);
    transporter = null; // Reset on error
  });

  return transporter;
};

/**
 * ✅ UPDATED: Send birthday wish email with timeout handling
 */
const sendBirthdayEmail = async (believer) => {
  if (!believer.email) {
    console.log(`No email for ${believer.fullName}`);
    return;
  }

  const trans = createTransporter();
  const age = calcAge(believer.dob);
  const name = believer.fullName;
  const tamilName = believer.tamilName || believer.fullName;

  const mailOptions = {
    from: `${process.env.CHURCH_NAME} <${process.env.EMAIL_USER}>`,
    to: believer.email,
    subject: `🎂 Happy Birthday ${name}! / பிறந்தநாள் வாழ்த்துக்கள் ${tamilName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; margin: 0; }
          .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { color: #8B0000; font-size: 28px; font-weight: bold; margin-bottom: 15px; text-align: center; }
          .tamil-header { font-family: 'Latha', 'Tamil', 'Noto Sans Tamil', Arial, sans-serif; font-size: 20px; color: #8B0000; margin-bottom: 20px; text-align: center; font-weight: bold; }
          .message { font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px; }
          .tamil-text { font-family: 'Latha', 'Tamil', 'Noto Sans Tamil', Arial, sans-serif; font-size: 15px; line-height: 1.8; color: #333; }
          .verse { background: #FFF9E6; padding: 15px; border-left: 4px solid #8B0000; margin: 20px 0; font-style: italic; }
          .verse-tamil { background: #FFF0F0; padding: 15px; border-left: 4px solid #8B0000; margin: 20px 0; font-family: 'Latha', 'Tamil', 'Noto Sans Tamil', Arial, sans-serif; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">🎉 Happy Birthday! 🎉</div>
          <div class="tamil-header">🎂 பிறந்தநாள் வாழ்த்துக்கள்! 🎂</div>
          
          <div class="message">
            <p>Dear <strong>${name}</strong>,</p>
            <p>On this special day, we celebrate ${age ? `${age} wonderful years` : 'another blessed year'} of your life!</p>
            
            <div class="verse">
              "For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, 
              plans to give you hope and a future."<br>
              <strong>- Jeremiah 29:11</strong>
            </div>
            
            <p>May God's blessings be upon you today and always.</p>
          </div>
          
          <div class="tamil-text">
            <p>அன்பிற்குரிய <strong>${tamilName}</strong>,</p>
            <p>இந்த சிறப்பு நாளில், ${age ? `உங்கள் ${age} வருடங்களை` : 'உங்கள் வாழ்க்கையின் மற்றொரு ஆசீர்வதமான வருடத்தை'} நாங்கள் கொண்டாடுகிறோம்!</p>
            
            <div class="verse-tamil">
              "நான் உங்களுக்காகக் கொண்டிருக்கும் நினைவுகள் எனக்குத் தெரியும், அவை தீமைக்கல்ல, சமாதானத்துக்கானவைகளே."<br>
              <strong>- எரேமியா 29:11</strong>
            </div>
            
            <p>இன்றும் எப்போதும் தேவனுடைய ஆசீர்வாதங்கள் உங்கள் மீது இருப்பதாக.</p>
          </div>
          
          <div class="message" style="margin-top: 20px;">
            <p>With love and prayers,<br>
            <span class="tamil-text">அன்புடனும் ஜெபங்களுடனும்,</span></p>
            <p><strong>${process.env.CHURCH_NAME}</strong><br>
            <strong class="tamil-text">${process.env.CHURCH_NAME_TAMIL || ''}</strong></p>
          </div>
          
          <div class="footer">
            <p>${process.env.CHURCH_ADDRESS || ''}</p>
            <p>${process.env.CHURCH_PHONE || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  // ✅ Add timeout handling
  try {
    const info = await Promise.race([
      trans.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout after 15 seconds')), 15000)
      )
    ]);
    console.log(`✅ Birthday email sent to ${believer.fullName} (${believer.email})`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send birthday email to ${believer.fullName}:`, error.message);
    throw error;
  }
};

/**
 * ✅ UPDATED: Send anniversary wish email with timeout handling
 */
const sendAnniversaryEmail = async (believer) => {
  if (!believer.email) {
    console.log(`No email for ${believer.fullName}`);
    return;
  }

  const trans = createTransporter();
  
  const yearsMarried = believer.weddingDate
    ? new Date().getFullYear() - new Date(believer.weddingDate).getFullYear()
    : null;

  const spouseName = believer.spouseId?.fullName || believer.spouseName;
  const tamilSpouseName = believer.spouseId?.tamilName || believer.spouseId?.fullName || believer.spouseName;
  
  const engCouple = spouseName ? `${believer.fullName} & ${spouseName}` : believer.fullName;
  const tamilCouple = tamilSpouseName 
    ? `${believer.tamilName || believer.fullName} & ${tamilSpouseName}` 
    : (believer.tamilName || believer.fullName);

  const mailOptions = {
    from: `${process.env.CHURCH_NAME} <${process.env.EMAIL_USER}>`,
    to: believer.email,
    subject: `💑 Happy Anniversary ${engCouple}! / திருமண நாள் வாழ்த்துக்கள்!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; margin: 0; }
          .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { color: #8B0000; font-size: 28px; font-weight: bold; margin-bottom: 15px; text-align: center; }
          .tamil-header { font-family: 'Latha', 'Tamil', 'Noto Sans Tamil', Arial, sans-serif; font-size: 20px; color: #8B0000; margin-bottom: 20px; text-align: center; font-weight: bold; }
          .message { font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px; }
          .tamil-text { font-family: 'Latha', 'Tamil', 'Noto Sans Tamil', Arial, sans-serif; font-size: 15px; line-height: 1.8; color: #333; }
          .verse { background: #FFF0F0; padding: 15px; border-left: 4px solid #8B0000; margin: 20px 0; font-style: italic; }
          .verse-tamil { background: #FFF9E6; padding: 15px; border-left: 4px solid #8B0000; margin: 20px 0; font-family: 'Latha', 'Tamil', 'Noto Sans Tamil', Arial, sans-serif; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">💝 Happy Anniversary! 💝</div>
          <div class="tamil-header">💑 திருமண நாள் வாழ்த்துக்கள்! 💑</div>
          
          <div class="message">
            <p>Dear <strong>${engCouple}</strong>,</p>
            <p>Congratulations on ${yearsMarried ? `${yearsMarried} beautiful years` : 'another blessed year'} of marriage!</p>
            
            <div class="verse">
              "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. 
              It always protects, always trusts, always hopes, always perseveres."<br>
              <strong>- 1 Corinthians 13:4,7</strong>
            </div>
            
            <p>May God continue to bless your union and fill your home with love, joy, and peace.</p>
          </div>
          
          <div class="tamil-text">
            <p>அன்பிற்குரிய <strong>${tamilCouple}</strong>,</p>
            <p>${yearsMarried ? `${yearsMarried} அழகான வருடங்களின்` : 'மற்றொரு ஆசீர்வதமான வருடத்தின்'} திருமண வாழ்க்கைக்கு வாழ்த்துக்கள்!</p>
            
            <div class="verse-tamil">
              "அன்பு நீடிய சாந்தமும் தயவுமுள்ளது."<br>
              <strong>- 1 கொரிந்தியர் 13:4,7</strong>
            </div>
            
            <p>தேவன் உங்கள் ஒன்றிப்பை தொடர்ந்து ஆசீர்வதிப்பாராக.</p>
          </div>
          
          <div class="message" style="margin-top: 20px;">
            <p>With love and prayers,<br>
            <span class="tamil-text">அன்புடனும் ஜெபங்களுடனும்,</span></p>
            <p><strong>${process.env.CHURCH_NAME}</strong><br>
            <strong class="tamil-text">${process.env.CHURCH_NAME_TAMIL || ''}</strong></p>
          </div>
          
          <div class="footer">
            <p>${process.env.CHURCH_ADDRESS || ''}</p>
            <p>${process.env.CHURCH_PHONE || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  // ✅ Add timeout handling
  try {
    const info = await Promise.race([
      trans.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout after 15 seconds')), 15000)
      )
    ]);
    console.log(`✅ Anniversary email sent to ${believer.fullName} (${believer.email})`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send anniversary email to ${believer.fullName}:`, error.message);
    throw error;
  }
};

// ✅ Close transporter on exit
process.on('exit', () => {
  if (transporter) {
    transporter.close();
  }
});

module.exports = {
  sendBirthdayEmail,
  sendAnniversaryEmail,
};
