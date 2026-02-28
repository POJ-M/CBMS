/**
 * ChangePassword.jsx — Presence of Jesus Church BMS
 * Admin change password form.
 * Route: /change-password (protected)
 */

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const { setToken } = useAuth(); // update stored token with fresh one

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [show, setShow]     = useState({ cur: false, new: false, con: false });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  // Client-side validation
  const validate = () => {
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Current password is required';
    if (!form.newPassword)     errs.newPassword     = 'New password is required';
    else if (form.newPassword.length < 6) errs.newPassword = 'Minimum 6 characters';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
      errs.newPassword = 'New password must be different from current';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await api.put('/auth/change-password', form);
      toast.success('Password changed successfully!');

      // Store fresh token
      if (data.token) {
        localStorage.setItem('token', data.token);
        if (setToken) setToken(data.token);
      }

      // Reset form
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
    } catch (err) {
      const msg = err.response?.data?.message || 'Password change failed';
      toast.error(msg);
      // Highlight specific field if error is about current password
      if (msg.toLowerCase().includes('current')) {
        setErrors({ currentPassword: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const Eye_toggle = ({ field, showKey }) => (
    <button
      type="button"
      onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
      tabIndex={-1}
    >
      {show[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const strength = (() => {
    const p = form.newPassword;
    if (!p) return null;
    let score = 0;
    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak',   color: 'bg-red-500',    w: 'w-1/5' };
    if (score <= 2) return { label: 'Fair',   color: 'bg-orange-400', w: 'w-2/5' };
    if (score <= 3) return { label: 'Good',   color: 'bg-yellow-400', w: 'w-3/5' };
    if (score <= 4) return { label: 'Strong', color: 'bg-green-400',  w: 'w-4/5' };
    return { label: 'Very Strong', color: 'bg-green-600', w: 'w-full' };
  })();

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-red-800" />Change Password
        </h2>
        <p className="text-gray-500 text-sm mt-1">Update your admin account password</p>
      </div>

      {/* Card */}
      <div className="card space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Current Password */}
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                type={show.cur ? 'text' : 'password'}
                className={`input-field pr-10 ${errors.currentPassword ? 'border-red-400 focus:ring-red-200' : ''}`}
                placeholder="Enter current password"
                value={form.currentPassword}
                onChange={(e) => set('currentPassword', e.target.value)}
              />
              <Eye_toggle showKey="cur" />
            </div>
            {errors.currentPassword && (
              <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertCircle className="w-3 h-3" />{errors.currentPassword}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* New Password */}
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={show.new ? 'text' : 'password'}
                className={`input-field pr-10 ${errors.newPassword ? 'border-red-400 focus:ring-red-200' : ''}`}
                placeholder="Minimum 6 characters"
                value={form.newPassword}
                onChange={(e) => set('newPassword', e.target.value)}
              />
              <Eye_toggle showKey="new" />
            </div>
            {/* Strength meter */}
            {form.newPassword && strength && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.w}`} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{strength.label}</p>
              </div>
            )}
            {errors.newPassword && (
              <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertCircle className="w-3 h-3" />{errors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <input
                type={show.con ? 'text' : 'password'}
                className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-400 focus:ring-red-200' : ''}`}
                placeholder="Re-enter new password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
              />
              <Eye_toggle showKey="con" />
            </div>
            {/* Match indicator */}
            {form.newPassword && form.confirmPassword && (
              <p className={`text-xs mt-1 ${form.newPassword === form.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                {form.newPassword === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
            {errors.confirmPassword && (
              <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertCircle className="w-3 h-3" />{errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <ShieldCheck className="w-4 h-4" />
            }
            {loading ? 'Changing Password…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Tips */}
      <div className="card bg-blue-50 border-blue-100 !p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">Password tips</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Use at least 6 characters</li>
          <li>Mix uppercase letters, numbers, and symbols for strength</li>
          <li>Avoid using your username or common words</li>
          <li>You will stay logged in after changing your password</li>
        </ul>
      </div>
    </div>
  );
}