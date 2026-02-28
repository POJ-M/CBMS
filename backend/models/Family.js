const mongoose = require('mongoose');

// Tamil Nadu Districts list (alphabetically sorted)
const TN_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
  'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram',
  'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
  'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
  'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
  'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
  'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
  'Vellore', 'Viluppuram', 'Virudhunagar'
];

const familySchema = new mongoose.Schema({
  familyCode: { type: String, sparse: true }, // FIX #3: sparse index allows multiple nulls
  address: { type: String, required: true, trim: true },
  village: { type: String, required: true, trim: true },
  district: { 
    type: String, 
    required: true, 
    enum: TN_DISTRICTS,
    trim: true 
  },
  familyStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  headId: { type: mongoose.Schema.Types.ObjectId, ref: 'Believer', default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

// FIX #3: Improved familyCode generation that handles deleted records
familySchema.pre('save', async function (next) {
  // Generate familyCode only for new, non-deleted families
  if (this.isNew && !this.familyCode && !this.isDeleted) {
    try {
      // Count only non-deleted families for the next family code
      const count = await mongoose.model('Family').countDocuments({ isDeleted: false });
      this.familyCode = `FAM-${String(count + 1).padStart(4, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  
  // FIX #3: When soft-deleting, set familyCode to null to free it up
  // This allows the sparse index to work properly (multiple nulls allowed)
  if (this.isModified('isDeleted') && this.isDeleted && this.familyCode) {
    this.familyCode = null; // Clear the code so it can be reused
  }
  
  next();
});

// Indexes
familySchema.index({ village: 1 });
familySchema.index({ district: 1 });
familySchema.index({ familyCode: 1 }, { unique: true, sparse: true }); // FIX #3: sparse allows multiple null values
familySchema.index({ headId: 1 });
familySchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Family', familySchema);
module.exports.TN_DISTRICTS = TN_DISTRICTS; // Export for use in controllers/frontend