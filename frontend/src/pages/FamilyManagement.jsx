/**
 * FamilyManagement.jsx
 *
 * Changes vs previous version:
 *  2.  FamilyDetail: auto-fetches members on open (useEffect → refresh())
 *  3.  CreateFamilyModal: Section moved OUTSIDE render body — fixes focus-loss bug
 *  4.  FamilyDetail: delete button per member row with confirm dialog
 *  5.  All catch blocks use parseApiError() for friendly error messages
 *  1.  All date inputs replaced with DatePicker component
 *  9.  baptizedDate is OPTIONAL (no required validation, label shows "optional")
 * 11.  memberType auto-locked by age rule:
 *       age < 13 → Child | 13-30 + Single → Youth | else → Member
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Eye, Trash2, Plus, X, Search, RefreshCw,
  Loader2, AlertTriangle, CheckCircle, MapPin, Phone, Lock,
  UserMinus, AlertCircle, Info, Edit2,
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDate, calcAge } from '../utils/helpers';
import { parseApiError } from '../utils/errorUtils';
import DatePicker from './DatePicker';
import AddMemberModal from './AddMemberModal';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const GENDER_OPTIONS     = ['Male', 'Female', 'Other'];
const STATUS_OPTIONS     = ['Active', 'Inactive'];
const MARITAL_OPTIONS    = ['Single', 'Married', 'Widowed'];
const BAPTIZED_OPTIONS   = ['Yes', 'No'];
const EDU_OPTIONS        = ['School', 'College'];
const OCCUPATION_OPTIONS = [
  'Ministry','Employed', 'Self-Employed', 'Business', 'Agriculture', 'Daily wages', 'House-Wife',
  'Student', 'Retired', 'Non-Worker', 'Child',
];

const EMPTY_HEAD = {
  fullName: '', dob: '', gender: '', phone: '', email: '',
  maritalStatus: '', weddingDate: '', spouseName: '',
  membershipStatus: 'Active',
  baptized: '', baptizedDate: '', joinDate: '',
  occupationCategory: '', educationLevel: '',
};

// ─── item 11: Auto member type ─────────────────────────────────────────────────

function autoMemberType(age, maritalStatus) {
  if (age === null) return null;
  if (age < 13) return 'Child';
  if (age <= 30 && maritalStatus === 'Single') return 'Youth';
  return 'Member';
}

const TYPE_BADGE = {
  Child:  'bg-yellow-100 text-yellow-700',
  Youth:  'bg-purple-100 text-purple-700',
  Member: 'bg-blue-100 text-blue-700',
};

// ─── HELPERS (outside any component — stable refs) ─────────────────────────────

const inp = (hasErr) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors bg-white
   ${hasErr ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-red-800/30 focus:border-red-800'}`;

const sel = (hasErr) => inp(hasErr) + ' cursor-pointer';
const lbl = (req) =>
  `block text-xs font-semibold text-gray-600 mb-1${req ? " after:content-['*'] after:text-red-500 after:ml-0.5" : ''}`;

// ─── FIX #3: FormSection OUTSIDE CreateFamilyModal — no remount on keypress ────

function FormSection({ color, title, children }) {
  return (
    <div className={`bg-${color}-50/50 rounded-xl p-4 space-y-3 border border-${color}-100`}>
      <p className={`text-xs font-bold text-${color}-700 uppercase tracking-wide`}>{title}</p>
      {children}
    </div>
  );
}

function Ferr({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />{msg}
    </p>
  );
}

// ─── RELATIONSHIP BADGE ────────────────────────────────────────────────────────

function RelBadge({ m }) {
  const label = m.relationshipToHead === 'Other' && m.relationCustom
    ? m.relationCustom
    : m.relationshipToHead;
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{label || '—'}</span>
  );
}

// ─── EDIT FAMILY MODAL ─────────────────────────────────────────────────────────

function EditFamilyModal({ family, districts, onSuccess, onClose }) {
  const [form, setForm] = useState({
    address: family.address || '',
    village: family.village || '',
    district: family.district || '',
    familyStatus: family.familyStatus || 'Active'
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.address.trim())  e.address  = 'Address is required.';
    if (!form.village.trim())  e.village  = 'Village is required.';
    if (!form.district.trim()) e.district = 'District is required.';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields.');
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/families/${family._id}`, {
        address:      form.address.trim(),
        village:      form.village.trim(),
        district:     form.district.trim(),
        familyStatus: form.familyStatus,
      });
      toast.success('Family updated successfully!');
      onSuccess();
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Edit Family Details</h3>
            <p className="text-blue-200 text-xs mt-0.5">{family.familyCode}</p>
          </div>
          <button type="button" onClick={onClose}
            className="text-blue-200 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className={lbl(true)}>Address</label>
            <textarea 
              className={inp(errors.address) + ' min-h-[80px]'} 
              value={form.address}
              onChange={setField('address')} 
              placeholder="Full address" 
              rows={3}
            />
            <Ferr msg={errors.address} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl(true)}>District</label>
              <select className={sel(errors.district)} value={form.district} 
                onChange={setField('district')}>
                <option value="">Select District...</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <Ferr msg={errors.district} />
            </div>

            <div>
              <label className={lbl(true)}>Village / Town</label>
              <input className={inp(errors.village)} value={form.village}
                onChange={setField('village')} placeholder="e.g. Salem" />
              <Ferr msg={errors.village} />
            </div>
          </div>

          <div>
            <label className={lbl(false)}>Family Status</label>
            <select className={sel(false)} value={form.familyStatus} 
              onChange={setField('familyStatus')}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Family Code and Head cannot be changed here. 
              To change the head, use "Assign New Head" from the family detail view.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50 min-w-[120px] justify-center">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><CheckCircle className="w-4 h-4" /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CREATE FAMILY MODAL ───────────────────────────────────────────────────────

function CreateFamilyModal({ districts,onSuccess, onClose }) {
  const [family, setFamily] = useState({ address: '', village: '', district: '', familyStatus: 'Active' });
  const [head,   setHead]   = useState({ ...EMPTY_HEAD });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Derived values — always fresh from current state
  const age       = head.dob ? calcAge(head.dob) : null;
  const isUnder18 = age !== null && age < 18;
  const isUnder6  = age !== null && age <= 5;
  const today     = new Date().toISOString().split('T')[0];

  // item 11: auto memberType for head
  const memberType = autoMemberType(age, isUnder18 ? 'Single' : head.maritalStatus);

  // ── Family field setter ──────────────────────────────────────────────────
  const setF = (field) => (e) =>
    setFamily((p) => ({ ...p, [field]: e.target.value }));

  // ── Head text/select setter ──────────────────────────────────────────────
  const setH = (field) => (e) => {
    const val = e.target.value;
    setHead((p) => ({ ...p, [field]: val }));
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  };

  // ── Head DatePicker setter ───────────────────────────────────────────────
  const setHDate = (field) => (ymd) => {
    setHead((p) => ({ ...p, [field]: ymd }));
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  };

  // ── DOB change with side-effects ─────────────────────────────────────────
  const handleDobChange = (ymd) => {
    const newAge  = ymd ? calcAge(ymd) : null;
    const under18 = newAge !== null && newAge < 18;
    const under6  = newAge !== null && newAge <= 5;
    setHead((p) => ({
      ...p,
      dob: ymd,
      ...(under18 ? { maritalStatus: 'Single', weddingDate: '', spouseName: '' } : {}),
      ...(under6  ? { occupationCategory: 'Child', educationLevel: '' } : {}),
    }));
    setErrors((p) => { const n = { ...p }; delete n.dob; return n; });
  };

  const handleBaptizedChange = (e) => {
    const val = e.target.value;
    setHead((p) => ({ ...p, baptized: val, baptizedDate: val === 'No' ? '' : p.baptizedDate }));
    setErrors((p) => { const n = { ...p }; delete n.baptized; return n; });
  };

  const handleOccupationChange = (e) => {
    const val = e.target.value;
    setHead((p) => ({ ...p, occupationCategory: val, educationLevel: val !== 'Student' ? '' : p.educationLevel }));
    setErrors((p) => { const n = { ...p }; delete n.occupationCategory; return n; });
  };

  const handleMaritalChange = (e) => {
    const val = e.target.value;
    setHead((p) => ({
      ...p, maritalStatus: val,
      weddingDate: val !== 'Married' ? '' : p.weddingDate,
      spouseName:  val === 'Single'  ? '' : p.spouseName,
    }));
    setErrors((p) => { const n = { ...p }; delete n.maritalStatus; return n; });
  };

  const validate = () => {
    const e = {};
    if (!family.address.trim())    e.address           = 'Address is required.';
    if (!family.village.trim())    e.village           = 'Village is required.';
    if (!family.district.trim())   e.district = 'District is required.';
    if (!head.fullName.trim())     e.fullName          = 'Head name is required.';
    if (!head.dob)                 e.dob               = 'Date of birth is required.';
    if (!head.gender)              e.gender            = 'Gender is required.';
    if (!head.baptized)            e.baptized          = 'Baptized status is required.';
    // item 9: baptizedDate is optional — no required check
    if (!head.occupationCategory && !isUnder6)
                                   e.occupationCategory = 'Occupation is required.';
    if (!isUnder18 && !head.maritalStatus)
                                   e.maritalStatus      = 'Marital status is required.';
    if (head.phone && !/^\d{10}$/.test(head.phone))
                                   e.phone              = 'Phone must be 10 digits.';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const headPayload = {
        fullName:           head.fullName.trim(),
        dob:                head.dob,
        gender:             head.gender,
        memberType:         memberType || 'Member',          // item 11
        membershipStatus:   head.membershipStatus || 'Active',
        baptized:           head.baptized,
        occupationCategory: isUnder6 ? 'Child' : head.occupationCategory,
        maritalStatus:      isUnder18 ? 'Single' : head.maritalStatus,
      };
      if (head.phone.trim())            headPayload.phone    = head.phone.trim();
      if (head.email.trim())            headPayload.email    = head.email.trim();
      if (head.joinDate)                headPayload.joinDate = head.joinDate;
      // item 9: baptizedDate optional
      if (head.baptized === 'Yes' && head.baptizedDate)
                                        headPayload.baptizedDate = head.baptizedDate;
      if (!isUnder18 && head.maritalStatus === 'Married') {
        if (head.weddingDate)           headPayload.weddingDate = head.weddingDate;
        if (head.spouseName.trim())     headPayload.spouseName  = head.spouseName.trim();
      }
      if (!isUnder18 && head.maritalStatus === 'Widowed' && head.spouseName.trim())
                                        headPayload.spouseName = head.spouseName.trim();
      if (head.occupationCategory === 'Student' && head.educationLevel)
                                        headPayload.educationLevel = head.educationLevel;

      await api.post('/families', {
        address:      family.address.trim(),
        village:      family.village.trim(),
        district:     family.district.trim(),
        familyStatus: family.familyStatus,
        head:         headPayload,
      });
      toast.success('Family created successfully!');
      onSuccess();
    } catch (err) {
      // item 5: friendly error message
      toast.error(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="bg-red-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Create New Family</h3>
            <p className="text-red-200 text-xs mt-0.5">Family + Head Believer required</p>
          </div>
          <button type="button" onClick={onClose}
            className="text-red-200 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* FIX #3: plain <div> scroll wrapper, no inline Section component */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Family Details */}
          <FormSection color="gray" title="Family Details">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl(true)}>Address</label>
                <input className={inp(errors.address)} value={family.address}
                  onChange={setF('address')} placeholder="Full address" />
                <Ferr msg={errors.address} />
              </div>
              
              {/* NEW: District Dropdown */}
              <div>
                <label className={lbl(true)}>District</label>
                <select className={sel(errors.district)} value={family.district || ''} 
                  onChange={setF('district')}>
                  <option value="">Select District...</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <Ferr msg={errors.district} />
              </div>
              
              <div>
                <label className={lbl(true)}>Village / Town</label>
                <input className={inp(errors.village)} value={family.village}
                  onChange={setF('village')} placeholder="e.g. Salem" />
                <Ferr msg={errors.village} />
              </div>
              
              <div className="col-span-2">
                <label className={lbl(false)}>Family Status</label>
                <select className={sel(false)} value={family.familyStatus} onChange={setF('familyStatus')}>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </FormSection>

          {/* Head — Personal */}
          <FormSection color="blue" title="Head Believer — Personal">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl(true)}>Full Name</label>
                <input className={inp(errors.fullName)} value={head.fullName}
                  onChange={setH('fullName')} placeholder="Head's full name" />
                <Ferr msg={errors.fullName} />
              </div>
              <div>
                <label className={lbl(true)}>Date of Birth</label>
                {/* item 1: DatePicker */}
                <DatePicker
                  value={head.dob}
                  onChange={handleDobChange}
                  max={today}
                  placeholder="DD/MM/YYYY"
                  error={!!errors.dob}
                />
                {age !== null && (
                  <p className="text-xs mt-1 text-gray-400">
                    Age: <strong className="text-red-800">{age}</strong> yrs
                    {isUnder18 && <span className="text-amber-600 ml-1">· Under 18</span>}
                  </p>
                )}
                <Ferr msg={errors.dob} />
              </div>
              <div>
                <label className={lbl(true)}>Gender</label>
                <select className={sel(errors.gender)} value={head.gender} onChange={setH('gender')}>
                  <option value="">Select…</option>
                  {GENDER_OPTIONS.map((g) => <option key={g}>{g}</option>)}
                </select>
                <Ferr msg={errors.gender} />
              </div>
              <div>
                <label className={lbl(false)}>Phone</label>
                <input className={inp(errors.phone)} value={head.phone}
                  onChange={setH('phone')} placeholder="10 digits" maxLength={10} />
                <Ferr msg={errors.phone} />
              </div>
              <div>
                <label className={lbl(false)}>Email</label>
                <input type="email" className={inp(false)} value={head.email}
                  onChange={setH('email')} placeholder="email@example.com" />
              </div>
            </div>
          </FormSection>

          {/* Head — Church Details */}
          <FormSection color="green" title="Head Believer — Church Details">
            <div className="grid grid-cols-2 gap-3">

              {/* item 11: Auto memberType */}
              <div className="col-span-2">
                <label className={lbl(false)}>Member Type</label>
                {memberType ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[memberType]}`}>
                      {memberType}
                    </span>
                    <span className="text-xs text-gray-400">(Auto-set from age &amp; marital)</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-400">
                    Enter date of birth to determine type
                  </div>
                )}
              </div>

              <div>
                <label className={lbl(false)}>Membership Status</label>
                <select className={sel(false)} value={head.membershipStatus} onChange={setH('membershipStatus')}>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl(true)}>Baptized</label>
                <select className={sel(errors.baptized)} value={head.baptized} onChange={handleBaptizedChange}>
                  <option value="">Select…</option>
                  {BAPTIZED_OPTIONS.map((b) => <option key={b}>{b}</option>)}
                </select>
                <Ferr msg={errors.baptized} />
              </div>

              {/* item 9: baptizedDate optional */}
              {head.baptized === 'Yes' && (
                <div>
                  <label className={lbl(false)}>
                    Baptized Date <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <DatePicker
                    value={head.baptizedDate}
                    onChange={setHDate('baptizedDate')}
                    max={today}
                    placeholder="DD/MM/YYYY"
                  />
                </div>
              )}

              <div>
                <label className={lbl(false)}>Join Date</label>
                <DatePicker
                  value={head.joinDate}
                  onChange={setHDate('joinDate')}
                  max={today}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>
          </FormSection>

          {/* Head — Occupation */}
          <FormSection color="yellow" title="Head Believer — Occupation">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl(true)}>Occupation Category</label>
                <select
                  className={sel(errors.occupationCategory) + (isUnder6 ? ' opacity-60 cursor-not-allowed' : '')}
                  value={isUnder6 ? 'Child' : head.occupationCategory}
                  onChange={handleOccupationChange}
                  disabled={isUnder6}
                >
                  <option value="">Select…</option>
                  {OCCUPATION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                {isUnder6 && <p className="text-xs text-amber-600 mt-1">Auto-locked to Child (age ≤ 5)</p>}
                <Ferr msg={errors.occupationCategory} />
              </div>
              {head.occupationCategory === 'Student' && (
                <div>
                  <label className={lbl(false)}>Education Level</label>
                  <select className={sel(false)} value={head.educationLevel} onChange={setH('educationLevel')}>
                    <option value="">Select…</option>
                    {EDU_OPTIONS.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>
              )}
            </div>
          </FormSection>

          {/* Head — Marital */}
          {!isUnder18 && (
            <FormSection color="pink" title="Head Believer — Marital Status">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl(true)}>Marital Status</label>
                  <select className={sel(errors.maritalStatus)} value={head.maritalStatus} onChange={handleMaritalChange}>
                    <option value="">Select…</option>
                    {MARITAL_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <Ferr msg={errors.maritalStatus} />
                </div>
                {head.maritalStatus === 'Married' && (
                  <>
                    <div>
                      <label className={lbl(false)}>Wedding Date</label>
                      <DatePicker
                        value={head.weddingDate}
                        onChange={setHDate('weddingDate')}
                        max={today}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                    <div>
                      <label className={lbl(false)}>Spouse Name</label>
                      <input className={inp(false)} value={head.spouseName}
                        onChange={setH('spouseName')} placeholder="Spouse name" />
                    </div>
                  </>
                )}
                {head.maritalStatus === 'Widowed' && (
                  <div>
                    <label className={lbl(false)}>Late Spouse Name</label>
                    <input className={inp(false)} value={head.spouseName}
                      onChange={setH('spouseName')} placeholder="Late spouse name" />
                  </div>
                )}
              </div>
            </FormSection>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 disabled:opacity-50 min-w-[140px] justify-center">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              : <><CheckCircle className="w-4 h-4" /> Create Family</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FAMILY DETAIL PANEL ───────────────────────────────────────────────────────

function FamilyDetail({ family, onClose, onMemberAdded }) {
  const [members,       setMembers]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [deleteMember,  setDeleteMember]  = useState(null);  // item 4
  const [deleting,      setDeleting]      = useState(false);

  // FIX #2: fetch members on mount so they actually load when panel opens
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/families/${family._id}`);
      setMembers(data.data?.members || []);
    } catch (err) {
      toast.error(parseApiError(err));  // item 5
    } finally {
      setLoading(false);
    }
  }, [family._id]);

  // FIX #2: auto-fetch on open
  useEffect(() => { refresh(); }, [refresh]);

  const headMember = members.find((m) => m.isHead);

  // ── item 4: Delete member ────────────────────────────────────────────────
  const handleDeleteMember = async () => {
    if (!deleteMember) return;
    setDeleting(true);
    try {
      await api.delete(`/believers/${deleteMember._id}`);
      toast.success(`${deleteMember.fullName} moved to trash.`);
      setDeleteMember(null);
      refresh();
      onMemberAdded?.();
    } catch (err) {
      toast.error(parseApiError(err));  // item 5
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-white font-bold text-lg">{family.familyCode}</p>
            <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{family.village}
              {family.address && <span className="ml-1 text-gray-500">· {family.address}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-800 text-white text-xs font-semibold rounded-lg hover:bg-red-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Member
            </button>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Members list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-red-800" />
              <p className="text-xs text-gray-400">Loading members…</p>
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No members found.</p>
          ) : (
            members.map((m) => (
              <div
                key={m._id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                  ${m.isHead
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-gray-100 bg-gray-50/40 hover:bg-gray-100/60'}`}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  ${m.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                  {m.fullName?.[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm truncate">{m.fullName}</p>
                    {m.isHead && (
                      <span className="text-[10px] font-bold bg-red-800 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                        HEAD
                      </span>
                    )}
                    <RelBadge m={m} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {m.gender} · {calcAge(m.dob)} yrs · {m.memberType} · {m.membershipStatus}
                    {m.maritalStatus === 'Married' && m.spouseId?.fullName && (
                      <span className="ml-1 text-gray-400">· ♥ {m.spouseId.fullName}</span>
                    )}
                  </p>
                </div>

                {/* Right side */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                    ${m.baptized === 'Yes' ? 'bg-teal-100 text-teal-700' : 'bg-red-50 text-red-500'}`}>
                    {m.baptized === 'Yes' ? '✓ Baptized' : 'Not Baptized'}
                  </span>
                  {m.phone && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />{m.phone}
                    </p>
                  )}
                  {/* item 4: delete button per member */}
                  <button
                    type="button"
                    title={m.isHead ? 'Cannot delete head — assign new head first' : 'Move to Trash'}
                    disabled={m.isHead}
                    onClick={() => !m.isHead && setDeleteMember(m)}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-colors
                      ${m.isHead
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-red-400 hover:text-red-700 hover:bg-red-50'}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    {m.isHead ? 'Head' : 'Remove'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">
            {members.length} member{members.length !== 1 ? 's' : ''} · Status: {family.familyStatus}
          </p>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberModal
          familyId={family._id}
          headMember={headMember}        /* item 10: pass head for weddingDate sync */
          onSuccess={() => {
            setShowAddMember(false);
            refresh();
            onMemberAdded?.();
          }}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {/* item 4: Delete member confirm dialog */}
      {deleteMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-700 px-5 py-4 flex items-center gap-3">
              <UserMinus className="w-5 h-5 text-white" />
              <h3 className="text-white font-bold">Remove Member</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">
                Move <strong>{deleteMember.fullName}</strong> to trash?
                They can be restored from the Trash page.
              </p>
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => setDeleteMember(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="button"
                  onClick={handleDeleteMember}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50">
                  {deleting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                  Move to Trash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function FamilyManagement() {
  const [families,     setFamilies]     = useState([]);
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [viewFamily,   setViewFamily]   = useState(null);
  const [editFamily,   setEditFamily] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [districts, setDistricts] = useState([]);

  // Fetch districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const { data } = await api.get('/families/districts');
        setDistricts(data.data || []);
      } catch (err) {
        console.error('Failed to fetch districts:', err);
        // Fallback to hardcoded list if API fails
        setDistricts(['Salem', 'Chennai', 'Coimbatore', 'Madurai']);
      }
    };
    fetchDistricts();
  }, []);

  const fetchFamilies = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter)  params.append('status', statusFilter);
      if (districtFilter) params.append('district', districtFilter);  
      const { data } = await api.get(`/families?${params}`);
      setFamilies(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(parseApiError(err));  // item 5
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchFamilies(1); }, [statusFilter, districtFilter]);

  const handleSearch   = (e) => { e.preventDefault(); fetchFamilies(1); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/families/${deleteTarget._id}`);
      toast.success(`Family ${deleteTarget.familyCode} deleted.`);
      setDeleteTarget(null);
      fetchFamilies(pagination.page);
    } catch (err) {
      toast.error(parseApiError(err));  // item 5
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Family Management</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {pagination.total} famil{pagination.total !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => fetchFamilies(pagination.page)}
            className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button type="button" onClick={() => setShowCreate(true)}
            className="btn-primary">
            <Plus className="w-4 h-4" /> Add Family
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="card !p-3 flex flex-wrap gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
              placeholder="Search code, head name, village…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30 bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
          {/* NEW: District filter */}
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30 bg-white"
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
        >
          <option value="">All Districts</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-800" />
          </div>
        ) : families.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">No families found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-900 text-white">
                <tr>
                  {['Family Code','Head Name','District','Village','Members','Active','Status','Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {families.map((fam, i) => (
                  <tr key={fam._id}
                    className={`hover:bg-red-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 font-bold text-red-800">{fam.familyCode}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-800 flex-shrink-0">
                          {fam.headId?.fullName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{fam.headId?.fullName || '—'}</p>
                          {fam.headId?.phone && <p className="text-xs text-gray-400">{fam.headId.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{fam.district}</td>
                    <td className="px-4 py-3 text-gray-600">{fam.village}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">{fam.totalMembers}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {fam.activeCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${fam.familyStatus === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'}`}>
                        {fam.familyStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* View button */}
                        <button type="button" onClick={() => setViewFamily(fam)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View members">
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* NEW: Edit button */}
                        <button type="button" onClick={() => setEditFamily(fam)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          title="Edit family details">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        {/* Delete button */}
                        <button type="button" onClick={() => setDeleteTarget(fam)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete family">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button type="button"
              onClick={() => fetchFamilies(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="btn-secondary text-sm disabled:opacity-40">
              Previous
            </button>
            <button type="button"
              onClick={() => fetchFamilies(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="btn-secondary text-sm disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateFamilyModal
          districts={districts}
          onSuccess={() => { setShowCreate(false); fetchFamilies(1); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit Family Modal */}
      {editFamily && (
        <EditFamilyModal
          family={editFamily}
          districts={districts}
          onSuccess={() => {
            setEditFamily(null);
            fetchFamilies(pagination.page);
          }}
          onClose={() => setEditFamily(null)}
        />
      )}

      {viewFamily && (
        <FamilyDetail
          family={viewFamily}
          onClose={() => setViewFamily(null)}
          onMemberAdded={() => fetchFamilies(pagination.page)}
        />
      )}

      {/* Delete Family confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-800 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-white" />
              <h3 className="text-white font-bold">Delete Family</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                Delete <strong>{deleteTarget.familyCode}</strong>? This will soft-delete all{' '}
                <strong>{deleteTarget.totalMembers}</strong> member{deleteTarget.totalMembers !== 1 ? 's' : ''} too.
                They can be restored from Trash.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 disabled:opacity-50 text-sm">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}