import { useState } from 'react';

/**
 * SECURITY: Sends magic link via the API.
 * All inputs validated before submission.
 * Response never exposed raw to UI.
 */
export default function SendMagicLink({ hospitals }) {
    const [form, setForm]       = useState({ hospital_id: '', service_id: '', status: 'available' });
    const [services, setServices] = useState([]);
    const [loading, setLoading]  = useState(false);
    const [result, setResult]    = useState(null); // { type: 'success'|'error', message, link? }

    const statuses = [
        { value: 'available', label: '✅ Available',   desc: 'Service is fully stocked' },
        { value: 'low',       label: '⚠️ Low Stock',   desc: 'Running low, limited availability' },
        { value: 'none',      label: '❌ Unavailable', desc: 'Out of stock' },
    ];

    // Load services when hospital changes
    const handleHospitalChange = async (e) => {
        const hospitalId = parseInt(e.target.value);
        setForm(f => ({ ...f, hospital_id: hospitalId, service_id: '' }));
        setServices([]);
        setResult(null);

        if (!hospitalId) return;

        const hospital = hospitals.find(h => h.id === hospitalId);
        if (hospital?.services) {
            setServices(hospital.services);
        }
    };

    const handleSubmit = async () => {
        // SECURITY: Validate all fields before sending
        if (!form.hospital_id || !form.service_id || !form.status) {
            setResult({ type: 'error', message: 'Please fill in all fields.' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/magic-link/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept':       'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(), // SECURITY: CSRF protection
                },
                body: JSON.stringify({
                    hospital_id: parseInt(form.hospital_id),
                    service_id:  parseInt(form.service_id),
                    status:      form.status,
                }),
            });

            const json = await res.json();

            if (json.status === 'success') {
                setResult({
                    type:    'success',
                    message: 'Magic link generated successfully!',
                    link:    json.magic_link,
                });
                setForm({ hospital_id: '', service_id: '', status: 'available' });
                setServices([]);
            } else {
                setResult({ type: 'error', message: json.message ?? 'Failed to generate link.' });
            }
        } catch {
            setResult({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="mb-1 font-['Syne',sans-serif] text-base font-bold text-white">
                    🔗 Send Magic Link
                </h2>
                <p className="mb-6 text-xs text-slate-500">
                    Generate a secure one-time link to send to a hospital for stock updates.
                </p>

                <div className="flex flex-col gap-4">
                    {/* Hospital Select */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-400" htmlFor="hospital-select">
                            Hospital
                        </label>
                        <select
                            id="hospital-select"
                            value={form.hospital_id}
                            onChange={handleHospitalChange}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-red-700 focus:ring-1 focus:ring-red-800"
                        >
                            <option value="">Select a hospital...</option>
                            {hospitals.filter(h => h.is_verified).map(h => (
                                <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Service Select */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-400" htmlFor="service-select">
                            Service
                        </label>
                        <select
                            id="service-select"
                            value={form.service_id}
                            onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
                            disabled={services.length === 0}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-red-700 focus:ring-1 focus:ring-red-800 disabled:opacity-50"
                        >
                            <option value="">
                                {services.length === 0 ? 'Select a hospital first...' : 'Select a service...'}
                            </option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.service_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Select */}
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-400">
                            New Status
                        </label>
                        <div className="flex flex-col gap-2">
                            {statuses.map(s => (
                                <label
                                    key={s.value}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all
                                        ${form.status === s.value
                                            ? 'border-red-700 bg-red-950/20'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value={s.value}
                                        checked={form.status === s.value}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                        className="accent-red-500"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-white">{s.label}</p>
                                        <p className="text-xs text-slate-500">{s.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !form.hospital_id || !form.service_id}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                        {loading ? 'Generating...' : '🔗 Generate Magic Link'}
                    </button>
                </div>
            </div>

            {/* Result Panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="mb-1 font-['Syne',sans-serif] text-base font-bold text-white">
                    📋 Generated Link
                </h2>
                <p className="mb-6 text-xs text-slate-500">
                    Send this link to the hospital via WhatsApp or SMS.
                    It expires in 48 hours and can only be used once.
                </p>

                {!result && (
                    <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-700">
                        <span className="text-4xl">🔗</span>
                        <p className="text-sm">No link generated yet</p>
                    </div>
                )}

                {result?.type === 'error' && (
                    <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-4" role="alert">
                        <p className="text-sm font-semibold text-red-400">⚠️ {result.message}</p>
                    </div>
                )}

                {result?.type === 'success' && (
                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4">
                            <p className="text-sm font-semibold text-emerald-400">✅ {result.message}</p>
                        </div>

                        {result.link && (
                            <div>
                                <p className="mb-2 text-xs font-semibold text-slate-400">Magic Link URL:</p>
                                <div className="flex gap-2">
                                    <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-emerald-400">
                                        {result.link}
                                    </code>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(result.link)}
                                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 transition hover:text-white"
                                        aria-label="Copy magic link"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <p className="mt-3 text-xs text-slate-600">
                                    ⚠️ Remove the magic_link from API response in production. Send it only via WhatsApp/SMS.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// SECURITY: Read CSRF token from Laravel's cookie
function getCsrfToken() {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1]
        ?.replace(/%3D/g, '=') ?? '';
}