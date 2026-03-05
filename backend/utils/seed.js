require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seed = async () => {
  console.log('------------------------------------------------');
  console.log('--------| Presence of Jesus Church |------------');
  console.log('------------------------------------------------');
  console.log('🙏  Church BMS Setup Starting...');
  console.log('-----------------------------------');

  try {
    console.log('🔌 Connecting to Church Database...');
    /*await mongoose.connect( "mongodb+srv://it_pojm_admin:Jx2oJZsW5PO2wxe2@pojm.0rxw6uu.mongodb.net/cbms");*/
    await mongoose.connect("mongodb+srv://mmageshs:wvu8BPpa9XiIRAHs@grub.aqthztq.mongodb.net/church_cbms");
    console.log('✅ Database Connected Successfully!\n');

    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('ℹ️  Admin account already exists.');
      console.log('👉 No changes were made.');
      console.log('\nIf you forgot password, please contact system administrator.');
    } else {
      const adminUsername =  'hi';
      const adminPassword = 'admin123';

      await User.create({
        username: adminUsername,
        password: adminPassword,
        role: 'admin'
      });

      console.log('🎉 Official Admin Account Created Successfully!');
      console.log('------------------------------------------------');
      console.log(`👤 Username: ${adminUsername}`);
      console.log(`🔐 Password: ${adminPassword}`);
      console.log('------------------------------------------------');
      console.log('⚠️  IMPORTANT: Please login and change password immediately.');
      console.log('\n🙏 POJ-Church BMS is ready for use!');
    }

    process.exit(0);

  } catch (error) {
    console.log('\n❌ Setup Failed!');
    console.log('Please contact technical support.');
    console.error(error.message);
    process.exit(1);
  }
};

seed();