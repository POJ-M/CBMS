/**
 * Trash.jsx — Presence of Jesus Church BMS
 * Trash management: view soft-deleted believers & families,
 * restore them, or permanently delete.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2, RotateCcw, AlertTriangle, Search,
  Users, User, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calcAge = (dob) => {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, body, confirmLabel, danger, onConfirm, onCancel, busy }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-150">
      <div className="flex gap-4 mb-5">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-green-100'}`}>
          {danger
            ? <AlertTriangle className="w-5 h-5 text-red-600" />
            : <RotateCcw className="w-5 h-5 text-green-600" />
          }
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-base">{title}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{body}</p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="btn-secondary" disabled={busy}>Cancel</button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className={danger ? 'btn-danger' : 'flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50'}
        >
          {busy
            ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : danger ? <Trash2 className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />
          }
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── BELIEVER TRASH ───────────────────────────────────────────────────────────
const BelieverTrash = () => {
  const [data, setData]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search) p.append('search', search);
      const res = await api.get(`/believers/trash?${p}`);
      setData(res.data.data);
      setTotal(res.data.pagination.total);
    } catch { toast.error('Failed to load trash'); }
    finally   { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const doRestore = async (item) => {
    setBusy(true);
    try {
      await api.patch(`/believers/${item._id}/restore`);
      toast.success(`${item.fullName} restored!`);
      setConfirm(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Restore failed'); }
    finally      { setBusy(false); }
  };

  const doDelete = async (item) => {
    setBusy(true);
    try {
      await api.delete(`/believers/${item._id}/permanent`);
      toast.success(`${item.fullName} permanently deleted`);
      setConfirm(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
    finally      { setBusy(false); }
  };

  const doEmpty = async () => {
    setBusy(true);
    try {
      const { data: r } = await api.delete('/believers/trash/empty');
      toast.success(r.message); setConfirm(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Empty trash failed'); }
    finally      { setBusy(false); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={load} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
          {total > 0 && (
            <button onClick={() => setConfirm({ type: 'emptyAll' })} className="btn-danger">
              <Trash2 className="w-4 h-4" />Empty Trash ({total})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-50 border-b border-red-100">
              <tr>
                {['Full Name', 'Gender', 'Age', 'Family Code', 'Village', 'Type', 'Deleted On', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="py-14 text-center">
                  <div className="w-6 h-6 border-2 border-red-800 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Trash2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Believer trash is empty</p>
                  <p className="text-gray-300 text-sm mt-0.5">Deleted believers will appear here</p>
                </td></tr>
              ) : data.map((b) => (
                <tr key={b._id} className="hover:bg-red-50/40 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{b.fullName}</td>
                  <td className="px-4 py-2.5 text-gray-500">{b.gender}</td>
                  <td className="px-4 py-2.5 text-gray-500">{calcAge(b.dob)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{b.familyId?.familyCode || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{b.familyId?.village || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${b.memberType === 'Child' ? 'badge-yellow' : b.memberType === 'Youth' ? 'badge-purple' : 'badge-blue'}`}>
                      {b.memberType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{fmtDate(b.deletedAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setConfirm({ type: 'restore', item: b })}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 font-medium transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />Restore
                      </button>
                      <button
                        onClick={() => setConfirm({ type: 'delete', item: b })}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />Delete Forever
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">Page {page} of {pages} · {total} trashed</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary !px-2 !py-1.5 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary !px-2 !py-1.5 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modals */}
      {confirm?.type === 'restore' && (
        <ConfirmModal
          title="Restore Believer"
          body={`Restore "${confirm.item.fullName}" back to active records?`}
          confirmLabel="Restore"
          danger={false}
          onConfirm={() => doRestore(confirm.item)}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}
      {confirm?.type === 'delete' && (
        <ConfirmModal
          title="Permanently Delete"
          body={`"${confirm.item.fullName}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete Forever"
          danger
          onConfirm={() => doDelete(confirm.item)}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}
      {confirm?.type === 'emptyAll' && (
        <ConfirmModal
          title="Empty Believer Trash"
          body={`All ${total} trashed believers will be permanently deleted. This cannot be undone.`}
          confirmLabel="Empty Trash"
          danger
          onConfirm={doEmpty}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}
    </div>
  );
};

// ─── FAMILY TRASH ─────────────────────────────────────────────────────────────
const FamilyTrash = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/families/trash');
      setData(res.data.data);
    } catch { toast.error('Failed to load family trash'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doRestore = async (f) => {
    setBusy(true);
    try {
      await api.patch(`/families/${f._id}/restore`);
      toast.success(`Family ${f.familyCode} restored!`);
      setConfirm(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Restore failed'); }
    finally      { setBusy(false); }
  };

  const doDelete = async (f) => {
    setBusy(true);
    try {
      await api.delete(`/families/${f._id}/permanent`);
      toast.success(`Family ${f.familyCode} permanently deleted`);
      setConfirm(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
    finally      { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-50 border-b border-red-100">
              <tr>
                {['Family Code', 'Head Name', 'Village', 'Address', 'Status', 'Deleted On', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-red-700 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="py-14 text-center">
                  <div className="w-6 h-6 border-2 border-red-800 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <Trash2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Family trash is empty</p>
                </td></tr>
              ) : data.map((f) => (
                <tr key={f._id} className="hover:bg-red-50/40 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-semibold text-red-800">{f.familyCode}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{f.headId?.fullName || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{f.village}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[180px] truncate">{f.address}</td>
                  <td className="px-4 py-2.5">
                    <span className="badge badge-red">{f.familyStatus}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{fmtDate(f.deletedAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setConfirm({ type: 'restore', item: f })}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 font-medium"
                      >
                        <RotateCcw className="w-3 h-3" />Restore
                      </button>
                      <button
                        onClick={() => setConfirm({ type: 'delete', item: f })}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />Delete Forever
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirm?.type === 'restore' && (
        <ConfirmModal
          title="Restore Family"
          body={`Restore family "${confirm.item.familyCode}" and all its members?`}
          confirmLabel="Restore"
          danger={false}
          onConfirm={() => doRestore(confirm.item)}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}
      {confirm?.type === 'delete' && (
        <ConfirmModal
          title="Permanently Delete Family"
          body={`Family "${confirm.item.familyCode}" and ALL its members will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete Forever"
          danger
          onConfirm={() => doDelete(confirm.item)}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Trash() {
  const [tab, setTab] = useState('believers');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-red-600" />Trash
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Soft-deleted records. Restore to recover or permanently delete to remove forever.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Warning: </span>
          Permanently deleted records cannot be recovered under any circumstances.
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'believers', label: 'Believers', Icon: User },
          { key: 'families',  label: 'Families',  Icon: Users },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors rounded-t-lg ${
              tab === key
                ? 'border-red-800 text-red-800 bg-red-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'believers' ? <BelieverTrash /> : <FamilyTrash />}
    </div>
  );
}