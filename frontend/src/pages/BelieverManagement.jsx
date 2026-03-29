/**
 * BelieverManagement.jsx
 * Changes:
 *  - "View" action button: full detail card modal for each believer
 *  - Relation column shows head name like "Son of Samuel Raj" (marital-style display)
 *  - DOB is optional in Edit modal
 **/

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Filter, Edit2, Trash2, Eye, X, ChevronUp, ChevronDown,
  ChevronsUpDown, Loader2, RefreshCw, User, Users, ArrowUpDown,
  AlertTriangle, CheckCircle, Info, Phone, Mail, MapPin,
  Calendar, Droplets, Heart, Briefcase, GraduationCap, UserCheck,
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDate, calcAge } from '../utils/helpers';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GENDER_OPTIONS        = ['Male', 'Female', 'Other'];
const MEMBER_TYPE_OPTIONS   = ['Member', 'Youth', 'Child'];
const MEMBER_STATUS_OPTIONS = ['Active', 'Inactive', 'Deceased', 'Transferred'];
const MARITAL_OPTIONS       = ['Single', 'Married', 'Widowed'];
const BAPTIZED_OPTIONS      = ['Yes', 'No'];
const EDUCATION_OPTIONS     = ['School', 'College'];
const OCCUPATION_OPTIONS    = [
  'Ministry','Employed','Self-Employed','Business','Agriculture','Daily wages','House-Wife',
  'Student','Retired','Non-Worker','Child',
];
const EDITABLE_FIELDS = [
  'fullName','tamilName','dob','gender','phone','email',
  'memberType','membershipStatus','joinDate','baptized','baptizedDate',
  'maritalStatus','weddingDate','spouseId','spouseName',
  'occupationCategory','educationLevel',
];

// ─── BADGE HELPERS ────────────────────────────────────────────────────────────
const TypeBadge = ({ type }) => {
  const cls = {
    Member:   'bg-blue-100 text-blue-800',
    Youth:    'bg-purple-100 text-purple-800',
    Child:    'bg-yellow-100 text-yellow-700',
    Deceased: 'bg-gray-200 text-gray-600',
  }[type] || 'bg-gray-100 text-gray-600';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{type || '—'}</span>;
};

const StatusBadge = ({ status }) => (
  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
    status === 'Active'       ? 'bg-green-100 text-green-700'
    : status === 'Inactive'  ? 'bg-red-100 text-red-700'
    : status === 'Deceased'  ? 'bg-gray-200 text-gray-700'
    : status === 'Transferred' ? 'bg-yellow-100 text-yellow-700'
    : 'bg-gray-100 text-gray-600'
  }`}>{status}</span>
);

const BapBadge = ({ val }) => (
  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
    val === 'Yes' ? 'bg-teal-100 text-teal-700' : 'bg-red-50 text-red-600'
  }`}>{val === 'Yes' ? '✓ Yes' : '✗ No'}</span>
);

// ─── SORT ARROW ───────────────────────────────────────────────────────────────
const SortArrow = ({ field, sortBy, sortDir }) => {
  if (sortBy !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 ml-1 flex-shrink-0" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3.5 h-3.5 text-red-800 ml-1 flex-shrink-0" />
    : <ChevronDown className="w-3.5 h-3.5 text-red-800 ml-1 flex-shrink-0" />;
};

// ─── RELATION DISPLAY HELPER ──────────────────────────────────────────────────
// Returns e.g. "Son of Samuel Raj" or "Self (Head)"
const buildRelationLabel = (b) => {
  if (b.isHead) return 'Self (Head)';
  const rel = b.relationshipToHead === 'Other' && b.relationCustom
    ? b.relationCustom : b.relationshipToHead;
  if (!rel) return '—';
  // We need the head name — it's on the familyId if populated
  const headName = b.familyId?.headId?.fullName || null;
  if (headName && rel !== 'Self') return `${rel} of ${headName}`;
  return rel;
};

// Compact version for table column (no head name, just relation)
const relLabel = (b) => {
  if (b.isHead) return 'Self';
  return b.relationshipToHead === 'Other' && b.relationCustom
    ? b.relationCustom : b.relationshipToHead || '—';
};

// ─── VIEW MODAL (full believer detail) ───────────────────────────────────────
function ViewModal({ believerId, onClose }) {
  const [believer, setBeliever] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get(`/believers/${believerId}`)
      .then(({ data }) => setBeliever(data.data))
      .catch(() => toast.error('Failed to load believer details'))
      .finally(() => setLoading(false));
  }, [believerId]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Gender avatar colour
  const avatarCls = believer?.gender === 'Female'
    ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700';

  const InfoRow = ({ icon: Icon, label, value, badge }) => {
    if (!value && !badge) return null;
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
          {badge
            ? <div>{badge}</div>
            : <p className="text-sm text-gray-800 font-medium">{value}</p>
          }
        </div>
      </div>
    );
  };

  const Section = ({ title, children, color = 'gray' }) => (
    <div className={`bg-${color}-50/40 rounded-xl p-4 space-y-0.5 border border-${color}-100/60`}>
      <p className={`text-xs font-bold text-${color}-600 uppercase tracking-wide mb-2`}>{title}</p>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-red-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-red-200" />
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">Believer Detail</h3>
              <p className="text-red-200 text-xs mt-0.5">Full profile view</p>
            </div>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : !believer ? (
          <div className="p-8 text-center text-gray-400">Could not load believer details.</div>
        ) : (
          <div className="overflow-y-auto flex-1 p-5 space-y-4">

            {/* ── Profile Hero ── */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${avatarCls}`}>
                {believer.fullName?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xl font-bold text-gray-800 leading-tight">{believer.fullName}</h4>
                  {believer.isHead && (
                    <span className="text-xs font-bold bg-red-800 text-white px-2 py-0.5 rounded-full">HEAD</span>
                  )}
                </div>
                {believer.tamilName && (
                  <p className="text-sm text-gray-500 mt-0.5">{believer.tamilName}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={believer.membershipStatus} />
                  <TypeBadge type={believer.memberType} />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    believer.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                  }`}>{believer.gender}</span>
                </div>
              </div>
            </div>

            {/* ── Relation & Family ── */}
            <Section title="Family & Relation" color="red">
              <InfoRow icon={Users}    label="Family Code" value={believer.familyId?.familyCode || '—'} />
              <InfoRow icon={MapPin}   label="Village"     value={believer.familyId?.village || '—'} />
              <InfoRow icon={User}     label="Relationship to Head"
                value={
                  believer.isHead ? 'Self (Head)' :
                  believer.relationshipToHead === 'Other' && believer.relationCustom
                    ? `Other — ${believer.relationCustom}`
                    : believer.relationshipToHead || '—'
                }
              />
              {believer.joinDate && <InfoRow icon={Calendar} label="Join Date" value={formatDate(believer.joinDate)} />}
            </Section>

            {/* ── Personal Info ── */}
            <Section title="Personal Information" color="blue">
              <InfoRow icon={Calendar}
                label="Date of Birth"
                value={believer.dob
                  ? `${formatDate(believer.dob)} (Age: ${calcAge(believer.dob)} yrs)`
                  : '—'
                }
              />
              {believer.phone && <InfoRow icon={Phone}  label="Phone" value={believer.phone} />}
              {believer.email && <InfoRow icon={Mail}   label="Email" value={believer.email} />}
            </Section>

            {/* ── Church Details ── */}
            <Section title="Church Details" color="green">
              <InfoRow icon={Droplets}   label="Baptized"    badge={<BapBadge val={believer.baptized} />} />
              {believer.baptized === 'Yes' && believer.baptizedDate && (
                <InfoRow icon={Calendar} label="Baptized Date" value={formatDate(believer.baptizedDate)} />
              )}
            </Section>

            {/* ── Marital ── */}
            {believer.maritalStatus && (
              <Section title="Marital Status" color="pink">
                <InfoRow icon={Heart} label="Marital Status" value={believer.maritalStatus} />
                {believer.weddingDate && (
                  <InfoRow icon={Calendar} label="Wedding Date" value={formatDate(believer.weddingDate)} />
                )}
                {(believer.spouseId || believer.spouseName) && (
                  <InfoRow
                    icon={User}
                    label="Spouse"
                    value={
                      (typeof believer.spouseId === 'object' ? believer.spouseId?.fullName : null)
                      || believer.spouseName || '—'
                    }
                  />
                )}
              </Section>
            )}

            {/* ── Occupation ── */}
            <Section title="Occupation" color="yellow">
              <InfoRow icon={Briefcase}       label="Occupation"      value={believer.occupationCategory || '—'} />
              {believer.educationLevel && (
                <InfoRow icon={GraduationCap} label="Education Level" value={believer.educationLevel} />
              )}
            </Section>

            {/* ── Timestamps ── */}
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-500 mb-1">Created</p>
                <p>{believer.createdAt ? formatDate(believer.createdAt) : '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-500 mb-1">Last Updated</p>
                <p>{believer.updatedAt ? formatDate(believer.updatedAt) : '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end bg-gray-50 flex-shrink-0">
          <button onClick={onClose}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM DELETE DIALOG ────────────────────────────────────────────────────
function DeleteConfirm({ believer, familyMembers, onConfirm, onCancel, loading }) {
  const [newHeadId, setNewHeadId] = useState('');
  const needsHeadReassign = believer?.isHead;
  const candidates = familyMembers.filter((m) => m._id !== believer?._id && !m.isDeleted);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`px-6 py-4 flex items-center gap-3 ${needsHeadReassign ? 'bg-amber-600' : 'bg-red-800'}`}>
          <AlertTriangle className="w-5 h-5 text-white" />
          <h3 className="text-white font-bold">{needsHeadReassign ? 'Assign New Head First' : 'Move to Trash'}</h3>
        </div>
        <div className="p-6 space-y-4">
          {needsHeadReassign ? (
            <>
              <p className="text-sm text-gray-700">
                <strong>{believer?.fullName}</strong> is the Family Head. Please assign a new head before deleting.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select New Head *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30"
                  value={newHeadId}
                  onChange={(e) => setNewHeadId(e.target.value)}
                >
                  <option value="">Choose a member…</option>
                  {candidates.map((m) => (
                    <option key={m._id} value={m._id}>{m.fullName} ({m.relationshipToHead})</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-700">
              Move <strong>{believer?.fullName}</strong> to trash? You can restore them later.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button
              onClick={() => onConfirm(needsHeadReassign ? newHeadId : null)}
              disabled={loading || (needsHeadReassign && !newHeadId)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white font-semibold rounded-lg transition-colors disabled:opacity-50
                ${needsHeadReassign ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-700 hover:bg-red-800'}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {needsHeadReassign ? 'Assign & Delete' : 'Move to Trash'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({ believer, familyMembers, onSave, onClose }) {
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!believer) return;
    setForm({
      fullName:           believer.fullName || '',
      tamilName:          believer.tamilName || '',
      dob:                believer.dob ? believer.dob.split('T')[0] : '',
      gender:             believer.gender || '',
      phone:              believer.phone || '',
      email:              believer.email || '',
      memberType:         believer.memberType || '',
      membershipStatus:   believer.membershipStatus || 'Active',
      joinDate:           believer.joinDate ? believer.joinDate.split('T')[0] : '',
      baptized:           believer.baptized || '',
      baptizedDate:       believer.baptizedDate ? believer.baptizedDate.split('T')[0] : '',
      maritalStatus:      believer.maritalStatus || '',
      weddingDate:        believer.weddingDate ? believer.weddingDate.split('T')[0] : '',
      spouseId:           (typeof believer.spouseId === 'object' ? believer.spouseId?._id : believer.spouseId) || '',
      spouseName:         believer.spouseName || (typeof believer.spouseId === 'object' ? believer.spouseId?.fullName : '') || '',
      occupationCategory: believer.occupationCategory || '',
      educationLevel:     believer.educationLevel || '',
    });
  }, [believer]);

  const age       = useMemo(() => (form.dob ? calcAge(form.dob) : null), [form.dob]);
  const isUnder18 = age !== null && age < 18;
  const isUnder6  = age !== null && age <= 5;

  useEffect(() => { if (isUnder18) setForm((f) => ({ ...f, maritalStatus: 'Single', spouseId: '', weddingDate: '' })); }, [isUnder18]);
  useEffect(() => { if (isUnder6)  setForm((f) => ({ ...f, occupationCategory: 'Child' })); }, [isUnder6]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const spouseCandidates = (familyMembers || []).filter(
    (m) => m._id !== believer?._id && !m.isDeleted && m.maritalStatus !== 'Single'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      EDITABLE_FIELDS.forEach((key) => {
        if (form[key] === undefined) return;
        if (key === 'spouseId')       payload[key] = form[key] === '' ? null : form[key];
        else if (key === 'educationLevel') { if (form[key] !== '') payload[key] = form[key]; }
        else if (key === 'weddingDate')    { if (form[key] !== '') payload[key] = form[key]; }
        else payload[key] = form[key];
      });
      await api.put(`/believers/${believer._id}`, payload);
      toast.success('Believer updated successfully!');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (!believer) return null;

  const inp  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800 transition-colors bg-white';
  const sel  = inp + ' cursor-pointer';
  const lbl  = 'block text-xs font-semibold text-gray-600 mb-1';
  const ro   = 'w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed';
  const sect = (c) => `bg-${c}-50/40 rounded-xl p-4 space-y-3 border border-${c}-100`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-red-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Edit Believer</h3>
            <p className="text-red-200 text-xs mt-0.5">{believer.fullName}</p>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Read-only relationship */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Relationship Details — Read Only
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Family</label>
                <div className={ro}>{believer.familyId?.familyCode || '—'}{believer.familyId?.village ? ` · ${believer.familyId.village}` : ''}</div>
              </div>
              <div>
                <label className={lbl}>Relationship to Head</label>
                <div className={ro}>
                  {believer.relationshipToHead === 'Other' && believer.relationCustom
                    ? `Other (${believer.relationCustom})` : believer.relationshipToHead || '—'}
                </div>
              </div>
              <div>
                <label className={lbl}>Role in Family</label>
                <div className={ro}>
                  {believer.isHead
                    ? <span className="inline-flex items-center gap-1 text-red-800 font-semibold"><Users className="w-3.5 h-3.5" /> Family Head</span>
                    : 'Member'}
                </div>
              </div>
              <div>
                <label className={lbl}>Joined</label>
                <div className={ro}>{believer.joinDate ? formatDate(believer.joinDate) : '—'}</div>
              </div>
            </div>
          </div>

          {/* Personal */}
          <div className={sect('blue')}>
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Personal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Full Name *</label>
                <input className={inp} value={form.fullName || ''} onChange={set('fullName')} required />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Tamil Name</label>
                <input className={inp} value={form.tamilName || ''} onChange={set('tamilName')} />
              </div>
              <div>
                {/* DOB — OPTIONAL */}
                <label className={lbl}>
                  Date of Birth <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input type="date" className={inp} value={form.dob || ''} onChange={set('dob')}
                  max={new Date().toISOString().split('T')[0]} />
                {age !== null
                  ? <p className="text-xs mt-1 text-gray-400">Age: <strong className="text-red-800">{age}</strong> yrs{isUnder18 && <span className="text-amber-600 ml-2">· Under 18</span>}</p>
                  : <p className="text-xs mt-1 text-gray-400">Age shown when DOB is provided</p>
                }
              </div>
              <div>
                <label className={lbl}>Gender *</label>
                <select className={sel} value={form.gender || ''} onChange={set('gender')} required>
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Phone</label>
                <input className={inp} value={form.phone || ''} onChange={set('phone')} placeholder="10 digits" maxLength={10} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" className={inp} value={form.email || ''} onChange={set('email')} />
              </div>
            </div>
          </div>

          {/* Church */}
          <div className={sect('green')}>
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Church Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Member Type *</label>
                <select className={sel} value={form.memberType || ''} onChange={set('memberType')} required>
                  <option value="">Select</option>
                  {MEMBER_TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Membership Status</label>
                <select className={sel} value={form.membershipStatus || 'Active'} onChange={set('membershipStatus')}>
                  {MEMBER_STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Baptized *</label>
                <select className={sel} value={form.baptized || ''} onChange={(e) => setForm((f) => ({ ...f, baptized: e.target.value, baptizedDate: e.target.value === 'No' ? '' : f.baptizedDate }))} required>
                  <option value="">Select</option>
                  {BAPTIZED_OPTIONS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              {form.baptized === 'Yes' && (
                <div>
                  <label className={lbl}>Baptized Date</label>
                  <input type="date" className={inp} value={form.baptizedDate || ''} onChange={set('baptizedDate')} max={new Date().toISOString().split('T')[0]} />
                </div>
              )}
              <div>
                <label className={lbl}>Join Date</label>
                <input type="date" className={inp} value={form.joinDate || ''} onChange={set('joinDate')} max={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          </div>

          {/* Occupation */}
          <div className={sect('yellow')}>
            <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Occupation</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Occupation Category *</label>
                <select className={sel + (isUnder6 ? ' opacity-60 cursor-not-allowed' : '')}
                  value={form.occupationCategory || ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, occupationCategory: v, educationLevel: v !== 'Student' ? '' : f.educationLevel })); }} disabled={isUnder6} required>
                  <option value="">Select</option>
                  {OCCUPATION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                {isUnder6 && <p className="text-xs text-amber-600 mt-1">Auto-locked to "Child" (age ≤ 5)</p>}
              </div>
              {form.occupationCategory === 'Student' && (
                <div>
                  <label className={lbl}>Education Level</label>
                  <select className={sel} value={form.educationLevel || ''} onChange={set('educationLevel')}>
                    <option value="">Select</option>
                    {EDUCATION_OPTIONS.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Marital */}
          {!isUnder18 && (
            <div className={sect('pink')}>
              <p className="text-xs font-bold text-pink-700 uppercase tracking-wide">Marital Status</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Marital Status *</label>
                  <select className={sel} value={form.maritalStatus || ''} onChange={set('maritalStatus')} required>
                    <option value="">Select</option>
                    {MARITAL_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                {form.maritalStatus === 'Married' && (
                  <>
                    <div>
                      <label className={lbl}>Wedding Date</label>
                      <input type="date" className={inp} value={form.weddingDate || ''} onChange={set('weddingDate')} max={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label className={lbl}>Spouse Name (text)</label>
                      <input className={inp} value={form.spouseName || ''} onChange={set('spouseName')} placeholder="Spouse full name" />
                    </div>
                    {spouseCandidates.length > 0 && (
                      <div>
                        <label className={lbl}>Link Spouse <span className="text-gray-400 font-normal ml-1">(same family)</span></label>
                        <select className={sel} value={form.spouseId || ''} onChange={set('spouseId')}>
                          <option value="">None / Not in family</option>
                          {spouseCandidates.map((m) => <option key={m._id} value={m._id}>{m.fullName} · {m.relationshipToHead}</option>)}
                        </select>
                        {form.spouseId && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Spouse linked</p>}
                      </div>
                    )}
                  </>
                )}
                {form.maritalStatus === 'Widowed' && (
                  <div>
                    <label className={lbl}>Late Spouse Name</label>
                    <input className={inp} value={form.spouseName || ''} onChange={set('spouseName')} placeholder="Late spouse name" />
                  </div>
                )}
              </div>
            </div>
          )}

          {isUnder18 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700 font-medium">👶 Age under 18 — marital status auto-set to <strong>Single</strong>. Marriage fields hidden.</p>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-gray-50">
          <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function BelieverManagement() {
  const [filters, setFilters] = useState({
    search: '', membershipStatus: '', memberType: '', gender: '',
    maritalStatus: '', baptized: '', occupationCategory: '', village: '',
  });
  const [showFilters,   setShowFilters]   = useState(false);
  const [sortBy,        setSortBy]        = useState('name');
  const [sortDir,       setSortDir]       = useState('asc');
  const [believers,     setBelievers]     = useState([]);
  const [pagination,    setPagination]    = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,       setLoading]       = useState(false);
  const [viewBelieverId,  setViewBelieverId]  = useState(null);
  const [editBeliever,    setEditBeliever]    = useState(null);
  const [deleteBeliever,  setDeleteBeliever]  = useState(null);
  const [familyMembers,   setFamilyMembers]   = useState([]);
  const [actionLoading,   setActionLoading]   = useState(false);

  const fetchBelievers = useCallback(async (page = 1, overrideSort) => {
    setLoading(true);
    try {
      const by  = overrideSort?.sortBy  ?? sortBy;
      const dir = overrideSort?.sortDir ?? sortDir;
      const params = new URLSearchParams({ page, limit: 20, sortBy: by, sortDir: dir });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const { data } = await api.get(`/believers?${params}`);
      setBelievers(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load believers.'); }
    finally  { setLoading(false); }
  }, [filters, sortBy, sortDir]);

  useEffect(() => { fetchBelievers(1); }, []);
  useEffect(() => { fetchBelievers(1); }, [filters]); // eslint-disable-line

  const handleSort = (field) => {
    const newDir = sortBy === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortBy(field); setSortDir(newDir);
    fetchBelievers(pagination.page, { sortBy: field, sortDir: newDir });
  };

  const openEdit = async (b) => {
    setEditBeliever(b);
    try { const { data } = await api.get(`/families/${b.familyId?._id || b.familyId}`); setFamilyMembers(data.data?.members || []); }
    catch { setFamilyMembers([]); }
  };

  const openDelete = async (b) => {
    setDeleteBeliever(b);
    if (b.isHead) {
      try { const { data } = await api.get(`/families/${b.familyId?._id || b.familyId}`); setFamilyMembers(data.data?.members || []); }
      catch { setFamilyMembers([]); }
    }
  };

  const handleDelete = async (newHeadId) => {
    setActionLoading(true);
    try {
      if (newHeadId) {
        await api.put(`/families/${deleteBeliever.familyId?._id || deleteBeliever.familyId}/assign-head`, { newHeadId });
        toast.success('New head assigned.');
      }
      await api.delete(`/believers/${deleteBeliever._id}`);
      toast.success(`${deleteBeliever.fullName} moved to trash.`);
      setDeleteBeliever(null);
      fetchBelievers(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally { setActionLoading(false); }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const SortTh = ({ field, label, className = '' }) => (
    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group ${className}`}
      onClick={() => handleSort(field)}>
      <span className="flex items-center gap-1 group-hover:text-red-200 transition-colors">
        {label}<SortArrow field={field} sortBy={sortBy} sortDir={sortDir} />
      </span>
    </th>
  );

  const selCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800 bg-white';

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Believer Management</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {pagination.total} believer{pagination.total !== 1 ? 's' : ''} · sorted by{' '}
            <strong className="text-red-800">{sortBy === 'age' ? 'Age' : 'Name'}</strong>{' '}
            ({sortDir === 'asc' ? '↑ A–Z / Oldest' : '↓ Z–A / Youngest'})
          </p>
        </div>
        <button onClick={() => fetchBelievers(pagination.page)} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search + Filters */}
      <div className="card !p-3 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); fetchBelievers(1); }} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-800/30 focus:border-red-800"
              placeholder="Search by name…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            {filters.search && (
              <button type="button" onClick={() => setFilters({ ...filters, search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary">Search</button>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary relative ${showFilters ? 'ring-2 ring-red-800/30' : ''}`}>
            <Filter className="w-4 h-4" /> Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={() => setFilters({ search:'',membershipStatus:'',memberType:'',gender:'',maritalStatus:'',baptized:'',occupationCategory:'',village:'' })} className="btn-secondary text-red-700">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </form>

        {/* Sort buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
          </span>
          {[
            { field: 'name', asc: 'Name A–Z',         desc: 'Name Z–A' },
            { field: 'age',  asc: 'Age: Oldest first', desc: 'Age: Youngest first' },
          ].map(({ field, asc, desc }) => (
            <button key={field} onClick={() => handleSort(field)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5
                ${sortBy === field ? 'bg-red-800 text-white border-red-800 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-800'}`}>
              {sortBy === field ? (sortDir === 'asc' ? asc : desc) : asc}
              {sortBy === field
                ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
            </button>
          ))}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
            {[
              { label: 'Status',     key: 'membershipStatus', opts: MEMBER_STATUS_OPTIONS },
              { label: 'Type',       key: 'memberType',       opts: MEMBER_TYPE_OPTIONS },
              { label: 'Gender',     key: 'gender',           opts: GENDER_OPTIONS },
              { label: 'Marital',    key: 'maritalStatus',    opts: MARITAL_OPTIONS },
              { label: 'Baptized',   key: 'baptized',         opts: BAPTIZED_OPTIONS },
              { label: 'Occupation', key: 'occupationCategory', opts: OCCUPATION_OPTIONS },
            ].map(({ label, key, opts }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                <select className={selCls + ' w-full'} value={filters[key]}
                  onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}>
                  <option value="">All</option>
                  {opts.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Village</label>
              <input className={selCls + ' w-full'} placeholder="Filter by village"
                value={filters.village} onChange={(e) => setFilters({ ...filters, village: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-800" />
          </div>
        ) : believers.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">No believers found</p>
            <p className="text-gray-300 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead className="bg-red-900 text-white">
                <tr>
                  <SortTh field="name" label="Name"       className="pl-5" />
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Family</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Relation</th>
                  <SortTh field="age"  label="Age / DOB" />
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Marital</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Baptized</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Occupation</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {believers.map((b, i) => {
                  const spouseDisplay =
                    (typeof b.spouseId === 'object' ? b.spouseId?.fullName : null) || b.spouseName || null;

                  // ── Relation column: "Son of [HeadName]" style ──
                  const rawRel = relLabel(b);
                  // We need head name — populate from familyId if available
                  // The API returns familyId populated with familyCode, village, address
                  // Head name isn't in list response; show relation only, head name shown in View modal
                  const relationDisplay = b.isHead
                    ? <span className="text-xs font-semibold text-red-700">Self</span>
                    : (
                      <div>
                        <p className="text-xs text-gray-700 font-medium">{rawRel}</p>
                      </div>
                    );

                  return (
                    <tr key={b._id} className={`hover:bg-red-50/40 transition-colors ${i % 2 === 1 ? 'bg-red-50/10' : ''}`}>
                      {/* Name */}
                      <td className="px-5 py-3">
                        <div className="flex items-start gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5
                            ${b.gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                            {b.fullName?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 leading-tight">{b.fullName}</p>
                            {b.tamilName && <p className="text-[10px] text-gray-400 leading-tight">{b.tamilName}</p>}
                            {b.isHead && <span className="text-[10px] font-bold text-red-800 bg-red-100 px-1.5 py-0.5 rounded-full">HEAD</span>}
                          </div>
                        </div>
                      </td>
                      {/* Family */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-700">{b.familyId?.familyCode || '—'}</p>
                        <p className="text-xs text-gray-400">{b.familyId?.village || '—'}</p>
                      </td>
                      {/* Relation — shows relation label; head name visible in View modal */}
                      <td className="px-4 py-3">{relationDisplay}</td>
                      {/* Age/DOB */}
                      <td className="px-4 py-3">
                        {b.dob
                          ? <><p className="text-sm font-semibold text-gray-700">{calcAge(b.dob)} yrs</p><p className="text-xs text-gray-400">{formatDate(b.dob)}</p></>
                          : <p className="text-xs text-gray-400">—</p>
                        }
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={b.memberType} /></td>
                      {/* Marital */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{b.maritalStatus || '—'}</p>
                        {spouseDisplay && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[100px]" title={spouseDisplay}>
                            ♥ {spouseDisplay}
                          </p>
                        )}
                        {b.maritalStatus === 'Married' && b.weddingDate && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(b.weddingDate)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3"><BapBadge val={b.baptized} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{b.occupationCategory || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{b.phone || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.membershipStatus} /></td>
                      {/* Actions — View, Edit, Delete */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setViewBelieverId(b._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(b)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => openDelete(b)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</p>
          <div className="flex gap-2">
            <button onClick={() => fetchBelievers(pagination.page - 1)} disabled={pagination.page <= 1 || loading} className="btn-secondary text-sm disabled:opacity-40">Previous</button>
            <button onClick={() => fetchBelievers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || loading} className="btn-secondary text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewBelieverId && (
        <ViewModal believerId={viewBelieverId} onClose={() => setViewBelieverId(null)} />
      )}

      {/* Edit Modal */}
      {editBeliever && (
        <EditModal
          believer={editBeliever}
          familyMembers={familyMembers}
          onSave={() => { setEditBeliever(null); fetchBelievers(pagination.page); }}
          onClose={() => setEditBeliever(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteBeliever && (
        <DeleteConfirm
          believer={deleteBeliever}
          familyMembers={familyMembers}
          onConfirm={handleDelete}
          onCancel={() => setDeleteBeliever(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
