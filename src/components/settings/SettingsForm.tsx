import { useEffect, useState } from 'react';
import { db, type Business } from '../../lib/db';
import { sanitizeName, sanitizePhone, sanitizePincode, sanitizeGSTIN, isValidPhone, isValidEmail } from '../../lib/utils';

const empty: Omit<Business, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', businessType: '', ownerName: '', phone: '', email: '',
  address: '', city: '', state: '', country: 'India', pincode: '',
  currency: 'INR', taxSettings: 'GST', gstin: '', logo: '',
};

export default function SettingsForm() {
  const [biz, setBiz] = useState<Business | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    db.business.toArray().then((rows) => {
      if (rows[0]) { setBiz(rows[0]); setForm({ ...empty, ...rows[0] }); }
    });
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let cleanVal = value;
    if (name === 'ownerName' || name === 'city' || name === 'state' || name === 'country') {
      cleanVal = sanitizeName(value);
    } else if (name === 'phone') {
      cleanVal = sanitizePhone(value);
    } else if (name === 'pincode') {
      cleanVal = sanitizePincode(value);
    } else if (name === 'gstin') {
      cleanVal = sanitizeGSTIN(value);
    }
    setForm((f) => ({ ...f, [name]: cleanVal }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter a business name.');
      return;
    }
    if (form.phone && !isValidPhone(form.phone)) {
      alert('Contact phone must be exactly 10 digits.');
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      alert('Please enter a valid official email address.');
      return;
    }
    setSaving(true); setMsg('');
    const now = new Date().toISOString();
    if (biz) {
      await db.business.update(biz.id, { ...form, updatedAt: now });
      setMsg('Business settings saved successfully.');
    } else {
      const rec: Business = { id: crypto.randomUUID(), ...form, createdAt: now, updatedAt: now };
      await db.business.add(rec); setBiz(rec); setMsg('Business profile created successfully.');
    }
    setSaving(false);
  }

  function handleClearForm() {
    if (window.confirm('Clear all fields to type a new company name and details?')) {
      setForm(empty);
      setMsg('Form fields cleared. Enter your new company details and click Save.');
    }
  }

  async function handleResetAllData() {
    if (!window.confirm('Remove saved company details from the database? This will clear stored company info.')) {
      return;
    }
    await db.business.clear();
    setBiz(null);
    setForm(empty);
    setMsg('Company profile details removed successfully.');
  }

  const label = 'block text-xs font-semibold text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="app-card space-y-4">
        <div className="border-b border-[var(--color-border)] dark:border-neutral-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)] dark:text-white">
              Business Profile & Tax Configuration
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Your company details will prefill invoices, receipts, and quotations.
            </p>
          </div>
          {biz && (
            <span className="self-start sm:self-auto text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Active: {biz.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>
            <span className={label}>Business Name *</span>
            <input name="name" value={form.name} onChange={onChange} required className="app-input" placeholder="e.g. Acme Industrial Traders" />
          </label>
          <label>
            <span className={label}>Business Type</span>
            <input name="businessType" value={form.businessType} onChange={onChange} className="app-input" placeholder="e.g. Manufacturing / Wholesale" />
          </label>
          <label>
            <span className={label}>Owner / Signatory Name</span>
            <input name="ownerName" value={form.ownerName} onChange={onChange} className="app-input" placeholder="e.g. John Doe" />
          </label>
          <label>
            <span className={label}>GSTIN / Tax Registration</span>
            <input name="gstin" value={form.gstin ?? ''} onChange={onChange} className="app-input" placeholder="e.g. 22AAAAA0000A1Z5" />
          </label>
          <label>
            <span className={label}>Contact Phone</span>
            <input name="phone" value={form.phone} onChange={onChange} className="app-input" placeholder="e.g. +91 98765 43210" />
          </label>
          <label>
            <span className={label}>Official Email</span>
            <input name="email" value={form.email} onChange={onChange} className="app-input" placeholder="e.g. billing@acme.com" />
          </label>
          <label className="md:col-span-2">
            <span className={label}>Registered Business Address</span>
            <input name="address" value={form.address} onChange={onChange} className="app-input" placeholder="e.g. Plot 45, Sector 18, Industrial Area" />
          </label>
          <label>
            <span className={label}>City</span>
            <input name="city" value={form.city} onChange={onChange} className="app-input" placeholder="e.g. Mumbai" />
          </label>
          <label>
            <span className={label}>State</span>
            <input name="state" value={form.state} onChange={onChange} className="app-input" placeholder="e.g. Maharashtra" />
          </label>
          <label>
            <span className={label}>Country</span>
            <input name="country" value={form.country} onChange={onChange} className="app-input" placeholder="e.g. India" />
          </label>
          <label>
            <span className={label}>Postal Code / Pincode</span>
            <input name="pincode" value={form.pincode} onChange={onChange} className="app-input" placeholder="e.g. 400001" />
          </label>
          <label>
            <span className={label}>Primary Currency</span>
            <input name="currency" value={form.currency} onChange={onChange} className="app-input" placeholder="INR (₹)" />
          </label>
          <label>
            <span className={label}>Tax Regime</span>
            <input name="taxSettings" value={form.taxSettings} onChange={onChange} className="app-input" placeholder="GST (18%)" />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--color-border)] dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="app-btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : biz ? 'Save Settings' : 'Create Business Profile'}
            </button>
            <button
              type="button"
              onClick={handleClearForm}
              className="app-btn-secondary"
            >
              Clear Form
            </button>
            {biz && (
              <button
                type="button"
                onClick={handleResetAllData}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition cursor-pointer"
              >
                Reset Saved Profile
              </button>
            )}
          </div>
          {msg && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              ✓ {msg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
