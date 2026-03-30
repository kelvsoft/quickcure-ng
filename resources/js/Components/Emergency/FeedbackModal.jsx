import { useState } from 'react';

export default function FeedbackModal({ hospital, userCoords, onClose }) {
    const [type, setType]     = useState('');
    const [comment, setComment] = useState('');
    const [step, setStep]     = useState('form'); // form|submitting|success|error|no_gps

    const types = [
        { v:'service_unavailable', label:'❌ Service not here',  desc:'They listed it but it\'s not available' },
        { v:'wrong_info',          label:'⚠️ Wrong info',        desc:'Phone, address or details are wrong' },
        { v:'great_service',       label:'✅ Great service',      desc:'Info was correct and they helped me' },
        { v:'other',               label:'💬 Other',              desc:'Something else to report' },
    ];

    const getCsrf = () => document.cookie.split('; ').find(r=>r.startsWith('XSRF-TOKEN='))?.split('=')[1]?.replace(/%3D/g,'=') ?? '';

    const submit = async () => {
        if (!type) return;
        if (!userCoords) { setStep('no_gps'); return; }
        setStep('submitting');

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type':'application/json','Accept':'application/json','X-XSRF-TOKEN':getCsrf() },
                body: JSON.stringify({ hospital_id:hospital.id, type, comment:comment.slice(0,500), reporter_lat:userCoords.lat, reporter_lng:userCoords.lng }),
            });
            const json = await res.json();
            setStep(json.status === 'success' ? 'success' : 'error');
        } catch { setStep('error'); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            role="dialog" aria-modal="true" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
            <div className="w-full max-w-md rounded-t-3xl border border-slate-700 bg-[#0d1520] p-6 sm:rounded-3xl">

                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="font-['Syne',sans-serif] text-lg font-bold text-white">Report Feedback</h2>
                        <p className="mt-0.5 text-xs text-slate-500">{hospital?.name}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white">✕</button>
                </div>

                {step === 'form' && (<>
                    <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2.5">
                        <p className="text-xs text-slate-400">📍 <strong className="text-white">GPS verification active.</strong> You must be within 500m of this hospital to submit.</p>
                    </div>
                    <div className="mb-4 flex flex-col gap-2">
                        {types.map(t => (
                            <label key={t.v} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all ${type===t.v?'border-red-700 bg-red-950/20':'border-slate-700 bg-slate-800/40 hover:border-slate-600'}`}>
                                <input type="radio" name="fbt" value={t.v} checked={type===t.v} onChange={()=>setType(t.v)} className="mt-0.5 accent-red-500" />
                                <div>
                                    <p className="text-sm font-semibold text-white">{t.label}</p>
                                    <p className="text-xs text-slate-500">{t.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                    <textarea value={comment} onChange={e=>setComment(e.target.value.slice(0,500))} rows={3}
                        placeholder="Additional details (optional)..."
                        className="mb-5 w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-red-700" />
                    <button onClick={submit} disabled={!type}
                        className="w-full rounded-xl bg-red-600 py-3 font-['Syne',sans-serif] text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50">
                        Submit Feedback
                    </button>
                </>)}

                {step === 'no_gps' && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <span className="text-4xl">📍</span>
                        <p className="font-['Syne',sans-serif] text-base font-bold text-amber-400">Location Required</p>
                        <p className="text-sm text-slate-400">You must be at the hospital to submit. Please enable GPS and search again first.</p>
                        <button onClick={onClose} className="mt-2 rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white">Close</button>
                    </div>
                )}

                {step === 'submitting' && (
                    <div className="flex flex-col items-center gap-3 py-10">
                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
                        <p className="text-sm text-slate-400">Verifying location and submitting...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <span className="text-4xl">✅</span>
                        <p className="font-['Syne',sans-serif] text-lg font-bold text-white">Thank you!</p>
                        <p className="text-sm text-slate-400">Your report helps keep this information accurate for everyone.</p>
                        <button onClick={onClose} className="mt-2 rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white">Done</button>
                    </div>
                )}

                {step === 'error' && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <span className="text-4xl">⚠️</span>
                        <p className="font-['Syne',sans-serif] text-base font-bold text-red-400">Could not submit</p>
                        <p className="text-sm text-slate-400">You may be too far from the hospital, or the link has expired.</p>
                        <button onClick={()=>setStep('form')} className="mt-2 rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white">Try Again</button>
                    </div>
                )}
            </div>
        </div>
    );
}