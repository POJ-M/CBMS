require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const exists = await User.findOne({ username: 'admin' });
  if (!exists) {
    await User.create({ username: 'POJ_Admin', password: 'admin123', role: 'admin' });
  } else {
    console.log(exists);
    console.log('ℹ️  Admin user already exists');
  }
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });