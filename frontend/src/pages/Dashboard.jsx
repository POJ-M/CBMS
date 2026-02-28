import React, { useEffect, useState } from 'react';
import {
  Users, UserCheck, Heart, BookOpen, Baby, Briefcase,
  Droplets, Cake, CalendarHeart, TrendingUp, RefreshCw, Church
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/helpers';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="stat-card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
        <StatCard icon={Users} label="Total Families" value={data?.totalFamilies} color="bg-red-800" />
        <StatCard icon={Church} label="Total Believers" value={data?.totalBelievers} color="bg-blue-600" />
        <StatCard icon={UserCheck} label="Active Members" value={data?.activeMembers} color="bg-green-600" />
        <StatCard icon={TrendingUp} label="Youth Count" value={data?.youthCount} color="bg-purple-600" />
        <StatCard icon={Baby} label="Children" value={data?.childrenCount} color="bg-yellow-500" />
        <StatCard icon={Heart} label="Married Couples" value={data?.marriedCouples} color="bg-pink-600" />
        <StatCard icon={BookOpen} label="Students" value={data?.studentsCount} color="bg-indigo-600" />
        <StatCard icon={Briefcase} label="Employed" value={data?.employedCount} color="bg-teal-600" />
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
          {data?.upcomingBirthdays?.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No upcoming birthdays</p>
            : <div className="space-y-2">
                {data?.upcomingBirthdays?.map((b, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="font-medium text-gray-700 text-sm">{b.name}</span>
                    <span className="text-xs text-gray-500 bg-red-50 px-2 py-1 rounded-full">{formatDate(b.dob, 'dd MMM')}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Anniversaries - Updated to show couple names */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarHeart className="w-5 h-5 text-red-800" />
            <h3 className="font-semibold text-gray-800">Upcoming Anniversaries (Next 7 days)</h3>
          </div>
          {data?.upcomingAnniversaries?.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">No upcoming anniversaries</p>
            : <div className="space-y-2">
                {data?.upcomingAnniversaries?.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="font-medium text-gray-700 text-sm">
                      {/* Show couple name (Husband — Wife) instead of single name */}
                      {a.coupleName || a.name}
                    </span>
                    <span className="text-xs text-gray-500 bg-pink-50 px-2 py-1 rounded-full">{formatDate(a.weddingDate, 'dd MMM')}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}