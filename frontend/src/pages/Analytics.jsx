import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const COLORS = ['#8B0000', '#1e40af', '#065f46', '#854d0e', '#6b21a8', '#0369a1'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/analytics');
      setData(res.data);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full" /></div>;
  if (!data) return null;

  const ageData = [
    { name: 'Children (0-12)', value: data.ageDistribution.children, color: '#fbbf24' },
    { name: 'Youth (13-29)', value: data.ageDistribution.youth, color: '#8b5cf6' },
    { name: 'Adults (30-59)', value: data.ageDistribution.adults, color: '#3b82f6' },
    { name: 'Seniors (60+)', value: data.ageDistribution.seniors, color: '#6b7280' }
  ];

  const genderData = [
    { name: 'Male', value: data.genderDistribution.male, color: '#1e40af' },
    { name: 'Female', value: data.genderDistribution.female, color: '#be185d' },
    { name: 'Other', value: data.genderDistribution.other, color: '#6b7280' }
  ];

  const baptismData = [
    { name: 'Baptized', value: data.baptismAnalytics.totalBaptized, color: '#059669' },
    { name: 'Not Baptized', value: data.baptismAnalytics.notBaptized, color: '#dc2626' }
  ];

  const villageBarData = data.villageAnalytics.top5.map(v => ({ name: v.village, Members: v.members, Families: v.families }));

  const StatChip = ({ label, value, color }) => (
    <div className={`p-3 rounded-xl text-center ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-80 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Analytics</h2>
          <p className="text-gray-500 text-sm">Church population insights</p>
        </div>
        <button onClick={fetch} className="btn-secondary"><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>

      {/* Age Distribution */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-red-800" />Age Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatChip label="Children (0-12)" value={data.ageDistribution.children} color="bg-yellow-50 text-yellow-800" />
          <StatChip label="Youth (13-29)" value={data.ageDistribution.youth} color="bg-purple-50 text-purple-800" />
          <StatChip label="Adults (30-59)" value={data.ageDistribution.adults} color="bg-blue-50 text-blue-800" />
          <StatChip label="Seniors (60+)" value={data.ageDistribution.seniors} color="bg-gray-100 text-gray-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 text-center mb-2">Pie Chart</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={ageData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                  {ageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm text-gray-500 text-center mb-2">Bar Chart</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Count">
                  {ageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gender & Baptism */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={genderData.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {genderData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Baptism Analytics</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatChip label="Baptized" value={data.baptismAnalytics.totalBaptized} color="bg-green-50 text-green-800" />
            <StatChip label="Not Baptized" value={data.baptismAnalytics.notBaptized} color="bg-red-50 text-red-800" />
            <StatChip label="Baptism Rate" value={`${data.baptismAnalytics.baptismRate}%`} color="bg-blue-50 text-blue-800" />
            <StatChip label="Eligible Unbaptized" value={data.baptismAnalytics.eligibleNotBaptized} color="bg-amber-50 text-amber-800" />
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={baptismData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                {baptismData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Village Analytics */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Top 5 Villages by Population</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={villageBarData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Members" fill="#8B0000" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Families" fill="#1e40af" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Rank</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Village</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Members</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Families</th>
              </tr>
            </thead>
            <tbody>
              {data.villageAnalytics.top5.map((v, i) => (
                <tr key={v.village} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-bold text-gray-400">#{i + 1}</td>
                  <td className="py-2 px-3 font-medium text-gray-800">{v.village}</td>
                  <td className="py-2 px-3"><span className="badge badge-red">{v.members}</span></td>
                  <td className="py-2 px-3"><span className="badge badge-blue">{v.families}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}