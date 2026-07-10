import React, { useState } from 'react';
import { Save, Info, Key, Shield, HelpCircle } from 'lucide-react';

interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
}

interface SettingsManagerProps {
  settings: Setting[];
  token: string;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onRefresh: () => void;
}

export default function SettingsManager({ settings, token, showToast, onRefresh }: SettingsManagerProps) {
  // Local settings key-value map before saving
  const [localValues, setLocalValues] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  // Initialize state values from props
  const getValue = (key: string) => {
    if (localValues[key] !== undefined) return localValues[key];
    const found = settings.find(s => s.key === key);
    return found ? found.value : '';
  };

  const handleValueChange = (key: string, val: string) => {
    setLocalValues(prev => ({ ...prev, [key]: val }));
  };

  // Submit all changes
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const keysToUpdate = Object.keys(localValues);
      
      // Call PUT /api/admin/settings for each key or in batch
      // Let's call them in parallel or sequentially. Sequentially is safer, parallel is faster.
      await Promise.all(
        keysToUpdate.map(async (key) => {
          const val = localValues[key];
          await fetch(`/api/admin/settings/${key}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ value: val })
          });
        })
      );

      showToast('success', 'Settings Saved', 'System configurations updated in database.');
      setLocalValues({});
      onRefresh();
    } catch {
      showToast('error', 'Sync Failure', 'Failed to update settings parameters.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900 animate-fade-in relative">
      <div>
        <h1 className="text-2xl font-light text-neutral-900 font-display italic">Global System Settings</h1>
        <p className="text-xs text-neutral-500">Configure global parameters, APIs, payment keys, and business rules</p>
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Core Parameters */}
        <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-5 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-900 font-mono border-b border-neutral-200/80 pb-3 flex items-center gap-1.5">
            <Key className="w-4 h-4" /> Credentials & Integrations
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Razorpay API Key ID</label>
              <input
                type="text"
                value={getValue('razorpay_key_id')}
                onChange={(e) => handleValueChange('razorpay_key_id', e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Razorpay Key Secret</label>
              <input
                type="password"
                value={getValue('razorpay_key_secret')}
                onChange={(e) => handleValueChange('razorpay_key_secret', e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Google OAuth Client ID</label>
              <input
                type="text"
                value={getValue('google_client_id')}
                onChange={(e) => handleValueChange('google_client_id', e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Google Apps Script Mail Endpoint</label>
              <input
                type="text"
                value={getValue('google_appscript_endpoint')}
                onChange={(e) => handleValueChange('google_appscript_endpoint', e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Business Logic Panel */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-900 font-mono border-b border-neutral-200/80 pb-3 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Security & Flow Settings
            </h3>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">Require OTP Verification</label>
                <select
                  value={getValue('require_email_otp')}
                  onChange={(e) => handleValueChange('require_email_otp', e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none"
                >
                  <option value="true">Active (Require OTP at register)</option>
                  <option value="false">Inactive (Allow instant registration)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">JWT Expiry Duration (Days)</label>
                <input
                  type="number"
                  value={getValue('jwt_expires_days')}
                  onChange={(e) => handleValueChange('jwt_expires_days', e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1">OTP token lifetime (Minutes)</label>
                <input
                  type="number"
                  value={getValue('otp_expiry_minutes')}
                  onChange={(e) => handleValueChange('otp_expiry_minutes', e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-3xl flex items-start gap-3 text-xs text-neutral-500 leading-relaxed shadow-md">
            <Info className="w-4.5 h-4.5 text-neutral-900 shrink-0 mt-0.5" />
            <div>
              <p>Values updated here affect worker instances globally in real-time. Double check API bindings to prevent checkout failures.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || Object.keys(localValues).length === 0}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Syncing Settings...' : 'Save Configurations'}
          </button>
        </div>
      </form>
    </div>
  );
}
