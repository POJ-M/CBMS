import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, UserCheck, Heart, BookOpen, Baby, Briefcase,
  Droplets, Cake, CalendarHeart, TrendingUp, RefreshCw, Church,
  X, Loader2, ShieldOff
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDate, calcAge } from '../utils/helpers';

// ─── GENDER COLOR HELPERS ─────────────────────────────────────────────────────
const genderRowCls = (gender, isInactive) => {
  if (isInactive) return 'bg-gray-50/80';
  if (gender === 'Female') return 'bg-pink-50/60';
  if (gender === 'Male')   return 'bg-blue-50/40';
  return '';
};
const genderDotCls = (gender, isInactive) => {
  if (isInactive) return 'w-2 h-2 rounded-full bg-gray-300 inline-block flex-shrink-0';
  if (gender === 'Female') return 'w-2 h-2 rounded-full bg-pink-400 inline-block flex-shrink-0';
  if (gender === 'Male')   return 'w-2 h-2 rounded-full bg-blue-400 inline-block flex-shrink-0';
  return 'w-2 h-2 rounded-full bg-gray-300 inline-block flex-shrink-0';
};
const InactiveBadge = () => (
  <span className="ml-1.5 text-[9px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
    Inactive
  </span>
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, onClick, sub }) => (
  <div
    className={`stat-card flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-150 active:scale-[0.98]' : ''}`}
    onClick={onClick}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    {onClick && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">View</span>}
  </div>
);

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function DetailModal({ title, icon: Icon, color, onClose, loading, children, count }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className={`${color} px-6 py-4 flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-white" />
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
              {count != null && !loading && (
                <p className="text-white/70 text-xs mt-0.5">{count} record{count !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading
            ? <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
            : children
          }
        </div>
      </div>
    </div>
  );
}

// ─── GENDER LEGEND ────────────────────────────────────────────────────────────
const GenderLegend = () => (
  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-5 text-xs text-gray-500 flex-wrap">
    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Male (Active)</span>
    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />Female (Active)</span>
    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Inactive / Other</span>
  </div>
);

// ─── MODAL TABLE ──────────────────────────────────────────────────────────────
function ModalTable({ headers, rows, emptyMsg = 'No records found.' }) {
  if (!rows || rows.length === 0)
    return <div className="text-center py-16 text-gray-400 font-medium">{emptyMsg}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[520px]">
        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">{rows}</tbody>
      </table>
    </div>
  );
}

// ─── FETCH ALL PAGES (fixes >100 record limit) ───────────────────────────────
async function fetchAllBelievers(params = {}) {
  const PAGE_SIZE = 100;
  let page = 1;
  let all = [];
  while (true) {
    const p = new URLSearchParams({ page, limit: PAGE_SIZE, ...params });
    const { data } = await api.get(`/believers?${p}`);
    all = all.concat(data.data || []);
    if (page >= (data.pagination?.totalPages || 1)) break;
    page++;
  }
  return all;
}

// ─── FAMILIES MODAL ───────────────────────────────────────────────────────────
function FamiliesModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // families can be fetched with large limit since there's no 100-record issue in that endpoint
    api.get('/families?limit=500')
      .then(({ data: res }) => {
        const sorted = [...(res.data || [])].sort((a, b) => (a.familyCode || '').localeCompare(b.familyCode || ''));
        setData(sorted);
      })
      .catch(() => toast.error('Failed to load families'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((f, i) => (
    <tr key={f._id} className={i % 2 === 1 ? 'bg-gray-50/40 hover:bg-gray-100/60' : 'hover:bg-gray-50/60'}>
      <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
      <td className="px-4 py-2.5 font-bold text-red-800 text-xs">{f.familyCode}</td>
      <td className="px-4 py-2.5 font-medium text-gray-800">{f.headId?.fullName || '—'}</td>
      <td className="px-4 py-2.5 text-gray-600 text-xs">{f.village || '—'}</td>
      <td className="px-4 py-2.5 text-center">
        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{f.activeCount ?? '—'}</span>
      </td>
    </tr>
  ));

  return (
    <DetailModal title="Total Families" icon={Users} color="bg-red-800" onClose={onClose} loading={loading} count={data.length}>
      <ModalTable headers={['S.No', 'Family Code', 'Head Name', 'Village', 'Active Members']} rows={rows} emptyMsg="No families found." />
    </DetailModal>
  );
}

// ─── BELIEVERS MODAL (reusable) ───────────────────────────────────────────────
function BelieversModal({ title, fetchParams, icon, color, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAllBelievers(fetchParams)
      .then((all) => { all.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')); setData(all); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    const isInactive = b.membershipStatus !== 'Active';
    const rel = b.relationshipToHead === 'Other' && b.relationCustom ? b.relationCustom : b.relationshipToHead || '—';
    return (
      <tr key={b._id} className={`${genderRowCls(b.gender, isInactive)} transition-colors`}>
        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={genderDotCls(b.gender, isInactive)} />
            <span className={`font-medium ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>{b.fullName}</span>
            {isInactive && <InactiveBadge />}
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{rel}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.phone || '—'}</td>
      </tr>
    );
  });

  return (
    <DetailModal title={title} icon={icon} color={color} onClose={onClose} loading={loading} count={data.length}>
      <GenderLegend />
      <ModalTable headers={['S.No', 'Name', 'Age', 'Relation', 'Village', 'Phone']} rows={rows} emptyMsg="No records found." />
    </DetailModal>
  );
}

// ─── YOUTH MODAL ──────────────────────────────────────────────────────────────
function YouthModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAllBelievers({ memberType: 'Youth' })
      .then((all) => { all.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')); setData(all); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    const isInactive = b.membershipStatus !== 'Active';
    const rel = b.relationshipToHead === 'Other' && b.relationCustom ? b.relationCustom : b.relationshipToHead || '—';
    return (
      <tr key={b._id} className={`${genderRowCls(b.gender, isInactive)} transition-colors`}>
        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={genderDotCls(b.gender, isInactive)} />
            <span className={`font-medium ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>{b.fullName}</span>
            {isInactive && <InactiveBadge />}
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{rel}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.phone || '—'}</td>
        <td className="px-4 py-2.5 text-xs">
          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{b.occupationCategory || '—'}</span>
        </td>
      </tr>
    );
  });

  return (
    <DetailModal title="Youth Count" icon={TrendingUp} color="bg-purple-600" onClose={onClose} loading={loading} count={data.length}>
      <GenderLegend />
      <ModalTable headers={['S.No', 'Name', 'Age', 'Relation', 'Village', 'Phone', 'Occupation']} rows={rows} emptyMsg="No youth found." />
    </DetailModal>
  );
}

// ─── CHILDREN MODAL ───────────────────────────────────────────────────────────
function ChildrenModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAllBelievers({ memberType: 'Child' })
      .then((all) => { all.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')); setData(all); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    const isInactive = b.membershipStatus !== 'Active';
    const rel = b.relationshipToHead === 'Other' && b.relationCustom ? b.relationCustom : b.relationshipToHead || '—';
    return (
      <tr key={b._id} className={`${genderRowCls(b.gender, isInactive)} transition-colors`}>
        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={genderDotCls(b.gender, isInactive)} />
            <span className={`font-medium ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>{b.fullName}</span>
            {isInactive && <InactiveBadge />}
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{rel}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
      </tr>
    );
  });

  return (
    <DetailModal title="Children" icon={Baby} color="bg-yellow-500" onClose={onClose} loading={loading} count={data.length}>
      <GenderLegend />
      <ModalTable headers={['S.No', 'Name', 'Age', 'Relation', 'Village']} rows={rows} emptyMsg="No children found." />
    </DetailModal>
  );
}

// ─── COUPLES MODAL ────────────────────────────────────────────────────────────
function CouplesModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAllBelievers({ maritalStatus: 'Married' })
      .then((all) => {
        const seen = new Set();
        const couples = [];
        for (const b of all) {
          const myId = b._id?.toString();
          const spouseId = (b.spouseId && typeof b.spouseId === 'object'
            ? b.spouseId._id?.toString()
            : b.spouseId?.toString()) || null;
          const key = spouseId ? [myId, spouseId].sort().join('|') : myId;
          if (seen.has(key)) continue;
          seen.add(key);
          couples.push(b);
        }
        couples.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        setData(couples);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    const isInactive = b.membershipStatus !== 'Active';
    const spouseName = (b.spouseId && typeof b.spouseId === 'object'
      ? b.spouseId.fullName : null) || b.spouseName || '—';
    return (
      <tr key={b._id} className={`hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
        <td className="px-4 py-2.5 text-gray-400 font-medium text-xs">{i + 1}</td>
        <span className="font-medium text-gray-800">{b.fullName}</span>
          <span className="text-gray-400 mx-1.5">♥</span>
          <span className="font-medium text-gray-700">{spouseName}</span>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
      </tr>
    );
  });

  return (
    <DetailModal title="Married Couples" icon={Heart} color="bg-pink-600" onClose={onClose} loading={loading} count={data.length}>
      <ModalTable headers={['S.No', 'Spouse Names (Husband — Wife)', 'Village']} rows={rows} emptyMsg="No couples found." />
    </DetailModal>
  );
}

// ─── STUDENTS MODAL ───────────────────────────────────────────────────────────
function StudentsModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAllBelievers({ occupationCategory: 'Student' })
      .then((all) => { all.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')); setData(all); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    const isInactive = b.membershipStatus !== 'Active';
    const rel = b.relationshipToHead === 'Other' && b.relationCustom ? b.relationCustom : b.relationshipToHead || '—';
    return (
      <tr key={b._id} className={`${genderRowCls(b.gender, isInactive)} transition-colors`}>
        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={genderDotCls(b.gender, isInactive)} />
            <span className={`font-medium ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>{b.fullName}</span>
            {isInactive && <InactiveBadge />}
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{rel}</td>
        <td className="px-4 py-2.5 text-xs">
          {b.educationLevel
            ? <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{b.educationLevel}</span>
            : '—'}
        </td>
      </tr>
    );
  });

  return (
    <DetailModal title="Students" icon={BookOpen} color="bg-indigo-600" onClose={onClose} loading={loading} count={data.length}>
      <GenderLegend />
      <ModalTable headers={['S.No', 'Name', 'Age', 'Relation', 'Education Level']} rows={rows} emptyMsg="No students found." />
    </DetailModal>
  );
}

// ─── EMPLOYED MODAL ───────────────────────────────────────────────────────────
function EmployedModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all(
      ['Employed', 'Self-Employed', 'Business', 'Agriculture', 'Daily wages']
        .map((c) => fetchAllBelievers({ occupationCategory: c }).catch(() => []))
    )
      .then((results) => {
        const all = results.flat();
        all.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        setData(all);
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    const isInactive = b.membershipStatus !== 'Active';
    const rel = b.relationshipToHead === 'Other' && b.relationCustom ? b.relationCustom : b.relationshipToHead || '—';
    return (
      <tr key={b._id} className={`${genderRowCls(b.gender, isInactive)} transition-colors`}>
        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={genderDotCls(b.gender, isInactive)} />
            <span className={`font-medium ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>{b.fullName}</span>
            {isInactive && <InactiveBadge />}
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{rel}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
        <td className="px-4 py-2.5 text-xs">
          <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{b.occupationCategory || '—'}</span>
        </td>
      </tr>
    );
  });

  return (
    <DetailModal title="Employed Members" icon={Briefcase} color="bg-teal-600" onClose={onClose} loading={loading} count={data.length}>
      <GenderLegend />
      <ModalTable headers={['S.No', 'Name', 'Age', 'Relation', 'Village', 'Occupation']} rows={rows} emptyMsg="No employed members found." />
    </DetailModal>
  );
}

// ─── ELIGIBLE UNBAPTIZED MODAL ────────────────────────────────────────────────
function EligibleUnbaptizedModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAllBelievers({ baptized: 'No' })
      .then((all) => {
        const eligible = all.filter((b) => {
          const age = calcAge(b.dob);
          return age !== null && age > 15;
        });
        eligible.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        setData(eligible);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    const isInactive = b.membershipStatus !== 'Active';
    const rel = b.relationshipToHead === 'Other' && b.relationCustom ? b.relationCustom : b.relationshipToHead || '—';
    return (
      <tr key={b._id} className={`${genderRowCls(b.gender, isInactive)} transition-colors`}>
        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={genderDotCls(b.gender, isInactive)} />
            <span className={`font-medium ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>{b.fullName}</span>
            {isInactive && <InactiveBadge />}
          </div>
        </td>
        <td className="px-4 py-2.5 font-semibold text-gray-700 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{rel}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
        <td className="px-4 py-2.5 text-xs">
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{b.occupationCategory || '—'}</span>
        </td>
      </tr>
    );
  });

  return (
    <DetailModal title="Eligible Unbaptized (Age > 15)" icon={ShieldOff} color="bg-orange-500" onClose={onClose} loading={loading} count={data.length}>
      <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 text-xs text-orange-700 font-medium">
        Members aged over 15 who have not yet been baptized
      </div>
      <GenderLegend />
      <ModalTable headers={['S.No', 'Name', 'Age', 'Relation', 'Village', 'Occupation']} rows={rows} emptyMsg="No eligible unbaptized members." />
    </DetailModal>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [dashData,  setDashData]  = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, a] = await Promise.all([api.get('/dashboard'), api.get('/analytics')]);
      setDashData(d.data.data);
      setAnalytics(a.data.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Sort upcoming events nearest-first
  const sortUpcoming = (arr, dateKey) => {
    if (!arr) return [];
    const today = new Date();
    return [...arr].sort((a, b) => {
      const toNext = (s) => {
        const d = new Date(s);
        const n = new Date(today.getFullYear(), d.getMonth(), d.getDate());
        if (n < today) n.setFullYear(today.getFullYear() + 1);
        return n.getTime();
      };
      return toNext(a[dateKey]) - toNext(b[dateKey]);
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full" />
    </div>
  );

  const sortedBirthdays     = sortUpcoming(dashData?.upcomingBirthdays,     'dob');
  const sortedAnniversaries = sortUpcoming(dashData?.upcomingAnniversaries, 'weddingDate');
  const eligibleCount       = analytics?.baptismAnalytics?.eligibleNotBaptized ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm">Overview of Presence of Jesus Church</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Total Families"     value={dashData?.totalFamilies}  color="bg-red-800"    onClick={() => setActiveModal('families')} />
        <StatCard icon={Church}     label="Total Believers"    value={dashData?.totalBelievers} color="bg-blue-600"   onClick={() => setActiveModal('believers')} />
        <StatCard icon={UserCheck}  label="Active Members"     value={dashData?.activeMembers}  color="bg-green-600"  onClick={() => setActiveModal('active')} />
        <StatCard icon={TrendingUp} label="Youth Count"        value={dashData?.youthCount}     color="bg-purple-600" onClick={() => setActiveModal('youth')} />
        <StatCard icon={Baby}       label="Children"           value={dashData?.childrenCount}  color="bg-yellow-500" onClick={() => setActiveModal('children')} />
        <StatCard icon={Heart}      label="Married Couples"    value={dashData?.marriedCouples} color="bg-pink-600"   onClick={() => setActiveModal('couples')} />
        <StatCard icon={BookOpen}   label="Students"           value={dashData?.studentsCount}  color="bg-indigo-600" onClick={() => setActiveModal('students')} />
        <StatCard icon={Briefcase}  label="Employed"           value={dashData?.employedCount}  color="bg-teal-600"   onClick={() => setActiveModal('employed')} />

        {/* Baptized rate (no modal) */}
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-600">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{dashData?.baptizedPercentage}%</p>
            <p className="text-sm text-gray-500">Baptized Rate</p>
          </div>
        </div>

        {/* NEW: Eligible Unbaptized */}
        <StatCard
          icon={ShieldOff}
          label="Eligible Unbaptized"
          value={eligibleCount}
          color="bg-orange-500"
          sub="Age > 15, not baptized"
          onClick={() => setActiveModal('eligible')}
        />
      </div>

      {/* Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Cake className="w-5 h-5 text-red-800" />
            <h3 className="font-semibold text-gray-800">Upcoming Birthdays (Next 7 days)</h3>
          </div>
          {sortedBirthdays.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No upcoming birthdays</p>
            : <div className="space-y-2">
                {sortedBirthdays.map((b, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="font-medium text-gray-700 text-sm">{b.name}</span>
                    <span className="text-xs text-gray-500 bg-red-50 px-2 py-1 rounded-full">{formatDate(b.dob, 'dd MMM')}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarHeart className="w-5 h-5 text-red-800" />
            <h3 className="font-semibold text-gray-800">Upcoming Anniversaries (Next 7 days)</h3>
          </div>
          {sortedAnniversaries.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No upcoming anniversaries</p>
            : <div className="space-y-2">
                {sortedAnniversaries.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="font-medium text-gray-700 text-sm">{a.coupleName || a.name}</span>
                    <span className="text-xs text-gray-500 bg-pink-50 px-2 py-1 rounded-full">{formatDate(a.weddingDate, 'dd MMM')}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* MODALS */}
      {activeModal === 'families'  && <FamiliesModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'believers' && <BelieversModal title="Total Believers" fetchParams={{}} icon={Church} color="bg-blue-600" onClose={() => setActiveModal(null)} />}
      {activeModal === 'active'    && <BelieversModal title="Active Members" fetchParams={{ membershipStatus: 'Active' }} icon={UserCheck} color="bg-green-600" onClose={() => setActiveModal(null)} />}
      {activeModal === 'youth'     && <YouthModal    onClose={() => setActiveModal(null)} />}
      {activeModal === 'children'  && <ChildrenModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'couples'   && <CouplesModal  onClose={() => setActiveModal(null)} />}
      {activeModal === 'students'  && <StudentsModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'employed'  && <EmployedModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'eligible'  && <EligibleUnbaptizedModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}
