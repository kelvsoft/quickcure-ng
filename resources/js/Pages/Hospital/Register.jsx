import { useState } from 'react';
import { Head } from '@inertiajs/react';

const NIGERIAN_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue',
    'Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu',
    'FCT - Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina',
    'Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo',
    'Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

const CATEGORY_LABELS = {
    emergency:    '🚨 Emergency',
    blood_bank:   '🩸 Blood Bank',
    critical_care:'🛏 Critical Care',
    respiratory:  '💨 Respiratory',
    surgery:      '🔪 Surgery',
    diagnostics:  '🧪 Diagnostics',
    maternity:    '👶 Maternity',
    cardiology:   '🫀 Cardiology',
    neurology:    '🧠 Neurology',
    renal:        '🫁 Renal',
    mental_health:'🧘 Mental Health',
};

export default function Register({ services = [] }) {
    const [step, setStep]   = useState(1);
    const [form, setForm]   = useState({
        hospital_name:'', address:'', state:'', lga:'',
        whatsapp_number:'', email:'', contact_person:'',
        mdcn_license:'', cac_number:'',
        selected_services:[], consent: false,
    });
    const [errMsg, setErrMsg]   = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [apiStep, setApiStep] = useState('idle');

    const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const toggle = (id)   => setForm(f => ({
        ...f,
        selected_services: f.selected_services.includes(id)
            ? f.selected_services.filter(s => s !== id)
            : [...f.selected_services, id],
    }));

    const getCsrf = () => document.cookie.split('; ').find(r=>r.startsWith('XSRF-TOKEN='))?.split('=')[1]?.replace(/%3D/g,'=') ?? '';

    // Group services by category
    const grouped = services.reduce((acc, svc) => {
        if (!acc[svc.category]) acc[svc.category] = [];
        acc[svc.category].push(svc);
        return acc;
    }, {});

    const validateStep = () => {
        setErrMsg(''); setFieldErrors({});
        if (step === 1) {
            if (!form.hospital_name) { setErrMsg('Hospital name is required.'); return false; }
            if (!form.state)         { setErrMsg('Please select your state.'); return false; }
            if (!form.address)       { setErrMsg('Address is required.'); return false; }
        }
        if (step === 2) {
            if (!form.whatsapp_number) { setErrMsg('WhatsApp number is required.'); return false; }
            if (!form.email)           { setErrMsg('Email is required.'); return false; }
            if (!form.contact_person)  { setErrMsg('Contact person name is required.'); return false; }
            if (!form.mdcn_license)    { setErrMsg('MDCN license number is required.'); return false; }
        }
        if (step === 3) {
            if (form.selected_services.length === 0) { setErrMsg('Please select at least one service you offer.'); return false; }
        }
        return true;
    };

    const next = () => { if (validateStep()) setStep(s => s + 1); };

    const submit = async () => {
        if (!form.consent) { setErrMsg('Please accept the terms to continue.'); return; }
        setApiStep('submitting');

        try {
            const res  = await fetch('/register-hospital', {
                method: 'POST',
                headers: { 'Content-Type':'application/json','Accept':'application/json','X-XSRF-TOKEN':getCsrf() },
                body: JSON.stringify({ ...form, consent: true }),
            });
            const json = await res.json();

            if (json.status === 'success') {
                setApiStep('success');
            } else {
                setFieldErrors(json.errors ?? {});
                setErrMsg(json.message ?? 'Submission failed.');
                setApiStep('idle');
            }
        } catch {
            setErrMsg('Network error. Please try again.');
            setApiStep('idle');
        }
    };

    const inputCls = (field) =>
        `w-full rounded-xl border ${fieldErrors[field]?'border-red-700 bg-red-950/10':'border-slate-700 bg-slate-800'} px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition`;

    const Steps = () => (
        <div className="mb-8 flex items-center gap-2">
            {['Hospital Info','Contact & License','Services'].map((label, i) => (
                <div key={i} className="flex flex-1 items-center gap-2">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${step > i+1 ? 'bg-emerald-600 text-white' : step === i+1 ? 'bg-red-600 text-white ring-4 ring-red-600/20' : 'bg-slate-800 text-slate-500'}`}>
                        {step > i+1 ? '✓' : i+1}
                    </div>
                    <div className="hidden min-w-0 flex-1 sm:block">
                        <p className={`truncate text-[10px] font-semibold ${step === i+1 ? 'text-white' : 'text-slate-600'}`}>{label}</p>
                    </div>
                    {i < 2 && <div className={`h-0.5 w-4 flex-shrink-0 rounded sm:hidden ${step > i+1 ? 'bg-emerald-600':'bg-slate-800'}`} />}
                </div>
            ))}
        </div>
    );

    if (apiStep === 'submitting') return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#080c10] gap-4">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />
            <p className="font-['Syne',sans-serif] text-lg font-bold text-white">Submitting your registration...</p>
        </div>
    );

    if (apiStep === 'success') return (
        <>
            <Head><title>Registration Submitted — QuickCure NG</title></Head>
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#080c10] px-4 text-center font-['DM_Sans',sans-serif]">
                <span className="text-6xl mb-5">✅</span>
                <h1 className="font-['Syne',sans-serif] text-2xl font-extrabold text-white mb-3">Registration Submitted!</h1>
                <p className="max-w-md text-sm leading-relaxed text-slate-400 mb-6">
                    We will verify your MDCN license on <strong className="text-white">mdcn.gov.ng</strong> and contact you on WhatsApp at <strong className="text-white">{form.whatsapp_number}</strong> within <strong className="text-white">48 hours</strong>.
                </p>
                <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/40 p-5 text-left text-sm text-slate-400 max-w-md w-full">
                    <p className="mb-3 font-bold text-white">What happens next:</p>
                    <div className="flex flex-col gap-2">
                        {['We check your MDCN license number on mdcn.gov.ng','We verify your address on Google Maps','You get a WhatsApp confirmation within 48 hours','Once approved, you receive your update link via WhatsApp','Patients can find your hospital on Sabi Hospital'].map((t,i)=>(
                            <div key={i} className="flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">✓</span>
                                <span>{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <a href="/" className="rounded-xl bg-red-600 px-8 py-3 font-['Syne',sans-serif] text-sm font-bold text-white transition hover:bg-red-500">
                    Back to Sabi Hospital
                </a>
            </div>
        </>
    );

    return (
        <>
            <Head>
                <title>Register Your Hospital — Sabi Hospital | QuickCure NG</title>
                <meta name="description" content="Register your hospital on Sabi Hospital (QuickCure NG). Help Nigerians find your emergency services — blood banks, ICU beds, oxygen, anti-venom — in real-time." />
                <meta name="keywords" content="register hospital Nigeria, Sabi Hospital registration, MDCN verified hospital, QuickCure NG hospital" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://quickcure-ng.com/register-hospital" />
                <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-[#080c10] font-['DM_Sans',sans-serif] text-white">
                <header className="border-b border-slate-800 bg-[#0d1520] px-4 py-4">
                    <div className="mx-auto flex max-w-2xl items-center justify-between">
                        <a href="/" className="flex items-center gap-2">
                            <span className="text-xl text-red-500">✚</span>
                            <span className="font-['Syne',sans-serif] text-lg font-extrabold">Sabi Hospital</span>
                            <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-800/60">NG</span>
                        </a>
                        <a href="/register-clinic" className="text-xs text-amber-500 hover:text-amber-400">
                            Register a beauty clinic instead →
                        </a>
                    </div>
                </header>

                <div className="mx-auto max-w-2xl px-4 py-10">
                    <div className="mb-10 text-center">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-800/40 bg-red-950/20 px-3 py-1.5">
                            <span className="text-sm">🚨</span>
                            <span className="text-xs font-bold text-red-400">Emergency Track</span>
                        </div>
                        <h1 className="font-['Syne',sans-serif] text-3xl font-extrabold sm:text-4xl">
                            Register Your Hospital
                        </h1>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                            Join Sabi Hospital and let Nigerians find your emergency services in real-time. Verification takes 24-48 hours. MDCN facility license required.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                        <Steps />

                        {/* STEP 1 — Hospital Info */}
                        {step === 1 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold mb-2">Hospital Information</h2>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Hospital Name *</label>
                                    <input type="text" value={form.hospital_name} maxLength={150}
                                        onChange={e=>set('hospital_name',e.target.value)}
                                        placeholder="e.g. St. Nicholas Hospital"
                                        className={inputCls('hospital_name')} />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">State *</label>
                                    <select value={form.state} onChange={e=>set('state',e.target.value)} className={inputCls('state')}>
                                        <option value="">Select state...</option>
                                        {NIGERIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">LGA (Local Government Area)</label>
                                    <input type="text" value={form.lga} maxLength={100}
                                        onChange={e=>set('lga',e.target.value)}
                                        placeholder="e.g. Lagos Island"
                                        className={inputCls('lga')} />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Full Address *</label>
                                    <textarea value={form.address} maxLength={300} rows={3}
                                        onChange={e=>set('address',e.target.value)}
                                        placeholder="Street address, building, nearest landmark..."
                                        className={`${inputCls('address')} resize-none`} />
                                </div>
                            </div>
                        )}

                        {/* STEP 2 — Contact & License */}
                        {step === 2 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold mb-2">Contact & Verification</h2>

                                <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
                                    <p className="text-xs leading-relaxed text-amber-300">
                                        📱 <strong>Your WhatsApp number is your identity on Sabi Hospital.</strong> When you want to update your stock, you send "update" to our WhatsApp bot and a secure one-time link is sent back to this number. Make sure it is active.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">WhatsApp Number * (This is your update identity)</label>
                                    <input type="tel" value={form.whatsapp_number}
                                        onChange={e=>set('whatsapp_number',e.target.value.replace(/[^0-9+\s]/g,'').slice(0,20))}
                                        placeholder="e.g. 08012345678"
                                        className={inputCls('whatsapp_number')} />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Email Address *</label>
                                    <input type="email" value={form.email} maxLength={100}
                                        onChange={e=>set('email',e.target.value)}
                                        placeholder="hospital@example.com"
                                        className={inputCls('email')} />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Contact Person Name *</label>
                                    <input type="text" value={form.contact_person} maxLength={100}
                                        onChange={e=>set('contact_person',e.target.value)}
                                        placeholder="Full name of person registering"
                                        className={inputCls('contact_person')} />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">MDCN Facility License Number *</label>
                                    <input type="text" value={form.mdcn_license} maxLength={50}
                                        onChange={e=>set('mdcn_license',e.target.value.toUpperCase())}
                                        placeholder="e.g. MDCN/12345"
                                        className={inputCls('mdcn_license')} />
                                    <p className="mt-1 text-[10px] text-slate-600">We verify this on mdcn.gov.ng. Fake numbers = permanent ban.</p>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">CAC Registration Number (optional but recommended)</label>
                                    <input type="text" value={form.cac_number} maxLength={50}
                                        onChange={e=>set('cac_number',e.target.value.toUpperCase())}
                                        placeholder="e.g. RC123456"
                                        className={inputCls('cac_number')} />
                                </div>
                            </div>
                        )}

                        {/* STEP 3 — Services Selection */}
                        {step === 3 && (
                            <div>
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold mb-1">What services do you offer?</h2>
                                <p className="mb-5 text-sm text-slate-400">
                                    Select only services your hospital actually provides. These are the only ones that will appear on your update page. You can add more later through your dashboard.
                                </p>

                                <div className="flex flex-col gap-6">
                                    {Object.entries(grouped).map(([cat, svcs]) => (
                                        <div key={cat}>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                                {CATEGORY_LABELS[cat] ?? cat}
                                            </p>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {svcs.map(svc => {
                                                    const selected = form.selected_services.includes(svc.id);
                                                    return (
                                                        <label key={svc.id}
                                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${selected ? 'border-red-600 bg-red-950/20' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'}`}>
                                                            <input type="checkbox" checked={selected}
                                                                onChange={()=>toggle(svc.id)}
                                                                className="accent-red-500 h-4 w-4 flex-shrink-0" />
                                                            <span className="text-sm text-white">{svc.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {form.selected_services.length > 0 && (
                                    <div className="mt-5 rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3">
                                        <p className="text-xs text-emerald-400">
                                            ✓ <strong>{form.selected_services.length} service{form.selected_services.length !== 1 ? 's' : ''}</strong> selected
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 4 — Review & Submit */}
                        {step === 4 && (
                            <div>
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold mb-5">Review & Submit</h2>

                                <div className="mb-5 rounded-xl border border-slate-700 bg-slate-800/40 p-4 flex flex-col gap-2">
                                    {[
                                        ['Hospital', form.hospital_name],
                                        ['State', form.state],
                                        ['WhatsApp', form.whatsapp_number],
                                        ['MDCN', form.mdcn_license],
                                        ['Services', `${form.selected_services.length} selected`],
                                    ].map(([k,v]) => (
                                        <div key={k} className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500">{k}</span>
                                            <span className="text-xs font-semibold text-white">{v}</span>
                                        </div>
                                    ))}
                                </div>

                                <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                                    <input type="checkbox" checked={form.consent} onChange={e=>set('consent',e.target.checked)} className="mt-0.5 accent-red-500" />
                                    <p className="text-xs leading-relaxed text-slate-400">
                                        I confirm all information is accurate. I understand that providing a false MDCN license number will result in permanent removal and may be reported to relevant authorities. I agree to QuickCure NG's <a href="/legal" className="underline" target="_blank" rel="noopener noreferrer">terms of service</a>.
                                    </p>
                                </label>
                            </div>
                        )}

                        {errMsg && <p className="mt-4 text-xs text-red-400">{errMsg}</p>}

                        {/* Navigation buttons */}
                        <div className={`mt-6 flex gap-3 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
                            {step > 1 && (
                                <button onClick={()=>setStep(s=>s-1)} className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700">
                                    ← Back
                                </button>
                            )}
                            {step < 4 && (
                                <button onClick={next} className="flex-1 rounded-xl bg-red-600 py-3 font-['Syne',sans-serif] text-sm font-bold text-white transition hover:bg-red-500">
                                    Next →
                                </button>
                            )}
                            {step === 4 && (
                                <button onClick={submit} disabled={!form.consent}
                                    className="flex-1 rounded-xl bg-red-600 py-3 font-['Syne',sans-serif] text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Submit Registration
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}