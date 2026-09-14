import { useEffect, useState } from 'react';
import { db, type Business } from '../../lib/db';

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

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg('');
    const now = new Date().toISOString();
    if (biz) {
      await db.business.update(biz.id, { ...form, updatedAt: now });
      setMsg('Saved.');
    } else {
      const rec: Business = { id: crypto.randomUUID(), ...form, createdAt: now, updatedAt: now };
      await db.business.add(rec); setBiz(rec); setMsg('Business created.');
    }
    setSaving(false);
  }

  const input = 'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';
  const label = 'block text-xs font-medium text-neutral-400 mb-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-sm text-neutral-400 mb-6">Business profile. Stored locally in IndexedDB — no server.</p>
      <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label><span className={label}>Business name *</span><input name="name" value={form.name} onChange={onChange} required className={input} placeholder="Micro Business 365" /></label>
          <label><span className={label}>Business type</span><input name="businessType" value={form.businessType} onChange={onChange} className={input} placeholder="Retail / Services" /></label>
          <label><span className={label}>Owner name</span><input name="ownerName" value={form.ownerName} onChange={onChange} className={input} /></label>
          <label><span className={label}>GSTIN</span><input name="gstin" value={form.gstin ?? ''} onChange={onChange} className={input} placeholder="22AAAAA0000A1Z5" /></label>
          <label><span className={label}>Phone</span><input name="phone" value={form.phone} onChange={onChange} className={input} /></label>
          <label><span className={label}>Email</span><input name="email" value={form.email} onChange={onChange} className={input} /></label>
          <label className="md:col-span-2"><span className={label}>Address</span><input name="address" value={form.address} onChange={onChange} className={input} /></label>
          <label><span className={label}>City</span><input name="city" value={form.city} onChange={onChange} className={input} /></label>
          <label><span className={label}>State</span><input name="state" value={form.state} onChange={onChange} className={input} /></label>
          <label><span className={label}>Country</span><input name="country" value={form.country} onChange={onChange} className={input} /></label>
          <label><span className={label}>Pincode</span><input name="pincode" value={form.pincode} onChange={onChange} className={input} /></label>
          <label><span className={label}>Currency</span><input name="currency" value={form.currency} onChange={onChange} className={input} /></label>
          <label><span className={label}>Tax settings</span><input name="taxSettings" value={form.taxSettings} onChange={onChange} className={input} /></label>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button disabled={saving} className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : biz ? 'Save changes' : 'Create business'}</button>
          {msg && <span className="text-sm text-emerald-400">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
