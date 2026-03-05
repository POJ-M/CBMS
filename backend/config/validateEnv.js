// backend/config/validateEnv.js
const validateEnv = () => {
  const required = [
    'NODE_ENV',
    'PORT',
    'MONGO_URI',
    'JWT_SECRET'
    // 'CLIENT_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  console.log('✅ Environment variables validated');
};

module.exports = validateEnv;