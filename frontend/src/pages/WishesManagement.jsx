// frontend/src/pages/WishesManagement.jsx
// COMPLETE FILE - Ready to copy-paste
// Features: Tamil messages, Selective sending, Smart phone logic

import React, { useState, useEffect } from 'react';
import { 
  Mail, MessageCircle, Send, Eye, Calendar, Heart, Loader2, 
  AlertCircle, CheckSquare, Square, Users, Check, X, Phone, User
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDate, calcAge } from '../utils/helpers';
import { parseApiError } from '../utils/errorUtils';

export default function WishesManagement() {
  const [activeTab, setActiveTab] = useState('birthday');
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [results, setResults] = useState(null);

  // Fetch preview
  const fetchPreview = async (type) => {
    setLoading(true);
    setSelectedIds([]);
    setResults(null);
    try {
      const { data } = await api.get(`/wishes/${type}/preview`);
      setPreview(data.data || []);
    } catch (err) {
      toast.error('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab) {
      fetchPreview(activeTab === 'birthday' ? 'birthdays' : 'anniversaries');
    }
  }, [activeTab]);

  // Selection handlers
  const handleSelectAll = () => {
    setSelectedIds(preview.map(b => b._id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  // Send wishes
  const handleSend = async () => {
  if (selectedIds.length === 0) {
    toast.error('Please select at least one person');
    return;
  }

  const confirmMsg = `Send ${activeTab} wishes to ${selectedIds.length} selected ${selectedIds.length === 1 ? 'person' : 'people'}?`;
  if (!window.confirm(confirmMsg)) return;

  setSending(true);
  try {
    const endpoint = activeTab === 'birthday' ? 'birthdays' : 'anniversaries';
    const { data } = await api.post(`/wishes/${endpoint}/send`, {
      believerIds: selectedIds
    });
    
    // ✅ Updated message
    toast.success(
      `✅ Wishes are being sent! This may take a few minutes. Check Render logs to see progress.`,
      { duration: 6000 }
    );
    
    setSelectedIds([]);
    
    // ✅ Show info about background processing
    setTimeout(() => {
      toast('💡 Tip: Wishes are sent in the background. Check your email delivery after 2-3 minutes.', {
        duration: 5000,
        icon: 'ℹ️'
      });
    }, 1000);
    
  } catch (err) {
    toast.error(parseApiError(err));
  } finally {
    setSending(false);
  }
};

  // Get phone display
  const getPhoneDisplay = (believer) => {
    if (believer.phone) {
      return { phone: believer.phone, source: 'own', icon: User };
    }
    const headPhone = believer.familyId?.headId?.phone;
    if (headPhone) {
      return { 
        phone: headPhone, 
        source: 'head', 
        icon: Users,
        headName: believer.familyId.headId.fullName 
      };
    }
    return { phone: null, source: 'none', icon: X };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Send Wishes</h2>
        <p className="text-gray-500 text-sm mt-0.5">
          Send birthday and anniversary wishes via Email & SMS (bilingual)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('birthday')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'birthday'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Birthday Wishes
        </button>
        <button
          onClick={() => setActiveTab('anniversary')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'anniversary'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Heart className="w-4 h-4" />
          Anniversary Wishes
        </button>
      </div>

      {/* Selection Controls */}
      {preview.length > 0 && !loading && (
        <div className="flex items-center justify-between card !p-3 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.length} of {preview.length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-xs px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Deselect All
              </button>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={sending || selectedIds.length === 0}
            className={`btn-primary flex items-center gap-2 ${
              selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4" /> Send to Selected ({selectedIds.length})</>
            )}
          </button>
        </div>
      )}

      {/* Preview List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700">
            {activeTab === 'birthday' ? 'Today\'s Birthdays' : 'Today\'s Anniversaries'}
          </h3>
          <span className="text-sm text-gray-500">{preview.length} recipients</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : preview.length === 0 ? (
          <div className="text-center py-10">
            <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No {activeTab} wishes for today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {preview.map((b) => {
              const phoneInfo = getPhoneDisplay(b);
              const isSelected = selectedIds.includes(b._id);
              const PhoneIcon = phoneInfo.icon;
              const tamilName = b.tamilName || b.fullName;

              return (
                <div 
                  key={b._id} 
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => handleToggleSelect(b._id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="mt-1">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      {/* English Name */}
                      <p className="font-medium text-gray-800">{b.fullName}</p>
                      
                      {/* Tamil Name */}
                      {b.tamilName && (
                        <p className="text-sm text-gray-600" style={{ fontFamily: 'Tamil, Arial' }}>
                          {b.tamilName}
                        </p>
                      )}

                      {/* Contact Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {/* Email */}
                        {b.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {b.email}
                          </span>
                        )}
                        
                        {/* Phone */}
                        {phoneInfo.phone ? (
                          <span className="flex items-center gap-1">
                            <PhoneIcon className={`w-3 h-3 ${
                              phoneInfo.source === 'own' ? 'text-green-600' : 'text-blue-600'
                            }`} />
                            <span className={phoneInfo.source === 'own' ? 'text-green-600' : 'text-blue-600'}>
                              {phoneInfo.phone}
                              {phoneInfo.source === 'head' && (
                                <span className="text-gray-500"> (via {phoneInfo.headName})</span>
                              )}
                            </span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500">
                            <X className="w-3 h-3" />
                            No phone
                          </span>
                        )}
                      </div>

                      {/* Date & Age */}
                      <div className="text-xs text-gray-500 mt-1">
                        {activeTab === 'birthday' ? (
                          <>
                            🎂 {formatDate(b.dob)} · Age: {calcAge(b.dob)}
                          </>
                        ) : (
                          <>
                            💝 {formatDate(b.weddingDate)}
                            {b.weddingDate && (
                              <> · {new Date().getFullYear() - new Date(b.weddingDate).getFullYear()} years</>
                            )}
                          </>
                        )}
                      </div>

                      {/* Message Preview */}
                      <div className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs">
                        <p className="text-gray-700 font-medium">📧 Email & 📱 SMS Message:</p>
                        <p className="text-gray-600 mt-1">
                          {activeTab === 'birthday' ? (
                            <>
                              🎂 Happy Birthday {b.fullName}! May God bless you...
                            </>
                          ) : (
                            <>
                              💝 Happy Anniversary {b.fullName}
                              {(b.spouseId?.fullName || b.spouseName) && ` & ${b.spouseId?.fullName || b.spouseName}`}!
                            </>
                          )}
                        </p>
                        <p className="text-gray-600 mt-1" style={{ fontFamily: 'Tamil, Arial' }}>
                          {activeTab === 'birthday' ? (
                            <>
                              பிறந்தநாள் வாழ்த்துக்கள் {tamilName}! தேவன் ஆசீர்வதிப்பாராக...
                            </>
                          ) : (
                            <>
                              திருமண நாள் வாழ்த்துக்கள் {tamilName}
                              {(b.spouseId?.tamilName || b.spouseId?.fullName || b.spouseName) && 
                                ` & ${b.spouseId?.tamilName || b.spouseId?.fullName || b.spouseName}`}!
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="card border-2 border-green-200 bg-green-50">
          <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
            <Check className="w-5 h-5" />
            Send Results
          </h3>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <p className="text-xs text-gray-600">Total Selected</p>
              <p className="text-2xl font-bold text-gray-800">{results.total}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-600">Email Sent</p>
              <p className="text-2xl font-bold text-blue-700">{results.emailSuccess}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <p className="text-xs text-green-600">SMS Sent</p>
              <p className="text-2xl font-bold text-green-700">{results.smsSuccess}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <p className="text-xs text-purple-600">Via Family Head</p>
              <p className="text-2xl font-bold text-purple-700">{results.smsViaHead || 0}</p>
            </div>
          </div>

          {/* Detailed Logs */}
          {results.logs && results.logs.length > 0 && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Detailed Log:</p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {results.logs.map((log, i) => (
                  <div key={i} className="text-xs flex items-start gap-2">
                    {log.status === 'success' ? (
                      <Check className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : log.status === 'skipped' ? (
                      <AlertCircle className="w-3 h-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-3 h-3 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-gray-700">
                      <strong>{log.name}</strong> - {log.type}: {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {results.errors && results.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200 mt-3">
              <p className="text-sm font-semibold text-red-700 mb-2">Errors ({results.errors.length}):</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.errors.map((err, i) => (
                  <div key={i} className="text-xs text-red-600">
                    <strong>{err.name}</strong> - {err.type}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">How it works:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-blue-700">
              <li>Select believers using checkboxes</li>
              <li>Email sent if believer has email address</li>
              <li>SMS priority: Believer's phone → Family head's phone → Skip</li>
              <li>Messages are bilingual (English + Tamil)</li>
              <li>Tamil name used if available, otherwise English name</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
