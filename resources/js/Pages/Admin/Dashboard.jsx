import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import HospitalTable from '@/Components/Admin/HospitalTable';
import SendMagicLink from '@/Components/Admin/SendMagicLink';

const NIGERIAN_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue',
    'Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu',
    'FCT - Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina',
    'Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo',
    'Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

export default function Dashboard({
    hospitals = [], stats = {}, alerts = [],
    pendingEmergency = [], pendingBeauty = [],
}) {
    const [tab, setTab]           = useState('overview');
    const [alertForm, setAlertForm] = useState({ title:'', message:'', severity:'warning', state:'' });
    const [rejectModal, setRejectModal] = useState(null); // { type, id }
    const [rejectReason, setRejectReason] = useState('');

    const tabs = [
        { id:'overview',   label:'Overview',    icon:'📊' },
        { id:'emergency',  label:'Emergency',   icon:'🚨', badge: pendingEmergency.length },
        { id:'beauty',     label:'Beauty',      icon:'✨', badge: pendingBeauty.length },
        { id:'hospitals',  label:'Hospitals',   icon:'🏥' },
        { id:'magiclinks', label:'Magic Links', icon:'🔗' },
        { id:'alerts',     label:'Alerts',      icon:'📡' },
    ];

    const statCards = [
        { label:'Total Hospitals',      value:stats.total         ??0, icon:'🏥', color:'border-blue-800/40 bg-blue-950/20',     text:'text-blue-400'    },
        { label:'Verified',             value:stats.verified       ??0, icon:'✅', color:'border-emerald-800/40 bg-emerald-950/20',text:'text-emerald-400' },
        { label:'Pending Verification', value:stats.unverified     ??0, icon:'⏳', color:'border-amber-800/40 bg-amber-950/20',   text:'text-amber-400'   },
        { label:'Active Services',      value:stats.activeServices ??0, icon:'💊', color:'border-red-800/40 bg-red-950/20',       text:'text-red-400'     },
    ];

    const approveEmergency = (id) => router.patch(`/admin/registrations/emergency/${id}/approve`, {}, { preserveScroll:true });
    const approveBeauty    = (id) => router.patch(`/admin/registrations/beauty/${id}/approve`, {}, { preserveScroll:true });
    const underReview      = (id) => router.patch(`/admin/registrations/beauty/${id}/under-review`, {}, { preserveScroll:true });

    const submitReject = () => {
        if (!rejectReason) return;
        const { type, id } = rejectModal;
        router.patch(`/admin/registrations/${type}/${id}/reject`, { reason: rejectReason }, {
            preserveScroll: true,
            onSuccess: () => { setRejectModal(null); setRejectReason(''); },
        });
    };

    const submitAlert = () => {
        if (!alertForm.title || !alertForm.message) return;
        router.post('/admin/alerts', alertForm, {
            preserveScroll: true,
            onSuccess: () => setAlertForm({ title:'', message:'', severity:'warning', state:'' }),
        });
    };

    return (
        <>
            <Head>
                <title>Admin — QuickCure NG</title>
                <meta name="robots" content="noindex, nofollow" />
                <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
                <meta httpEquiv="X-Frame-Options" content="DENY" />
                <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-[#080c10] font-['DM_Sans',sans-serif] text-white">

                {/* Nav */}
                <header className="sticky top-0 z-10 border-b border-slate-800 bg-[#0d1520]/95 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="animate-pulse text-red-500">✚</span>
                            <span className="font-['Syne',sans-serif] text-lg font-extrabold">QuickCure NG</span>
                            <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-800/60">ADMIN</span>
                        </div>
                        <div className="flex gap-2">
                            <a href="/" target="_blank" rel="noopener noreferrer"
                                className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700">
                                View Site ↗
                            </a>
                            <button onClick={() => router.post('/logout')}
                                className="rounded-lg bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-400 ring-1 ring-red-900/50 hover:bg-red-950/70">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </header>

                <div className="mx-auto max-w-7xl px-4 py-8">

                    <div className="mb-8">
                        <h1 className="font-['Syne',sans-serif] text-3xl font-extrabold">Dashboard</h1>
                        <p className="mt-1 text-sm text-slate-500">Manage hospitals, review registrations, publish alerts.</p>
                    </div>

                    {/* Stats */}
                    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {statCards.map(c=>(
                            <div key={c.label} className={`rounded-2xl border p-5 transition-all hover:-translate-y-0.5 ${c.color}`}>
                                <div className="mb-3 text-2xl">{c.icon}</div>
                                <div className={`font-['Syne',sans-serif] text-3xl font-extrabold ${c.text}`}>{(c.value).toLocaleString()}</div>
                                <div className="mt-1 text-xs text-slate-500">{c.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 p-1" role="tablist">
                        {tabs.map(t=>(
                            <button key={t.id} role="tab" aria-selected={tab===t.id} onClick={()=>setTab(t.id)}
                                className={`relative flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${tab===t.id?'bg-slate-700 text-white':'text-slate-500 hover:text-slate-300'}`}>
                                <span>{t.icon}</span>
                                <span className="hidden sm:inline">{t.label}</span>
                                {t.badge > 0 && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                                        {t.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* OVERVIEW */}
                    {tab === 'overview' && (
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                                <h2 className="mb-4 font-['Syne',sans-serif] text-base font-bold">🚨 Emergency Pending ({pendingEmergency.length})</h2>
                                {pendingEmergency.length === 0
                                    ? <p className="text-sm text-slate-600">No pending emergency registrations</p>
                                    : pendingEmergency.slice(0,3).map(r=>(
                                        <div key={r.id} className="mb-3 flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{r.hospital_name}</p>
                                                <p className="text-xs text-slate-500">{r.state} · MDCN: {r.mdcn_license}</p>
                                            </div>
                                            <button onClick={()=>setTab('emergency')} className="text-xs text-red-400 hover:text-red-300">Review →</button>
                                        </div>
                                    ))
                                }
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                                <h2 className="mb-4 font-['Syne',sans-serif] text-base font-bold">✨ Beauty Pending ({pendingBeauty.length})</h2>
                                {pendingBeauty.length === 0
                                    ? <p className="text-sm text-slate-600">No pending beauty registrations</p>
                                    : pendingBeauty.slice(0,3).map(r=>(
                                        <div key={r.id} className="mb-3 flex items-center justify-between rounded-lg bg-amber-950/20 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-amber-100">{r.clinic_name}</p>
                                                <p className="text-xs text-amber-800">Dr. {r.surgeon_name} · {r.state}</p>
                                            </div>
                                            <button onClick={()=>setTab('beauty')} className="text-xs text-amber-400 hover:text-amber-300">Review →</button>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* EMERGENCY REGISTRATIONS */}
                    {tab === 'emergency' && (
                        <div className="flex flex-col gap-4">
                            <h2 className="font-['Syne',sans-serif] text-lg font-bold">🚨 Emergency Hospital Registrations</h2>
                            <p className="text-sm text-slate-500 -mt-2">Verify MDCN number on <a href="https://mdcn.gov.ng" target="_blank" rel="noopener noreferrer" className="text-red-400 underline">mdcn.gov.ng</a> before approving.</p>

                            {pendingEmergency.length === 0 ? (
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-600">
                                    No pending emergency registrations ✓
                                </div>
                            ) : pendingEmergency.map(r => (
                                <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div>
                                            <h3 className="font-['Syne',sans-serif] text-base font-bold text-white">{r.hospital_name}</h3>
                                            <p className="text-xs text-slate-500 mt-1">{r.state} · {r.whatsapp_number} · {r.email}</p>
                                        </div>
                                        <span className="rounded-full bg-amber-950/40 px-2 py-1 text-[10px] font-bold text-amber-400 ring-1 ring-amber-800/40 flex-shrink-0">PENDING</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                                            <p className="text-[10px] text-slate-500 mb-0.5">MDCN License</p>
                                            <p className="text-sm font-bold text-white">{r.mdcn_license}</p>
                                            <a href={`https://mdcn.gov.ng`} target="_blank" rel="noopener noreferrer"
                                                className="text-[10px] text-red-400 hover:text-red-300">Verify on mdcn.gov.ng ↗</a>
                                        </div>
                                        <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                                            <p className="text-[10px] text-slate-500 mb-0.5">Services Selected</p>
                                            <p className="text-sm font-bold text-white">{r.selected_services?.length ?? 0} services</p>
                                            <p className="text-[10px] text-slate-500">{r.selected_services?.slice(0,3).join(', ')}{r.selected_services?.length > 3 ? '...' : ''}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={()=>approveEmergency(r.id)}
                                            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500">
                                            ✅ Approve & Create Hospital
                                        </button>
                                        <button onClick={()=>setRejectModal({type:'emergency',id:r.id})}
                                            className="flex-1 rounded-xl bg-red-950/40 py-2.5 text-xs font-bold text-red-400 ring-1 ring-red-800/50 transition hover:bg-red-950/70">
                                            ❌ Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* BEAUTY REGISTRATIONS */}
                    {tab === 'beauty' && (
                        <div className="flex flex-col gap-4">
                            <h2 className="font-['Syne',sans-serif] text-lg font-bold">✨ Beauty Clinic Applications</h2>
                            <p className="text-sm text-amber-800 -mt-2">Strict verification required. Check MDCN, Google the surgeon, reverse image search portfolio.</p>

                            {pendingBeauty.length === 0 ? (
                                <div className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-10 text-center text-amber-900">
                                    No pending beauty applications ✓
                                </div>
                            ) : pendingBeauty.map(r => (
                                <div key={r.id} className="rounded-2xl border border-amber-900/30 bg-[#13100a]/80 p-5">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div>
                                            <h3 className="font-['Syne',sans-serif] text-base font-bold text-amber-50">{r.clinic_name}</h3>
                                            <p className="text-xs text-amber-800 mt-0.5">Dr. {r.surgeon_name} · {r.state} · {r.years_experience} yrs exp · {r.procedures_performed} procedures</p>
                                        </div>
                                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold flex-shrink-0 ${r.status==='under_review'?'bg-blue-950/40 text-blue-400 ring-1 ring-blue-800/40':'bg-amber-950/40 text-amber-400 ring-1 ring-amber-800/40'}`}>
                                            {r.status === 'under_review' ? 'REVIEWING' : 'PENDING'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="rounded-lg bg-amber-950/20 px-3 py-2">
                                            <p className="text-[10px] text-amber-800 mb-0.5">Surgeon MDCN</p>
                                            <p className="text-sm font-bold text-amber-100">{r.surgeon_mdcn}</p>
                                            <a href="https://mdcn.gov.ng" target="_blank" rel="noopener noreferrer"
                                                className="text-[10px] text-amber-500 hover:text-amber-400">Verify on mdcn.gov.ng ↗</a>
                                        </div>
                                        {r.lsmoh_license && (
                                            <div className="rounded-lg bg-amber-950/20 px-3 py-2">
                                                <p className="text-[10px] text-amber-800 mb-0.5">LSMOH</p>
                                                <p className="text-sm font-bold text-amber-100">{r.lsmoh_license}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4 flex flex-wrap gap-2">
                                        {r.clinic_photo_path && (
                                            <a href={`/admin/documents/${btoa(r.clinic_photo_path)}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-950/40">
                                                🏥 View Clinic Photo
                                            </a>
                                        )}
                                        {r.mdcn_cert_photo_path && (
                                            <a href={`/admin/documents/${btoa(r.mdcn_cert_photo_path)}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-950/40">
                                                📋 View MDCN Certificate
                                            </a>
                                        )}
                                        {r.lsmoh_cert_photo_path && (
                                            <a href={`/admin/documents/${btoa(r.lsmoh_cert_photo_path)}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-950/40">
                                                📋 View LSMOH Certificate
                                            </a>
                                        )}
                                    </div>

                                    {/* Portfolio preview */}
                                    {r.portfolio_photos?.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2">Portfolio ({r.portfolio_photos.length} photos)</p>
                                            <div className="flex gap-2">
                                                {r.portfolio_photos.slice(0,4).map((p,i)=>(
                                                    <a key={i} href={`/admin/documents/${btoa(p)}`} target="_blank" rel="noopener noreferrer"
                                                        className="h-14 w-14 rounded-lg bg-amber-950/40 flex items-center justify-center text-xs text-amber-800 hover:ring-2 hover:ring-amber-500 transition overflow-hidden">
                                                        <img src={`/admin/documents/${btoa(p)}`} alt={`Portfolio ${i+1}`}
                                                            className="h-full w-full object-cover"
                                                            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                                        />
                                                        <span className="hidden h-full w-full items-center justify-center">📸</span>
                                                    </a>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-amber-900 mt-1">⚠️ Reverse image search every photo before approving</p>
                                        </div>
                                        
                                    )}

                                    <div className="flex gap-2">
                                        <button onClick={()=>approveBeauty(r.id)}
                                            className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400">
                                            ✅ Approve
                                        </button>
                                        {r.status !== 'under_review' && (
                                            <button onClick={()=>underReview(r.id)}
                                                className="flex-1 rounded-xl bg-blue-950/40 py-2.5 text-xs font-bold text-blue-400 ring-1 ring-blue-800/50 hover:bg-blue-950/70">
                                                🔍 Under Review
                                            </button>
                                        )}
                                        <button onClick={()=>setRejectModal({type:'beauty',id:r.id})}
                                            className="flex-1 rounded-xl bg-red-950/40 py-2.5 text-xs font-bold text-red-400 ring-1 ring-red-800/50 hover:bg-red-950/70">
                                            ❌ Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'hospitals'  && <HospitalTable hospitals={hospitals} />}
                    {tab === 'magiclinks' && <SendMagicLink hospitals={hospitals} />}

                    {/* ALERTS */}
                    {tab === 'alerts' && (
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                                <h2 className="mb-1 font-['Syne',sans-serif] text-base font-bold">📡 Publish Outbreak Alert</h2>
                                <p className="mb-5 text-xs text-slate-500">Shows as scrolling ticker on emergency search page.</p>
                                <div className="flex flex-col gap-4">
                                    <input type="text" value={alertForm.title} maxLength={100}
                                        onChange={e=>setAlertForm(f=>({...f,title:e.target.value}))}
                                        placeholder="Alert title e.g. Monkeypox Alert — Lagos"
                                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-red-700" />
                                    <textarea value={alertForm.message} maxLength={300} rows={3}
                                        onChange={e=>setAlertForm(f=>({...f,message:e.target.value}))}
                                        placeholder="Alert message..."
                                        className="resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-red-700" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <select value={alertForm.severity} onChange={e=>setAlertForm(f=>({...f,severity:e.target.value}))}
                                            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none">
                                            <option value="info">ℹ️ Info</option>
                                            <option value="warning">⚠️ Warning</option>
                                            <option value="critical">🚨 Critical</option>
                                        </select>
                                        <select value={alertForm.state} onChange={e=>setAlertForm(f=>({...f,state:e.target.value}))}
                                            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none">
                                            <option value="">All states (nationwide)</option>
                                            {NIGERIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={submitAlert}
                                        className="rounded-xl bg-red-600 py-3 font-['Syne',sans-serif] text-sm font-bold text-white hover:bg-red-500">
                                        Publish Alert
                                    </button>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                                <h2 className="mb-4 font-['Syne',sans-serif] text-base font-bold">Active Alerts ({alerts.length})</h2>
                                {alerts.length === 0 ? <p className="text-sm text-slate-600">No active alerts</p> : alerts.map(a=>(
                                    <div key={a.id} className={`mb-3 flex items-start justify-between gap-3 rounded-xl border p-4 ${
                                        a.severity==='critical'?'border-red-800/50 bg-red-950/20':a.severity==='warning'?'border-amber-800/50 bg-amber-950/20':'border-blue-800/50 bg-blue-950/20'}`}>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-white">{a.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{a.message}</p>
                                            {a.state && <p className="text-[10px] text-slate-600 mt-1">📍 {a.state}</p>}
                                        </div>
                                        <button onClick={()=>router.delete(`/admin/alerts/${a.id}`,{preserveScroll:true})}
                                            className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-500 hover:text-red-400 flex-shrink-0">✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
                    onClick={e=>{if(e.target===e.currentTarget){setRejectModal(null);setRejectReason('');}}}>
                    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0d1520] p-6">
                        <h3 className="font-['Syne',sans-serif] text-lg font-bold mb-4">Reject Registration</h3>
                        <p className="text-sm text-slate-400 mb-4">Provide a reason. This will be sent to the applicant so they know why they were rejected and what to fix.</p>
                        <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={4} maxLength={500}
                            placeholder="e.g. MDCN number MDCN/12345 does not match the hospital name provided. Please resubmit with the correct license number."
                            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-red-700 mb-4" />
                        <div className="flex gap-3">
                            <button onClick={()=>{setRejectModal(null);setRejectReason('');}}
                                className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700">
                                Cancel
                            </button>
                            <button onClick={submitReject} disabled={!rejectReason}
                                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}