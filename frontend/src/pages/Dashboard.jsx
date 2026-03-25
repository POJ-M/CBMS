import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, UserCheck, Heart, BookOpen, Baby, Briefcase,
  Droplets, Cake, CalendarHeart, TrendingUp, RefreshCw, Church, X, Loader2
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDate, calcAge } from '../utils/helpers';

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, sub, onClick }) => (
  <div
    className={`stat-card flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-150 active:scale-[0.99]' : ''}`}
    onClick={onClick}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    {onClick && (
      <div className="ml-auto">
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">View</span>
      </div>
    )}
  </div>
);

// ─── GENDER COLOR HELPER ──────────────────────────────────────────────────────
const genderRowCls = (gender) => {
  if (gender === 'Female') return 'bg-pink-50/60';
  if (gender === 'Male')   return 'bg-blue-50/40';
  return '';
};
const genderDot = (gender) => {
  if (gender === 'Female') return 'w-2 h-2 rounded-full bg-pink-400 inline-block mr-1.5 flex-shrink-0';
  if (gender === 'Male')   return 'w-2 h-2 rounded-full bg-blue-400 inline-block mr-1.5 flex-shrink-0';
  return 'w-2 h-2 rounded-full bg-gray-300 inline-block mr-1.5 flex-shrink-0';
};

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function DetailModal({ title, icon: Icon, color, onClose, loading, children, count }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
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
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TABLE SHELL ─────────────────────────────────────────────────────────────
function ModalTable({ headers, rows, emptyMsg = 'No records found.' }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="font-medium">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows}
        </tbody>
      </table>
    </div>
  );
}

// ─── INDIVIDUAL MODALS ────────────────────────────────────────────────────────

function FamiliesModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/families?limit=500')
      .then(({ data: res }) => {
        const sorted = [...(res.data || [])].sort((a, b) =>
          (a.familyCode || '').localeCompare(b.familyCode || '')
        );
        setData(sorted);
      })
      .catch(() => toast.error('Failed to load families'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((f, i) => (
    <tr key={f._id} className={`hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
      <td className="px-4 py-2.5 text-gray-400 font-medium text-xs">{i + 1}</td>
      <td className="px-4 py-2.5 font-bold text-red-800 text-xs">{f.familyCode}</td>
      <td className="px-4 py-2.5 font-medium text-gray-800">{f.headId?.fullName || '—'}</td>
      <td className="px-4 py-2.5 text-gray-600">{f.village || '—'}</td>
      <td className="px-4 py-2.5 text-center">
        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{f.activeCount ?? '—'}</span>
      </td>
    </tr>
  ));

  return (
    <DetailModal title="Total Families" icon={Users} color="bg-red-800" onClose={onClose} loading={loading} count={data.length}>
      <ModalTable
        headers={['S.No', 'Family Code', 'Head Name', 'Village', 'Active Members']}
        rows={rows}
        emptyMsg="No families found."
      />
    </DetailModal>
  );
}

function BelieversModal({ title, filter, icon, color, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: 500, ...filter });
    api.get(`/believers?${params}`)
      .then(({ data: res }) => {
        const sorted = [...(res.data || [])].sort((a, b) =>
          (a.fullName || '').localeCompare(b.fullName || '')
        );
        setData(sorted);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    return (
      <tr key={b._id} className={`hover:bg-gray-50 transition-colors ${genderRowCls(b.gender)}`}>
        <td className="px-4 py-2.5 text-gray-400 font-medium text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center">
            <span className={genderDot(b.gender)} />
            <span className="font-medium text-gray-800">{b.fullName}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.phone || '—'}</td>
      </tr>
    );
  });

  return (
    <DetailModal title={title} icon={icon} color={color} onClose={onClose} loading={loading} count={data.length}>
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Male</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Female</span>
      </div>
      <ModalTable
        headers={['S.No', 'Name', 'Age', 'Village', 'Phone']}
        rows={rows}
        emptyMsg="No records found."
      />
    </DetailModal>
  );
}

function YouthModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/believers?limit=500&memberType=Youth')
      .then(({ data: res }) => {
        const sorted = [...(res.data || [])].sort((a, b) =>
          (a.fullName || '').localeCompare(b.fullName || '')
        );
        setData(sorted);
      })
      .catch(() => toast.error('Failed to load youth'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    return (
      <tr key={b._id} className={`hover:bg-gray-50 transition-colors ${genderRowCls(b.gender)}`}>
        <td className="px-4 py-2.5 text-gray-400 font-medium text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center">
            <span className={genderDot(b.gender)} />
            <span className="font-medium text-gray-800">{b.fullName}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
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
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Male</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Female</span>
      </div>
      <ModalTable
        headers={['S.No', 'Name', 'Age', 'Village', 'Phone', 'Occupation']}
        rows={rows}
        emptyMsg="No youth records found."
      />
    </DetailModal>
  );
}

function ChildrenModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/believers?limit=500&memberType=Child')
      .then(({ data: res }) => {
        const sorted = [...(res.data || [])].sort((a, b) =>
          (a.fullName || '').localeCompare(b.fullName || '')
        );
        setData(sorted);
      })
      .catch(() => toast.error('Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    return (
      <tr key={b._id} className={`hover:bg-gray-50 transition-colors ${genderRowCls(b.gender)}`}>
        <td className="px-4 py-2.5 text-gray-400 font-medium text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center">
            <span className={genderDot(b.gender)} />
            <span className="font-medium text-gray-800">{b.fullName}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
      </tr>
    );
  });

  return (
    <DetailModal title="Children" icon={Baby} color="bg-yellow-500" onClose={onClose} loading={loading} count={data.length}>
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Male</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Female</span>
      </div>
      <ModalTable
        headers={['S.No', 'Name', 'Age', 'Village']}
        rows={rows}
        emptyMsg="No children records found."
      />
    </DetailModal>
  );
}

function CouplesModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/believers?limit=500&maritalStatus=Married')
      .then(({ data: res }) => {
        // De-duplicate couples
        const seen = new Set();
        const couples = [];
        for (const b of (res.data || [])) {
          const myId = b._id?.toString();
          const spouseId =
            (b.spouseId && typeof b.spouseId === 'object' ? b.spouseId._id?.toString() : b.spouseId?.toString()) || null;
          const pairKey = spouseId ? [myId, spouseId].sort().join('|') : myId;
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);
          couples.push(b);
        }
        couples.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        setData(couples);
      })
      .catch(() => toast.error('Failed to load couples'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    const spouseName =
      (b.spouseId && typeof b.spouseId === 'object' ? b.spouseId.fullName : null) ||
      b.spouseName || '—';
    return (
      <tr key={b._id} className={`hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
        <td className="px-4 py-2.5 text-gray-400 font-medium text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <span className="font-medium text-gray-800">{b.fullName}</span>
          <span className="text-gray-400 mx-1.5">♥</span>
          <span className="font-medium text-gray-700">{spouseName}</span>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
      </tr>
    );
  });

  return (
    <DetailModal title="Married Couples" icon={Heart} color="bg-pink-600" onClose={onClose} loading={loading} count={data.length}>
      <ModalTable
        headers={['S.No', 'Spouse Names', 'Village']}
        rows={rows}
        emptyMsg="No married couples found."
      />
    </DetailModal>
  );
}

function StudentsModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/believers?limit=500&occupationCategory=Student')
      .then(({ data: res }) => {
        const sorted = [...(res.data || [])].sort((a, b) =>
          (a.fullName || '').localeCompare(b.fullName || '')
        );
        setData(sorted);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    return (
      <tr key={b._id} className={`hover:bg-gray-50 transition-colors ${genderRowCls(b.gender)}`}>
        <td className="px-4 py-2.5 text-gray-400 font-medium text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center">
            <span className={genderDot(b.gender)} />
            <span className="font-medium text-gray-800">{b.fullName}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-xs">
          {b.educationLevel ? (
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{b.educationLevel}</span>
          ) : '—'}
        </td>
      </tr>
    );
  });

  return (
    <DetailModal title="Students" icon={BookOpen} color="bg-indigo-600" onClose={onClose} loading={loading} count={data.length}>
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Male</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Female</span>
      </div>
      <ModalTable
        headers={['S.No', 'Name', 'Age', 'Education Level']}
        rows={rows}
        emptyMsg="No students found."
      />
    </DetailModal>
  );
}

function EmployedModal({ onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const categories = ['Employed', 'Self-Employed', 'Business', 'Agriculture', 'Daily wages'];
    Promise.all(
      categories.map((c) =>
        api.get(`/believers?limit=500&occupationCategory=${encodeURIComponent(c)}`)
          .then(({ data: res }) => res.data || [])
          .catch(() => [])
      )
    ).then((results) => {
      const all = results.flat();
      all.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      setData(all);
    }).finally(() => setLoading(false));
  }, []);

  const rows = data.map((b, i) => {
    return (
      <tr key={b._id} className={`hover:bg-gray-50 transition-colors ${genderRowCls(b.gender)}`}>
        <td className="px-4 py-2.5 text-gray-400 font-medium text-xs">{i + 1}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center">
            <span className={genderDot(b.gender)} />
            <span className="font-medium text-gray-800">{b.fullName}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-gray-600 text-sm">{calcAge(b.dob) ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.familyId?.village || '—'}</td>
        <td className="px-4 py-2.5 text-xs">
          <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{b.occupationCategory || '—'}</span>
        </td>
      </tr>
    );
  });

  return (
    <DetailModal title="Employed Members" icon={Briefcase} color="bg-teal-600" onClose={onClose} loading={loading} count={data.length}>
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Male</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Female</span>
      </div>
      <ModalTable
        headers={['S.No', 'Name', 'Age', 'Village', 'Occupation']}
        rows={rows}
        emptyMsg="No employed members found."
      />
    </DetailModal>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  // Sort birthdays by upcoming day (day-of-year order from today)
  const sortedBirthdays = data?.upcomingBirthdays
    ? [...data.upcomingBirthdays].sort((a, b) => {
        const today = new Date();
        const toNext = (dateStr) => {
          const d = new Date(dateStr);
          const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
          if (next < today) next.setFullYear(today.getFullYear() + 1);
          return next.getTime();
        };
        return toNext(a.dob) - toNext(b.dob);
      })
    : [];

  const sortedAnniversaries = data?.upcomingAnniversaries
    ? [...data.upcomingAnniversaries].sort((a, b) => {
        const today = new Date();
        const toNext = (dateStr) => {
          const d = new Date(dateStr);
          const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
          if (next < today) next.setFullYear(today.getFullYear() + 1);
          return next.getTime();
        };
        return toNext(a.weddingDate) - toNext(b.weddingDate);
      })
    : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm">Overview of Presence of Jesus Church</p>
        </div>
        <button onClick={fetch} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}     label="Total Families"   value={data?.totalFamilies}   color="bg-red-800"    onClick={() => openModal('families')} />
        <StatCard icon={Church}    label="Total Believers"  value={data?.totalBelievers}  color="bg-blue-600"   onClick={() => openModal('believers')} />
        <StatCard icon={UserCheck} label="Active Members"   value={data?.activeMembers}   color="bg-green-600"  onClick={() => openModal('active')} />
        <StatCard icon={TrendingUp}label="Youth Count"      value={data?.youthCount}      color="bg-purple-600" onClick={() => openModal('youth')} />
        <StatCard icon={Baby}      label="Children"         value={data?.childrenCount}   color="bg-yellow-500" onClick={() => openModal('children')} />
        <StatCard icon={Heart}     label="Married Couples"  value={data?.marriedCouples}  color="bg-pink-600"   onClick={() => openModal('couples')} />
        <StatCard icon={BookOpen}  label="Students"         value={data?.studentsCount}   color="bg-indigo-600" onClick={() => openModal('students')} />
        <StatCard icon={Briefcase} label="Employed"         value={data?.employedCount}   color="bg-teal-600"   onClick={() => openModal('employed')} />
        <div className="stat-card flex items-center gap-4 col-span-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-600">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{data?.baptizedPercentage}%</p>
            <p className="text-sm text-gray-500">Baptized Rate</p>
          </div>
        </div>
      </div>

      {/* Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Birthdays */}
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

        {/* Anniversaries */}
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
                    <span className="font-medium text-gray-700 text-sm">
                      {a.coupleName || a.name}
                    </span>
                    <span className="text-xs text-gray-500 bg-pink-50 px-2 py-1 rounded-full">{formatDate(a.weddingDate, 'dd MMM')}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ── MODALS ── */}
      {activeModal === 'families'  && <FamiliesModal onClose={closeModal} />}
      {activeModal === 'believers' && <BelieversModal title="Total Believers"  filter={{}}                            icon={Church}     color="bg-blue-600"   onClose={closeModal} />}
      {activeModal === 'active'    && <BelieversModal title="Active Members"   filter={{ membershipStatus: 'Active' }} icon={UserCheck}  color="bg-green-600"  onClose={closeModal} />}
      {activeModal === 'youth'     && <YouthModal    onClose={closeModal} />}
      {activeModal === 'children'  && <ChildrenModal onClose={closeModal} />}
      {activeModal === 'couples'   && <CouplesModal  onClose={closeModal} />}
      {activeModal === 'students'  && <StudentsModal onClose={closeModal} />}
      {activeModal === 'employed'  && <EmployedModal onClose={closeModal} />}
    </div>
  );
}
