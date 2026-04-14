import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';

/**
 * MagicUpdate — 1-tap stock update for hospital staff.
 * Sent via WhatsApp magic link. 3 huge buttons only.
 * Designed for low-literacy users on slow connections.
 * SEO: noindex — private page.
 */
export default function MagicUpdate() {
    const [token, setToken] = useState('');
    const [step, setStep]   = useState('loading'); // loading|ready|updating|success|error|expired

    useEffect(() => {
        const t = new URLSearchParams(window.location.search).get('token');
        if (!t || t.length !== 64) { setStep('expired'); return; }
        setToken(t);
        setStep('ready');
    }, []);

    const update = async (status) => {
        setStep('updating');
        try {
            const res  = await fetch(`/api/magic-link/verify?token=${encodeURIComponent(token)}`, {
                headers: {'Accept':'application/json'},
            });
            const json = await res.json();
            setStep(json.status === 'success' ? 'success' : 'error');
        } catch { setStep('error'); }
    };

    const buttons = [
        { status:'available', emoji:'✅', label:'AVAILABLE',     sub:'We have this in stock',   bg:'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40' },
        { status:'low',       emoji:'⚠️', label:'LOW STOCK',     sub:'Running low — limited',  bg:'bg-amber-500 hover:bg-amber-400 shadow-amber-500/30 text-black' },
        { status:'none',      emoji:'❌', label:'NOT AVAILABLE', sub:'We do not have this now', bg:'bg-red-700 hover:bg-red-600 shadow-red-700/40' },
    ];

    return (
        <>
            <Head>
                <title>Update Stock — QuickCure NG</title>
                <meta name="robots" content="noindex, nofollow" />
                <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="flex min-h-screen flex-col items-center justify-center bg-[#080c10] px-4 font-['DM_Sans',sans-serif] text-white">
                <div className="flex items-center gap-2 mb-8">
                    <span className="text-2xl text-red-500 animate-pulse">✚</span>
                    <span className="font-['Syne',sans-serif] text-xl font-extrabold">QuickCure NG</span>
                </div>

                {step === 'loading' && (
                    <div className="flex flex-col items-center gap-3">
                        <span className="w-8 h-8 border-2 rounded-full animate-spin border-slate-700 border-t-red-500" />
                        <p className="text-slate-500">Loading...</p>
                    </div>
                )}

                {step === 'ready' && (
                    <div className="w-full max-w-sm">
                        <div className="p-5 mb-8 text-center border rounded-2xl border-slate-800 bg-slate-900/60">
                            <p className="text-sm text-slate-500">Tap one button to update your service status</p>
                            <p className="mt-2 text-xs text-slate-600">This link works only once and expires in 48 hours.</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            {buttons.map(b => (
                                <button key={b.status} onClick={() => update(b.status)}
                                    aria-label={`Mark service as ${b.label}`}
                                    className={`flex flex-col items-center gap-2 rounded-2xl px-6 py-7 text-white shadow-2xl transition-all duration-200 active:scale-95 ${b.bg}`}>
                                    <span className="text-5xl" aria-hidden="true">{b.emoji}</span>
                                    <span className="font-['Syne',sans-serif] text-2xl font-extrabold">{b.label}</span>
                                    <span className="text-sm opacity-80">{b.sub}</span>
                                </button>
                            ))}
                        </div>
                        <p className="mt-6 text-xs text-center text-slate-700">This link was sent securely to your hospital. Do not share it.</p>
                    </div>
                )}

                {step === 'updating' && (
                    <div className="flex flex-col items-center gap-4">
                        <span className="w-10 h-10 border-2 rounded-full animate-spin border-slate-700 border-t-emerald-400" />
                        <p className="font-['Syne',sans-serif] text-lg font-bold text-white">Updating...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span className="text-6xl">✅</span>
                        <p className="font-['Syne',sans-serif] text-2xl font-extrabold text-white">Updated!</p>
                        <p className="max-w-xs text-sm text-slate-400">Thank you. Patients will now see the correct information for your hospital.</p>
                        <p className="mt-2 text-xs text-slate-600">You can now close this page.</p>
                    </div>
                )}

                {step === 'expired' && (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span className="text-5xl">⏰</span>
                        <p className="font-['Syne',sans-serif] text-xl font-bold text-white">Link Expired</p>
                        <p className="max-w-xs text-sm text-slate-400">This link has already been used or has expired. Please contact QuickCure NG for a new update link.</p>
                    </div>
                )}

                {step === 'error' && (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span className="text-5xl">⚠️</span>
                        <p className="font-['Syne',sans-serif] text-xl font-bold text-red-400">Update Failed</p>
                        <p className="max-w-xs text-sm text-slate-400">Something went wrong. Please try again or contact support.</p>
                        <button onClick={() => setStep('ready')} className="px-6 py-3 mt-2 text-sm font-semibold text-white transition rounded-xl bg-slate-800 hover:bg-slate-700">Try Again</button>
                    </div>
                )}
            </div>
        </>
    );
}