/**
 * Believer.js —
 */
const mongoose = require('mongoose');

const believerSchema = new mongoose.Schema(
  {
    familyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    isHead:    { type: Boolean, default: false },
    fullName:  { type: String, required: true, trim: true },
    tamilName: { type: String, trim: true },
    dob:       { type: Date, required: false  },
    gender:    { type: String, enum: ['Male', 'Female', 'Other'], required: true },

    phone: {
      type: String,
      validate: {
        validator: (v) => !v || /^\d{10}$/.test(v),
        message:   'Phone must be exactly 10 digits.',
      },
    },
    email: { type: String, trim: true, lowercase: true },

    memberType:       { type: String, enum: ['Member', 'Youth', 'Child','Deceased'], required: true },
    membershipStatus: {
      type: String,
      enum: ['Active', 'Inactive', 'Deceased', 'Transferred'],  
      default: 'Active',
    },    
    joinDate:         { type: Date },

    baptized:     { type: String, enum: ['Yes', 'No'], },
    baptizedDate: { type: Date },

    relationshipToHead: {
      type: String,
      enum: ['Self', 'Wife', 'Husband', 'Son', 'Daughter', 'Father', 'Mother', 'Other'],
      
    },
    relationCustom: { type: String, trim: true },

    maritalStatus: { type: String, enum: ['Single', 'Married', 'Widowed'],  },
    spouseId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Believer', default: null },
    spouseName:    { type: String, trim: true },
    weddingDate:   { type: Date },

    occupationCategory: {
      type: String,
      enum: ['Child', 'Student','Ministry', 'Employed', 'Self-Employed', 'Business', 'Agriculture', 'Daily wages',
             'House-Wife', 'Non-Worker', 'Retired','Deceased'],
      required: true,
    },

    // educationLevel: optional — only for Students.
    // NOT required so that absence doesn't trigger validation.
    // Never send "" — controller will $unset it if blank.
    educationLevel: {
      type:      String,
      enum:      ['School', 'College'],
      // No `required`, no `default` — field simply won't exist on non-students
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date,    default: null },   // ← NEW for trash support
  },
  { timestamps: true }
);

// Virtual: age in years (IST)
believerSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  const m = require('moment-timezone');
  return m().tz('Asia/Kolkata').diff(m(this.dob).tz('Asia/Kolkata'), 'years');
});

// PRE-SAVE HOOK: Auto-set fields for Deceased status
believerSchema.pre('save', function (next) {
  // If membership status is Deceased, auto-set member type and occupation
  if (this.membershipStatus === 'Deceased') {
    this.memberType = 'Deceased';
    this.occupationCategory = 'Deceased';
    // Optional: Clear baptized/marital if needed
    // this.baptized = undefined;
    // this.maritalStatus = undefined;
  }
  
  next();
});

believerSchema.set('toJSON',   { virtuals: true });
believerSchema.set('toObject', { virtuals: true });

believerSchema.index({ familyId: 1, isDeleted: 1 });
believerSchema.index({ fullName: 'text' });
believerSchema.index({ dob: 1 });
believerSchema.index({ weddingDate: 1 });

module.exports = mongoose.model('Believer', believerSchema);
