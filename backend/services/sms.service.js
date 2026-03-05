// backend/services/sms.service.js
// Complete file with smart phone logic

const axios = require('axios');
const momentTz = require('moment-timezone');

const TIMEZONE = 'Asia/Kolkata';

const calcAge = (dob) => {
  if (!dob) return null;
  return momentTz().tz(TIMEZONE).diff(momentTz(dob).tz(TIMEZONE), 'years');
};

/**
 * Get phone number with priority logic
 * Priority: 1) Believer's phone, 2) Family head's phone, 3) None
 */
const getPhoneNumber = (believer) => {
  // Priority 1: Believer has phone
  if (believer.phone && believer.phone.trim()) {
    return {
      phone: believer.phone.trim(),
      source: 'believer',
      name: believer.fullName
    };
  }

  // Priority 2: Family head's phone
  const headPhone = believer.familyId?.headId?.phone;
  if (headPhone && headPhone.trim()) {
    return {
      phone: headPhone.trim(),
      source: 'head',
      name: believer.familyId.headId.fullName
    };
  }

  // Priority 3: No phone available
  return null;
};

/**
 * Send SMS via MSG91
 */
const sendSMSViaMSG91 = async (phone, message) => {
  const url = 'https://control.msg91.com/api/v5/flow/';
  
  // Clean phone number (remove +91, spaces, dashes)
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  
  const payload = {
    flow_id: process.env.MSG91_FLOW_ID || process.env.MSG91_TEMPLATE_ID,
    sender: process.env.MSG91_SENDER_ID || 'CHRCH',
    mobiles: `91${cleanPhone}`,
    message: message,
  };

  try {
    await axios.post(url, payload, {
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY,
        'content-type': 'application/json',
      },
    });
    return true;
  } catch (error) {
    console.error('MSG91 SMS Error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send birthday wish SMS with smart phone logic
 * Returns: { success: boolean, phone: string, source: string, error?: string }
 */
const sendBirthdaySMS = async (believer) => {
  // Get phone number with priority logic
  const phoneInfo = getPhoneNumber(believer);
  
  if (!phoneInfo) {
    console.log(`⚠️  No phone for ${believer.fullName} - Skipped`);
    return {
      success: false,
      phone: null,
      source: 'none',
      error: 'No phone number available (believer or family head)'
    };
  }

  const age = calcAge(believer.dob);
  const name = believer.fullName;
  const tamilName = believer.tamilName || believer.fullName;  // ✅ Fallback logic
  
  // Bilingual SMS message
  const message = `🎂 Happy Birthday ${name}! ${age ? `Wishing you a blessed ${age}th year.` : 'Wishing you a blessed year ahead.'} May God's grace be upon you.

பிறந்தநாள் வாழ்த்துக்கள் ${tamilName}! ${age ? `${age}வது வயதில்` : ''} தேவனுடைய ஆசீர்வாதங்கள் உங்கள் மீது இருப்பதாக.

- ${process.env.CHURCH_NAME}`;

  try {
    await sendSMSViaMSG91(phoneInfo.phone, message);
    
    const logMessage = phoneInfo.source === 'believer' 
      ? `✅ Birthday SMS sent to ${name} (own phone: ${phoneInfo.phone})`
      : `✅ Birthday SMS sent to ${name} (via family head ${phoneInfo.name}: ${phoneInfo.phone})`;
    
    console.log(logMessage);
    
    return {
      success: true,
      phone: phoneInfo.phone,
      source: phoneInfo.source,
      sentTo: phoneInfo.name
    };
  } catch (error) {
    console.error(`❌ Failed to send birthday SMS to ${name}:`, error.message);
    return {
      success: false,
      phone: phoneInfo.phone,
      source: phoneInfo.source,
      error: error.message
    };
  }
};

/**
 * Send anniversary wish SMS with smart phone logic
 */
const sendAnniversarySMS = async (believer) => {
  const phoneInfo = getPhoneNumber(believer);
  
  if (!phoneInfo) {
    console.log(`⚠️  No phone for ${believer.fullName} - Skipped`);
    return {
      success: false,
      phone: null,
      source: 'none',
      error: 'No phone number available (believer or family head)'
    };
  }

  const yearsMarried = believer.weddingDate
    ? new Date().getFullYear() - new Date(believer.weddingDate).getFullYear()
    : null;

  const spouseName = believer.spouseId?.fullName || believer.spouseName;
  const tamilSpouseName = believer.spouseId?.tamilName || believer.spouseId?.fullName || believer.spouseName;
  
  const engCouple = spouseName ? `${believer.fullName} & ${spouseName}` : believer.fullName;
  const tamilCouple = tamilSpouseName 
    ? `${believer.tamilName || believer.fullName} & ${tamilSpouseName}` 
    : (believer.tamilName || believer.fullName);
  
  const message = `💝 Happy Anniversary ${engCouple}! ${yearsMarried ? `Celebrating ${yearsMarried} wonderful years.` : ''} May God bless your union.

திருமண நாள் வாழ்த்துக்கள் ${tamilCouple}! ${yearsMarried ? `${yearsMarried} அழகான வருடங்கள்.` : ''} தேவன் உங்கள் ஒன்றிப்பை ஆசீர்வதிப்பாராக.

- ${process.env.CHURCH_NAME}`;

  try {
    await sendSMSViaMSG91(phoneInfo.phone, message);
    
    const logMessage = phoneInfo.source === 'believer' 
      ? `✅ Anniversary SMS sent to ${engCouple} (own phone: ${phoneInfo.phone})`
      : `✅ Anniversary SMS sent to ${engCouple} (via family head ${phoneInfo.name}: ${phoneInfo.phone})`;
    
    console.log(logMessage);
    
    return {
      success: true,
      phone: phoneInfo.phone,
      source: phoneInfo.source,
      sentTo: phoneInfo.name
    };
  } catch (error) {
    console.error(`❌ Failed to send anniversary SMS to ${engCouple}:`, error.message);
    return {
      success: false,
      phone: phoneInfo.phone,
      source: phoneInfo.source,
      error: error.message
    };
  }
};

module.exports = {
  sendBirthdaySMS,
  sendAnniversarySMS,
  getPhoneNumber,  // Export for use in wishes service
};