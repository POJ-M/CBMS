/**
 * AddMemberModal.jsx
 *
 * Changes vs previous version:
 *  1.  DatePicker replaces all type="date" native inputs (friendly calendar UI)
 *  5.  parseApiError() used for all catch blocks (friendly error messages)
 *  9.  baptizedDate is OPTIONAL — removed required validation
 * 10.  weddingDate auto-syncs from head believer when Wife/Husband selected
 * 11.  memberType auto-locked by age+maritalStatus rule:
 *       age < 13           → "Child"
 *       13 ≤ age ≤ 30 AND Single → "Youth"
 *       else               → "Member"
 *      Displayed as read-only badge; NOT sent manually — always computed
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, UserPlus, AlertCircle, CheckCircle, Info, Lock } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { calcAge } from '../utils/helpers';
import DatePicker from './DatePicker';
import { parseApiError } from '../utils/errorUtils';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS = [
  'Son', 'Daughter', 'Wife', 'Husband',
  'Father', 'Mother', 'Brother', 'Sister',
  'Grandfather', 'Grandmother', 'Other',
];
const SPOUSE_RELATIONS   = ['Wife', 'Husband'];
const GENDER_OPTIONS     = ['Male', 'Female', 'Other'];
const STATUS_OPTIONS     = ['Active', 'Inactive'];
const MARITAL_OPTIONS    = ['Single', 'Married', 'Widowed'];
const BAPTIZED_OPTIONS   = ['Yes', 'No'];
const EDU_OPTIONS        = ['School', 'College'];
const OCCUPATION_OPTIONS = [
  'Ministry','Employed', 'Self-Employed', 'Business', 'Agriculture', 'Daily wages', 'House-Wife',
  'Student', 'Retired', 'Non-Worker', 'Child',
];

const EMPTY = {
  fullName: '', dob: '', gender: '', phone: '', email: '',
  relationshipToHead: '', relationCustom: '',
  membershipStatus: 'Active',
  baptized: '', baptizedDate: '', joinDate: '',
  maritalStatus: '', weddingDate: '', spouseName: '',
  occupationCategory: '', educationLevel: '',
};

// ─── MEMBER TYPE AUTO-RULE (item 11) ─────────────────────────────────────────

/**
 * Returns the auto-computed memberType based on age and maritalStatus.
 * age < 13                       → "Child"
 * 13 ≤ age ≤ 30 AND Single       → "Youth"
 * else                           → "Member"
 */
function autoMemberType(age, maritalStatus) {
  if (age === null) return null; // no DOB yet — can't determine
  if (age < 13) return 'Child';
  if (age <= 30 && maritalStatus === 'Single') return 'Youth';
  return 'Member';
}

const TYPE_BADGE_CLS = {
  Child:  'bg-yellow-100 text-yellow-700',
  Youth:  'bg-purple-100 text-purple-700',
  Member: 'bg-blue-100 text-blue-700',
};

// ─── PURE HELPERS ─────────────────────────────────────────────────────────────

const fieldCls = (field, errors, touched) => {
  const hasErr = errors[field] && touched[field];
  return [
    'w-full border rounded-lg px-3 py-2 text-sm',
    'focus:outline-none focus:ring-2 transition-colors bg-white',
    hasErr
      ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
      : 'border-gray-200 focus:ring-red-800/30 focus:border-red-800',
  ].join(' ');
};

const selCls  = (field, errors, touched) => fieldCls(field, errors, touched) + ' cursor-pointer';
const lblCls  = (required) =>
  `block text-xs font-semibold text-gray-600 mb-1${required ? " after:content-['*'] after:text-red-500 after:ml-0.5" : ''}`;

// ─── SUB-COMPONENTS (outside — stable refs) ───────────────────────────────────

function FormSection({ color, title, children }) {
  return (
    <div className={`bg-${color}-50/50 rounded-xl p-4 space-y-3 border border-${color}-100`}>
      <p className={`text-xs font-bold text-${color}-700 uppercase tracking-wide`}>{title}</p>
      {children}
    </div>
  );
}

function FieldErr({ msg }) {
  if (!msg) return null;
  return (
    <p data-field-error className="text-red-600 text-xs mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />{msg}
    </p>
  );
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

function validate(f, age, isUnder6, memberType) {
  const e         = {};
  const isUnder18 = age !== null && age < 18;
  const isSpouse  = SPOUSE_RELATIONS.includes(f.relationshipToHead);

  if (!f.fullName.trim())
    e.fullName = 'Full name is required.';

  if (!f.dob)
    e.dob = 'Date of birth is required.';
  else if (age < 0)
    e.dob = 'Date of birth cannot be in the future.';

  if (!f.gender)
    e.gender = 'Gender is required.';

  if (!f.relationshipToHead)
    e.relationshipToHead = 'Relationship to Head is required.';
  else if (isSpouse && isUnder18)
    e.relationshipToHead = 'Cannot be Wife / Husband — age is under 18.';
  else if (f.relationshipToHead === 'Other' && !f.relationCustom.trim())
    e.relationCustom = 'Please specify the relationship (e.g. Nephew).';

  // memberType is auto — only validate it was resolved
  if (!memberType)
    e.dob = (e.dob || '') + (e.dob ? ' ' : '') + 'Date of birth is needed to determine member type.';

  if (!f.baptized)
    e.baptized = 'Baptized status is required.';
  // item 9: baptizedDate is OPTIONAL — no validation

  if (!isUnder6 && !f.occupationCategory)
    e.occupationCategory = 'Occupation is required.';

  if (f.phone && !/^\d{10}$/.test(f.phone))
    e.phone = 'Phone must be exactly 10 digits.';

  if (!isUnder18 && !isSpouse && !f.maritalStatus)
    e.maritalStatus = 'Marital status is required.';

  return e;
}

// ─── PAYLOAD BUILDER ─────────────────────────────────────────────────────────

function buildPayload(f, age, memberType) {
  const isUnder18 = age !== null && age < 18;
  const isSpouse  = SPOUSE_RELATIONS.includes(f.relationshipToHead);
  const isUnder6  = age !== null && age <= 5;

  const p = {
    fullName:           f.fullName.trim(),
    dob:                f.dob,
    gender:             f.gender,
    relationshipToHead: f.relationshipToHead,
    memberType:         memberType,                          // always auto
    membershipStatus:   f.membershipStatus || 'Active',
    baptized:           f.baptized,
    occupationCategory: isUnder6 ? 'Child' : f.occupationCategory,
    spouseId:           null,
  };

  if (f.relationshipToHead === 'Other')
    p.relationCustom = f.relationCustom.trim();

  // item 9: baptizedDate optional
  if (f.baptized === 'Yes' && f.baptizedDate)
    p.baptizedDate = f.baptizedDate;

  if (f.phone.trim())  p.phone   = f.phone.trim();
  if (f.email.trim())  p.email   = f.email.trim();
  if (f.joinDate)      p.joinDate = f.joinDate;

  if (f.occupationCategory === 'Student' && f.educationLevel)
    p.educationLevel = f.educationLevel;

  if (!isUnder18 && !isSpouse) {
    p.maritalStatus = f.maritalStatus;
    if (f.maritalStatus === 'Married') {
      if (f.weddingDate)        p.weddingDate = f.weddingDate;
      if (f.spouseName.trim())  p.spouseName  = f.spouseName.trim();
    }
    if (f.maritalStatus === 'Widowed' && f.spouseName.trim())
      p.spouseName = f.spouseName.trim();
  }

  if (isSpouse && !isUnder18 && f.weddingDate)
    p.weddingDate = f.weddingDate;

  return p;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * Props:
 *   familyId    {string}  — MongoDB _id of the family
 *   headMember  {object}  — the current head believer (from FamilyDetail members list)
 *                           used to sync weddingDate (item 10)
 *   onSuccess   {fn}
 *   onClose     {fn}
 */
export default function AddMemberModal({ familyId, headMember, onSuccess, onClose }) {
  const [f,       setF]       = useState({ ...EMPTY });
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});
  const [saving,  setSaving]  = useState(false);

  // ── Derived values ────────────────────────────────────────────────────────
  const age       = f.dob ? calcAge(f.dob) : null;
  const isUnder18 = age !== null && age < 18;
  const isUnder6  = age !== null && age <= 5;
  const isSpouse  = SPOUSE_RELATIONS.includes(f.relationshipToHead);
  const today     = new Date().toISOString().split('T')[0];

  // item 11: auto memberType
  const memberType = autoMemberType(
    age,
    // use auto-derived marital for under-18
    isUnder18 ? 'Single' : (isSpouse ? 'Married' : f.maritalStatus)
  );

  const err = (field) => (touched[field] ? errors[field] : undefined);

  // ── item 10: Auto-fill weddingDate from head when Wife/Husband selected ───
  // Only runs when isSpouse flips to true AND weddingDate is currently empty
  useEffect(() => {
    if (isSpouse && !f.weddingDate && headMember?.weddingDate) {
      const hwd = typeof headMember.weddingDate === 'string'
        ? headMember.weddingDate.split('T')[0]
        : new Date(headMember.weddingDate).toISOString().split('T')[0];
      setF(prev => ({ ...prev, weddingDate: hwd }));
    }
  }, [isSpouse]); // intentionally only [isSpouse] — fire once when relation changes to spouse

  // ── Generic setter ────────────────────────────────────────────────────────
  const set = useCallback((field) => (e) => {
    const val = typeof e === 'string' ? e : e.target.value; // DatePicker passes string directly
    setF((prev) => ({ ...prev, [field]: val }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  // ── DatePicker onChange (receives "YYYY-MM-DD" string) ────────────────────
  const setDate = useCallback((field) => (ymd) => {
    setF((prev) => ({ ...prev, [field]: ymd }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  // ── DOB change — all side-effects in updater, no stale closure ───────────
  const handleDobChange = (ymd) => {
    const newAge = ymd ? calcAge(ymd) : null;
    const u18    = newAge !== null && newAge < 18;
    const u6     = newAge !== null && newAge <= 5;

    setF((prev) => {
      const next = { ...prev, dob: ymd };
      if (u18 && SPOUSE_RELATIONS.includes(prev.relationshipToHead)) {
        next.relationshipToHead = '';
        next.relationCustom     = '';
        next.maritalStatus      = '';
      }
      if (u18) {
        next.maritalStatus = 'Single';
        next.weddingDate   = '';
        next.spouseName    = '';
      }
      if (u6) {
        next.occupationCategory = 'Child';
        next.educationLevel     = '';
      }
      return next;
    });
    setTouched((prev) => ({ ...prev, dob: true }));
    setErrors((prev)  => { const n = { ...prev }; delete n.dob; return n; });
  };

  // ── Relation change ───────────────────────────────────────────────────────
  const handleRelationChange = (e) => {
    const val       = e.target.value;
    const nowSpouse = SPOUSE_RELATIONS.includes(val);
    const wasSpouse = SPOUSE_RELATIONS.includes(f.relationshipToHead);

    setF((prev) => {
      const next = { ...prev, relationshipToHead: val };
      if (prev.relationshipToHead === 'Other' && val !== 'Other')
        next.relationCustom = '';
      if (nowSpouse) {
        next.maritalStatus = 'Married';
      } else if (wasSpouse) {
        next.maritalStatus = '';
        next.weddingDate   = '';
        next.spouseName    = '';
      }
      return next;
    });
    setTouched((prev) => ({ ...prev, relationshipToHead: true }));
    setErrors((prev)  => { const n = { ...prev }; delete n.relationshipToHead; delete n.relationCustom; return n; });
  };

  // ── Baptized change ───────────────────────────────────────────────────────
  const handleBaptizedChange = (e) => {
    const val = e.target.value;
    setF((prev) => ({
      ...prev,
      baptized:     val,
      baptizedDate: val === 'No' ? '' : prev.baptizedDate,
    }));
    setTouched((prev) => ({ ...prev, baptized: true }));
    setErrors((prev)  => { const n = { ...prev }; delete n.baptized; return n; });
  };

  // ── Occupation change ─────────────────────────────────────────────────────
  const handleOccupationChange = (e) => {
    const val = e.target.value;
    setF((prev) => ({
      ...prev,
      occupationCategory: val,
      educationLevel: val !== 'Student' ? '' : prev.educationLevel,
    }));
    setTouched((prev) => ({ ...prev, occupationCategory: true }));
    setErrors((prev)  => { const n = { ...prev }; delete n.occupationCategory; return n; });
  };

  // ── Marital change ────────────────────────────────────────────────────────
  const handleMaritalChange = (e) => {
    const val = e.target.value;
    setF((prev) => ({
      ...prev,
      maritalStatus: val,
      weddingDate:   val !== 'Married' ? '' : prev.weddingDate,
      spouseName:    val === 'Single'  ? '' : prev.spouseName,
    }));
    setTouched((prev) => ({ ...prev, maritalStatus: true }));
    setErrors((prev)  => { const n = { ...prev }; delete n.maritalStatus; return n; });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setTouched(Object.keys(f).reduce((acc, k) => ({ ...acc, [k]: true }), {}));

    const errs = validate(f, age, isUnder6, memberType);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields before saving.');
      setTimeout(() => {
        document.querySelector('[data-field-error]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(f, age, memberType);
      await api.post(`/families/${familyId}/members`, payload);
      toast.success('Member added successfully!');
      onSuccess();
    } catch (err) {
      // item 5: friendly error messages
      const msg = parseApiError(err);
      toast.error(msg);
      const ml = msg.toLowerCase();
      if (ml.includes('phone'))          setErrors((p) => ({ ...p, phone:              msg }));
      if (ml.includes('marital'))        setErrors((p) => ({ ...p, maritalStatus:      msg }));
      if (ml.includes('spouse') || ml.includes('duplicate'))
                                         setErrors((p) => ({ ...p, relationshipToHead: msg }));
      if (ml.includes('specify') || ml.includes('custom'))
                                         setErrors((p) => ({ ...p, relationCustom:     msg }));
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="bg-red-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-red-200" />
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">Add Member</h3>
              <p className="text-red-200 text-xs">Fields marked * are required</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="text-red-200 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ── SECTION 1: Relationship to Head ─────────────────────────── */}
          <FormSection color="purple" title="Relationship to Head">
            <div className="grid grid-cols-2 gap-3">
              <div className={f.relationshipToHead === 'Other' ? '' : 'col-span-2'}>
                <label className={lblCls(true)}>Relationship to Head</label>
                <select
                  className={selCls('relationshipToHead', errors, touched)}
                  value={f.relationshipToHead}
                  onChange={handleRelationChange}
                >
                  <option value="">Select relationship…</option>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <FieldErr msg={err('relationshipToHead')} />
                {isSpouse && !isUnder18 && (
                  <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    💍 <strong>Marital status auto-set to Married.</strong>{' '}
                    Spouse will be linked to Head automatically on save.
                    {headMember?.weddingDate && (
                      <span className="block mt-0.5 text-green-700">
                        ✓ Wedding date synced from Head's record.
                      </span>
                    )}
                  </p>
                )}
              </div>
              {f.relationshipToHead === 'Other' && (
                <div>
                  <label className={lblCls(true)}>Specify Relationship</label>
                  <input
                    className={fieldCls('relationCustom', errors, touched)}
                    value={f.relationCustom}
                    onChange={set('relationCustom')}
                    placeholder="e.g. Nephew, Cousin…"
                  />
                  <FieldErr msg={err('relationCustom')} />
                </div>
              )}
            </div>
          </FormSection>

          {/* ── SECTION 2: Personal Info ─────────────────────────────────── */}
          <FormSection color="blue" title="Personal Information">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lblCls(true)}>Full Name</label>
                <input
                  className={fieldCls('fullName', errors, touched)}
                  value={f.fullName}
                  onChange={set('fullName')}
                  placeholder="Enter full name"
                />
                <FieldErr msg={err('fullName')} />
              </div>

              <div>
                <label className={lblCls(true)}>Date of Birth</label>
                {/* item 1: custom DatePicker */}
                <DatePicker
                  value={f.dob}
                  onChange={handleDobChange}
                  max={today}
                  placeholder="DD/MM/YYYY"
                  error={!!(errors.dob && touched.dob)}
                />
                {age !== null && (
                  <p className="text-xs mt-1 font-medium text-gray-400">
                    Age: <strong className="text-red-800">{age}</strong> yrs
                    {isUnder18 && <span className="ml-2 text-amber-600">· Under 18 — marital fields hidden</span>}
                    {isUnder6  && <span className="ml-2 text-amber-600">· Occupation locked to Child</span>}
                  </p>
                )}
                <FieldErr msg={err('dob')} />
              </div>

              <div>
                <label className={lblCls(true)}>Gender</label>
                <select
                  className={selCls('gender', errors, touched)}
                  value={f.gender}
                  onChange={set('gender')}
                >
                  <option value="">Select…</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <FieldErr msg={err('gender')} />
              </div>

              <div>
                <label className={lblCls(false)}>Phone</label>
                <input
                  className={fieldCls('phone', errors, touched)}
                  value={f.phone}
                  onChange={set('phone')}
                  placeholder="10 digits"
                  maxLength={10}
                />
                <FieldErr msg={err('phone')} />
              </div>

              <div>
                <label className={lblCls(false)}>Email</label>
                <input
                  type="email"
                  className={fieldCls('email', errors, touched)}
                  value={f.email}
                  onChange={set('email')}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </FormSection>

          {/* ── SECTION 3: Church Details ────────────────────────────────── */}
          <FormSection color="green" title="Church Details">
            <div className="grid grid-cols-2 gap-3">

              {/* item 11: Member Type — auto-locked read-only badge */}
              <div className="col-span-2">
                <label className={lblCls(false)}>Member Type</label>
                {memberType ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE_CLS[memberType] || 'bg-gray-100 text-gray-600'}`}>
                      {memberType}
                    </span>
                    <span className="text-xs text-gray-400">
                      (Auto-set from age &amp; marital status)
                    </span>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-400">
                    Enter date of birth to determine member type
                  </div>
                )}
              </div>

              <div>
                <label className={lblCls(false)}>Membership Status</label>
                <select
                  className={selCls('membershipStatus', errors, touched)}
                  value={f.membershipStatus}
                  onChange={set('membershipStatus')}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={lblCls(true)}>Baptized</label>
                <select
                  className={selCls('baptized', errors, touched)}
                  value={f.baptized}
                  onChange={handleBaptizedChange}
                >
                  <option value="">Select…</option>
                  {BAPTIZED_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <FieldErr msg={err('baptized')} />
              </div>

              {/* item 9: baptizedDate OPTIONAL — no * required marker */}
              {f.baptized === 'Yes' && (
                <div>
                  <label className={lblCls(false)}>
                    Baptized Date{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <DatePicker
                    value={f.baptizedDate}
                    onChange={setDate('baptizedDate')}
                    max={today}
                    placeholder="DD/MM/YYYY"
                    error={false}
                  />
                </div>
              )}

              <div>
                <label className={lblCls(false)}>Join Date</label>
                <DatePicker
                  value={f.joinDate}
                  onChange={setDate('joinDate')}
                  max={today}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>
          </FormSection>

          {/* ── SECTION 4: Occupation ────────────────────────────────────── */}
          <FormSection color="yellow" title="Occupation">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lblCls(true)}>Occupation Category</label>
                <select
                  className={
                    selCls('occupationCategory', errors, touched) +
                    (isUnder6 ? ' opacity-60 cursor-not-allowed' : '')
                  }
                  value={isUnder6 ? 'Child' : f.occupationCategory}
                  onChange={handleOccupationChange}
                  disabled={isUnder6}
                >
                  <option value="">Select…</option>
                  {OCCUPATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {isUnder6 && (
                  <p className="text-xs text-amber-600 mt-1">Auto-locked to "Child" (age ≤ 5)</p>
                )}
                <FieldErr msg={err('occupationCategory')} />
              </div>

              {f.occupationCategory === 'Student' && (
                <div>
                  <label className={lblCls(false)}>Education Level</label>
                  <select
                    className={selCls('educationLevel', errors, touched)}
                    value={f.educationLevel}
                    onChange={set('educationLevel')}
                  >
                    <option value="">Select…</option>
                    {EDU_OPTIONS.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </FormSection>

          {/* ── SECTION 5: Marital Status ────────────────────────────────── */}
          {!isUnder18 && (
            <FormSection color="pink" title="Marital Status">
              {isSpouse ? (
                /* Wife/Husband: locked to Married, only wedding date optional */
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Marital Status:</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Married (auto)
                    </span>
                  </div>
                  <div>
                    <label className={lblCls(false)}>
                      Wedding Date{' '}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <DatePicker
                      value={f.weddingDate}
                      onChange={setDate('weddingDate')}
                      max={today}
                      placeholder="DD/MM/YYYY"
                    />
                    {/* item 10: show sync notice */}
                    {f.weddingDate && headMember?.weddingDate && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Synced from Head's record
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lblCls(true)}>Marital Status</label>
                    <select
                      className={selCls('maritalStatus', errors, touched)}
                      value={f.maritalStatus}
                      onChange={handleMaritalChange}
                    >
                      <option value="">Select…</option>
                      {MARITAL_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <FieldErr msg={err('maritalStatus')} />
                  </div>

                  {f.maritalStatus === 'Married' && (
                    <div>
                      <label className={lblCls(false)}>Wedding Date</label>
                      <DatePicker
                        value={f.weddingDate}
                        onChange={setDate('weddingDate')}
                        max={today}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                  )}

                  {(f.maritalStatus === 'Married' || f.maritalStatus === 'Widowed') && (
                    <div className={f.maritalStatus === 'Widowed' ? 'col-span-2' : ''}>
                      <label className={lblCls(false)}>
                        {f.maritalStatus === 'Widowed' ? 'Late Spouse Name' : 'Spouse Name'}
                      </label>
                      <input
                        className={fieldCls('spouseName', errors, touched)}
                        value={f.spouseName}
                        onChange={set('spouseName')}
                        placeholder={f.maritalStatus === 'Widowed' ? 'Late spouse name…' : 'Spouse name…'}
                      />
                    </div>
                  )}
                </div>
              )}
            </FormSection>
          )}

          {/* Under-18 info */}
          {isUnder18 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 font-medium">
                Age under 18 — marital status auto-set to <strong>Single</strong>.
                Marriage fields are hidden.
              </p>
            </div>
          )}

          {/* Global error summary */}
          {Object.values(errors).some(Boolean) && Object.keys(touched).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-700 font-medium">
                {Object.values(errors).filter(Boolean).length} field
                {Object.values(errors).filter(Boolean).length > 1 ? 's need' : ' needs'} attention.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-gray-50">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 transition-colors disabled:opacity-50 min-w-[130px] justify-center">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><CheckCircle className="w-4 h-4" /> Add Member</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}