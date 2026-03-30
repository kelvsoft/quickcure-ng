import { useState } from 'react';
import { Head } from '@inertiajs/react';

const NIGERIAN_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue',
    'Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu',
    'FCT - Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina',
    'Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo',
    'Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

export default function RegisterBeauty({ services = [] }) {
    const [step, setStep]   = useState(1);
    const [form, setForm]   = useState({
        clinic_name:'', address:'', state:'', lga:'',
        surgeon_name:'', surgeon_mdcn:'', lsmoh_license:'',
        specialty_board:'', years_experience:'', procedures_performed:'',
        whatsapp_number:'', email:'', instagram:'', website:'',
        selected_services:[], consent: false,
    });
    const [files, setFiles] = useState({
        clinic_photo: null,
        mdcn_cert_photo: null,
        portfolio_photos: [],
        lsmoh_cert_photo: null,
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

    const setFile = (k, v) => setFiles(f => ({ ...f, [k]: v }));

    const getCsrf = () => document.cookie.split('; ').find(r=>r.startsWith('XSRF-TOKEN='))?.split('=')[1]?.replace(/%3D/g,'=') ?? '';

    const grouped = services.reduce((acc, svc) => {
        if (!acc[svc.category]) acc[svc.category] = [];
        acc[svc.category].push(svc);
        return acc;
    }, {});

    const validateStep = () => {
        setErrMsg(''); setFieldErrors({});
        if (step === 1) {
            if (!form.clinic_name) { setErrMsg('Clinic name is required.'); return false; }
            if (!form.state)       { setErrMsg('Please select your state.'); return false; }
            if (!form.address)     { setErrMsg('Address is required.'); return false; }
        }
        if (step === 2) {
            if (!form.surgeon_name)     { setErrMsg('Surgeon name is required.'); return false; }
            if (!form.surgeon_mdcn)     { setErrMsg('Individual surgeon MDCN number is required.'); return false; }
            if (!form.years_experience) { setErrMsg('Years of experience is required.'); return false; }
        }
        if (step === 3) {
            if (!form.whatsapp_number)  { setErrMsg('WhatsApp number is required.'); return false; }
            if (!form.email)            { setErrMsg('Email is required.'); return false; }
        }
        if (step === 4) {
            if (!files.clinic_photo)              { setErrMsg('Please upload a photo of your clinic.'); return false; }
            if (!files.mdcn_cert_photo)           { setErrMsg('Please upload your MDCN certificate.'); return false; }
            if (files.portfolio_photos.length < 3){ setErrMsg('Please upload at least 3 before/after photos.'); return false; }
        }
        if (step === 5) {
            if (form.selected_services.length === 0) { setErrMsg('Please select at least one procedure you offer.'); return false; }
        }
        return true;
    };

    const next = () => { if (validateStep()) setStep(s => s + 1); };

    const submit = async () => {
        if (!form.consent) { setErrMsg('Please accept the terms to continue.'); return; }
        setApiStep('submitting');

        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'selected_services') {
                    v.forEach(s => fd.append('selected_services[]', s));
                } else {
                    fd.append(k, v);
                }
            });
            if (files.clinic_photo)    fd.append('clinic_photo', files.clinic_photo);
            if (files.mdcn_cert_photo) fd.append('mdcn_cert_photo', files.mdcn_cert_photo);
            if (files.lsmoh_cert_photo)fd.append('lsmoh_cert_photo', files.lsmoh_cert_photo);
            files.portfolio_photos.forEach(f => fd.append('portfolio_photos[]', f));
            fd.append('consent', '1');

            const res  = await fetch('/register-clinic', {
                method:'POST',
                headers:{'Accept':'application/json','X-XSRF-TOKEN':getCsrf()},
                body: fd,
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
        `w-full rounded-xl border ${fieldErrors[field]?'border-red-700 bg-red-950/10':'border-slate-700 bg-slate-800'} px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition`;

    const stepLabels = ['Clinic Info','Surgeon Details','Contact','Documents','Procedures'];

    const Steps = () => (
        <div className="mb-8 flex items-center gap-1">
            {stepLabels.map((label, i) => (
                <div key={i} className="flex flex-1 items-center gap-1">
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all ${step > i+1 ? 'bg-emerald-600 text-white' : step === i+1 ? 'bg-amber-500 text-black ring-4 ring-amber-500/20' : 'bg-slate-800 text-slate-500'}`}>
                        {step > i+1 ? '✓' : i+1}
                    </div>
                    {i < stepLabels.length-1 && <div className={`h-0.5 flex-1 rounded transition-all ${step > i+1 ? 'bg-emerald-600':'bg-slate-800'}`} />}
                </div>
            ))}
        </div>
    );

    const FileUpload = ({ label, field, accept, multiple, required, note }) => (
        <div>
            <label className="mb-1.5 block text-xs font-semibold text-amber-700">{label}{required?' *':''}</label>
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition ${
                (multiple ? files[field].length > 0 : files[field])
                    ? 'border-emerald-700/60 bg-emerald-950/20'
                    : 'border-amber-900/40 bg-amber-950/10 hover:border-amber-700/60'}`}>
                <span className="text-2xl">{multiple ? '📸' : '📄'}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-200 truncate">
                        {multiple
                            ? files[field].length > 0 ? `${files[field].length} photo${files[field].length>1?'s':''} selected` : 'Click to upload photos'
                            : files[field] ? files[field].name : 'Click to upload'}
                    </p>
                    {note && <p className="text-xs text-amber-900/80 mt-0.5">{note}</p>}
                </div>
                <input type="file" accept={accept} multiple={multiple} className="hidden"
                    onChange={e => {
                        if (multiple) {
                            const newFiles = Array.from(e.target.files).filter(f => f.size <= 5*1024*1024);
                            setFile(field, [...files[field], ...newFiles].slice(0,5));
                        } else {
                            if (e.target.files?.[0]?.size <= 5*1024*1024) setFile(field, e.target.files[0]);
                        }
                    }} />
            </label>
            {fieldErrors[field] && <p className="mt-1 text-xs text-red-400">{fieldErrors[field]}</p>}
        </div>
    );

    if (apiStep === 'submitting') return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0800] gap-4 font-['DM_Sans',sans-serif]">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-amber-900 border-t-amber-400" />
            <p className="font-['Syne',sans-serif] text-lg font-bold text-amber-50">Submitting your application...</p>
            <p className="text-sm text-amber-800">Uploading documents, please wait...</p>
        </div>
    );

    if (apiStep === 'success') return (
        <>
            <Head><title>Application Submitted — QuickCure Beauty</title></Head>
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0800] px-4 text-center font-['DM_Sans',sans-serif]">
                <span className="text-6xl mb-5">✨</span>
                <h1 className="font-['Syne',sans-serif] text-2xl font-extrabold text-amber-50 mb-3">Application Submitted!</h1>
                <p className="max-w-md text-sm leading-relaxed text-amber-800 mb-6">
                    Beauty clinic verification takes <strong className="text-amber-300">5-7 business days</strong>. We will manually verify your MDCN number, review your portfolio, and contact you on WhatsApp at <strong className="text-amber-300">{form.whatsapp_number}</strong>.
                </p>
                <div className="mb-8 rounded-xl border border-amber-900/30 bg-amber-950/20 p-5 text-left text-sm text-amber-800 max-w-md w-full">
                    <p className="mb-3 font-bold text-amber-300">Our verification process:</p>
                    {['Cross-check surgeon MDCN on mdcn.gov.ng','Review clinic photos for legitimacy','Verify LSMOH certificate if provided','Reverse image search portfolio photos','Background check on surgeon name','Manual approval by our team'].map((t,i)=>(
                        <div key={i} className="flex items-start gap-2 mb-1.5">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">{i+1}.</span>
                            <span>{t}</span>
                        </div>
                    ))}
                </div>
                <a href="/" className="rounded-xl bg-amber-500 px-8 py-3 font-['Syne',sans-serif] text-sm font-bold text-black transition hover:bg-amber-400">
                    Back to QuickCure NG
                </a>
            </div>
        </>
    );

    return (
        <>
            <Head>
                <title>Register Your Clinic — QuickCure Beauty | QuickCure NG</title>
                <meta name="description" content="Register your aesthetic clinic on QuickCure Beauty. LSMOH and MDCN verification required. BBL, hair transplant, dental veneers, rhinoplasty." />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://quickcure-ng.com/register-clinic" />
                <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-[#0a0800] font-['DM_Sans',sans-serif] text-white">
                <header className="border-b border-amber-900/30 bg-[#13100a] px-4 py-4">
                    <div className="mx-auto flex max-w-2xl items-center justify-between">
                        <a href="/" className="flex items-center gap-2">
                            <span className="text-xl text-amber-500">✨</span>
                            <span className="font-['Syne',sans-serif] text-lg font-extrabold text-amber-50">QuickCure Beauty</span>
                        </a>
                        <a href="/register-hospital" className="text-xs text-slate-500 hover:text-white">
                            Register a hospital instead →
                        </a>
                    </div>
                </header>

                <div className="mx-auto max-w-2xl px-4 py-10">
                    <div className="mb-10 text-center">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-800/40 bg-amber-950/20 px-3 py-1.5">
                            <span className="text-sm">✨</span>
                            <span className="text-xs font-bold text-amber-400">Aesthetics Track — Strict Verification</span>
                        </div>
                        <h1 className="font-['Syne',sans-serif] text-3xl font-extrabold text-amber-50 sm:text-4xl">
                            Register Your Clinic
                        </h1>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-amber-800">
                            We take aesthetics verification seriously. Fake surgeons destroy lives. Every application is manually reviewed. <strong className="text-amber-300">5-7 business days</strong> to process.
                        </p>

                        {/* Red flags warning */}
                        <div className="mt-4 rounded-xl border border-red-800/40 bg-red-950/20 p-4 text-left">
                            <p className="text-xs font-bold text-red-400 mb-1.5">Applications are immediately rejected if:</p>
                            <div className="flex flex-col gap-1 text-xs text-red-300/70">
                                <span>• MDCN number does not match the surgeon name</span>
                                <span>• Before/after photos are stolen from the internet</span>
                                <span>• Clinic address does not exist on Google Maps</span>
                                <span>• No verifiable online presence for the surgeon</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-900/30 bg-[#13100a]/80 p-6">
                        <Steps />

                        {/* STEP 1 — Clinic Info */}
                        {step === 1 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold text-amber-50 mb-2">Clinic Information</h2>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">Clinic / Practice Name *</label>
                                    <input type="text" value={form.clinic_name} maxLength={150} onChange={e=>set('clinic_name',e.target.value)}
                                        placeholder="e.g. Lagos Aesthetics Centre" className={inputCls('clinic_name')} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">State *</label>
                                    <select value={form.state} onChange={e=>set('state',e.target.value)} className={inputCls('state')}>
                                        <option value="">Select state...</option>
                                        {NIGERIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">LGA</label>
                                    <input type="text" value={form.lga} maxLength={100} onChange={e=>set('lga',e.target.value)}
                                        placeholder="e.g. Victoria Island" className={inputCls('lga')} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">Full Address *</label>
                                    <textarea value={form.address} maxLength={300} rows={3} onChange={e=>set('address',e.target.value)}
                                        placeholder="Street address, building, landmark..." className={`${inputCls('address')} resize-none`} />
                                </div>
                            </div>
                        )}

                        {/* STEP 2 — Surgeon Details */}
                        {step === 2 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold text-amber-50 mb-2">Surgeon Details</h2>
                                <div className="rounded-xl border border-red-800/30 bg-red-950/10 p-3">
                                    <p className="text-xs text-red-300">⚠️ We require the <strong>individual surgeon's</strong> MDCN number, not just the hospital/clinic license. This is how we catch fake surgeons.</p>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">Primary Surgeon Full Name *</label>
                                    <input type="text" value={form.surgeon_name} maxLength={100} onChange={e=>set('surgeon_name',e.target.value)}
                                        placeholder="Dr. Full Name" className={inputCls('surgeon_name')} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">Surgeon's Individual MDCN Number *</label>
                                    <input type="text" value={form.surgeon_mdcn} maxLength={50} onChange={e=>set('surgeon_mdcn',e.target.value.toUpperCase())}
                                        placeholder="e.g. MDCN/67890" className={inputCls('surgeon_mdcn')} />
                                    <p className="mt-1 text-[10px] text-amber-900/70">This is verified on mdcn.gov.ng. Must match the surgeon name above exactly.</p>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">LSMOH Certificate Number (if Lagos-based)</label>
                                    <input type="text" value={form.lsmoh_license} maxLength={50} onChange={e=>set('lsmoh_license',e.target.value.toUpperCase())}
                                        placeholder="e.g. LSMOH/2024/12345" className={inputCls('lsmoh_license')} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">Specialty Board Certification (optional)</label>
                                    <input type="text" value={form.specialty_board} maxLength={100} onChange={e=>set('specialty_board',e.target.value)}
                                        placeholder="e.g. West African College of Surgeons" className={inputCls('specialty_board')} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-amber-700">Years of Experience *</label>
                                        <input type="number" value={form.years_experience} min={1} max={60} onChange={e=>set('years_experience',e.target.value)}
                                            placeholder="e.g. 8" className={inputCls('years_experience')} />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-amber-700">Procedures Performed (approx) *</label>
                                        <input type="number" value={form.procedures_performed} min={0} onChange={e=>set('procedures_performed',e.target.value)}
                                            placeholder="e.g. 150" className={inputCls('procedures_performed')} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 — Contact */}
                        {step === 3 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold text-amber-50 mb-2">Contact Information</h2>
                                <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
                                    <p className="text-xs leading-relaxed text-amber-300">
                                        📱 Your WhatsApp is your update identity on QuickCure Beauty. Patients will also see your WhatsApp contact on your clinic card.
                                    </p>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">WhatsApp Number *</label>
                                    <input type="tel" value={form.whatsapp_number} onChange={e=>set('whatsapp_number',e.target.value.replace(/[^0-9+\s]/g,'').slice(0,20))}
                                        placeholder="08012345678" className={inputCls('whatsapp_number')} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">Email Address *</label>
                                    <input type="email" value={form.email} maxLength={100} onChange={e=>set('email',e.target.value)}
                                        placeholder="clinic@example.com" className={inputCls('email')} />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">Instagram Handle (optional but strongly recommended)</label>
                                    <input type="text" value={form.instagram} maxLength={100} onChange={e=>set('instagram',e.target.value)}
                                        placeholder="@yourhandle" className={inputCls('instagram')} />
                                    <p className="mt-1 text-[10px] text-amber-900/70">We use this to verify your work is real.</p>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">Website (optional)</label>
                                    <input type="url" value={form.website} maxLength={200} onChange={e=>set('website',e.target.value)}
                                        placeholder="https://yourclinic.com" className={inputCls('website')} />
                                </div>
                            </div>
                        )}

                        {/* STEP 4 — Documents */}
                        {step === 4 && (
                            <div className="flex flex-col gap-5">
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold text-amber-50 mb-2">Upload Documents</h2>
                                <p className="text-sm text-amber-800 -mt-2">All uploads are stored securely and only seen by our verification team. Max 5MB per file.</p>

                                <FileUpload label="Photo of Your Physical Clinic / Theatre" field="clinic_photo"
                                    accept="image/jpeg,image/png" required
                                    note="Must show the actual clinic interior, not a stock photo." />

                                <FileUpload label="Photo of Your MDCN Certificate" field="mdcn_cert_photo"
                                    accept="image/jpeg,image/png" required
                                    note="Surgeon's individual certificate. Must be clearly readable." />

                                <FileUpload label="Before / After Portfolio (minimum 3, maximum 5)" field="portfolio_photos"
                                    accept="image/jpeg,image/png" multiple required
                                    note="Real results only. We reverse image search every photo." />

                                <FileUpload label="LSMOH Certificate (if Lagos-based)" field="lsmoh_cert_photo"
                                    accept="image/jpeg,image/png"
                                    note="Lagos State Ministry of Health certificate if applicable." />

                                {files.portfolio_photos.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        {files.portfolio_photos.map((f,i) => (
                                            <div key={i} className="relative">
                                                <img src={URL.createObjectURL(f)} alt={`Portfolio ${i+1}`}
                                                    className="h-16 w-16 rounded-lg object-cover ring-1 ring-amber-800/40" />
                                                <button onClick={()=>setFile('portfolio_photos', files.portfolio_photos.filter((_,j)=>j!==i))}
                                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 5 — Services */}
                        {step === 5 && (
                            <div>
                                <h2 className="font-['Syne',sans-serif] text-xl font-bold text-amber-50 mb-1">What procedures do you offer?</h2>
                                <p className="mb-5 text-sm text-amber-800">Select only what your surgeon is actually qualified to perform.</p>
                                <div className="flex flex-col gap-4">
                                    {Object.entries(grouped).map(([cat, svcs]) => (
                                        <div key={cat}>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                                                {cat.charAt(0).toUpperCase()+cat.slice(1)}
                                            </p>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {svcs.map(svc => {
                                                    const selected = form.selected_services.includes(svc.id);
                                                    return (
                                                        <label key={svc.id}
                                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${selected?'border-amber-600 bg-amber-950/30':'border-amber-900/30 bg-amber-950/10 hover:border-amber-800/60'}`}>
                                                            <input type="checkbox" checked={selected} onChange={()=>toggle(svc.id)} className="accent-amber-500 h-4 w-4 flex-shrink-0" />
                                                            <span className="text-sm text-amber-100">{svc.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Consent */}
                                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-900/30 bg-amber-950/10 p-4">
                                    <input type="checkbox" checked={form.consent} onChange={e=>set('consent',e.target.checked)} className="mt-0.5 accent-amber-500" />
                                    <p className="text-xs leading-relaxed text-amber-800">
                                        I confirm all information is accurate. I understand that providing false credentials will result in permanent removal and may be reported to MDCN. I agree that QuickCure NG may use our before/after photos on the platform. I accept the <a href="/legal" className="underline" target="_blank">terms of service</a>.
                                    </p>
                                </label>
                            </div>
                        )}

                        {errMsg && <p className="mt-4 text-xs text-red-400">{errMsg}</p>}

                        <div className={`mt-6 flex gap-3 ${step === 1 ? 'justify-end' : ''}`}>
                            {step > 1 && (
                                <button onClick={()=>setStep(s=>s-1)} className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700">
                                    ← Back
                                </button>
                            )}
                            {step < 5 && (
                                <button onClick={next} className="flex-1 rounded-xl bg-amber-500 py-3 font-['Syne',sans-serif] text-sm font-bold text-black transition hover:bg-amber-400">
                                    Next →
                                </button>
                            )}
                            {step === 5 && (
                                <button onClick={submit} disabled={!form.consent}
                                    className="flex-1 rounded-xl bg-amber-500 py-3 font-['Syne',sans-serif] text-sm font-bold text-black transition hover:bg-amber-400 disabled:opacity-50">
                                    Submit Application
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}