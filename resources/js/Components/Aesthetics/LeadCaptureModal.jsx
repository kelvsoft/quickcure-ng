import { useState } from 'react';

/**
 * LeadCaptureModal — 3-step consultation form.
 * Step 1: Goal (BBL, Hair, etc.)
 * Step 2: Timeline
 * Step 3: Contact details + optional photo
 * LEGAL: Explicit consent required.
 * REVENUE: Lead sold to surgeon.
 */
export default function LeadCaptureModal({ hospital, onClose }) {
    const [step, setStep]   = useState(1);
    const [form, setForm]   = useState({ procedure:'', timeline:'', name:'', phone:'', notes:'', photo:null });
    const [consent, setConsent] = useState(false);
    const [errMsg, setErrMsg]   = useState('');
    const [apiStep, setApiStep] = useState('idle'); // idle|submitting|success|error

    const procedures = ['BBL (Brazilian Butt Lift)','Liposuction','Tummy Tuck','Hair Transplant (FUE)','Rhinoplasty','Dental Veneers','Dental Implants','Breast Augmentation','Botox / Fillers','Skin Revision / Laser','Other'];
    const timelines  = [
        { v:'asap',      label:'🔥 As soon as possible', desc:'Ready within 2 weeks' },
        { v:'3months',   label:'📅 Within 3 months',     desc:'Planning and saving' },
        { v:'6months',   label:'🗓 Within 6 months',     desc:'Researching options' },
        { v:'just_look', label:'👀 Just looking',        desc:'No timeline yet' },
    ];

    const getCsrf = () => document.cookie.split('; ').find(r=>r.startsWith('XSRF-TOKEN='))?.split('=')[1]?.replace(/%3D/g,'=') ?? '';

    const submit = async () => {
        if (!form.name || !form.phone) { setErrMsg('Please enter your name and phone number.'); return; }
        if (!consent) { setErrMsg('Please accept the terms to continue.'); return; }
        setApiStep('submitting');
        try {
            const fd = new FormData();
            fd.append('hospital_id', hospital.id);
            fd.append('procedure',   form.procedure);
            fd.append('timeline',    form.timeline);
            fd.append('name',        form.name.slice(0,80));
            fd.append('phone',       form.phone.replace(/[^0-9+\s-]/g,'').slice(0,20));
            fd.append('notes',       form.notes.slice(0,300));
            fd.append('consented',   '1');
            if (form.photo) fd.append('photo', form.photo);

            const res  = await fetch('/api/leads', { method:'POST', headers:{'Accept':'application/json','X-XSRF-TOKEN':getCsrf()}, body:fd });
            const json = await res.json();
            setApiStep(json.status==='success' ? 'success' : 'error');
            if (json.status!=='success') setErrMsg(json.message ?? 'Submission failed.');
        } catch { setApiStep('error'); setErrMsg('Network error. Please try again.'); }
    };

    const Dots = () => (
        <div className="mb-6 flex items-center gap-2">
            {[1,2,3].map(n=>(
                <div key={n} className="flex flex-1 items-center gap-2">
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${step>=n?'bg-amber-500 text-black':'bg-slate-800 text-slate-500'}`}>{n}</div>
                    {n<3 && <div className={`h-0.5 flex-1 rounded transition-all ${step>n?'bg-amber-500':'bg-slate-800'}`} />}
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
            role="dialog" aria-modal="true" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
            <div className="w-full max-w-md rounded-t-3xl border border-amber-900/40 bg-[#13100a] p-6 sm:rounded-3xl">

                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h2 className="font-['Syne',sans-serif] text-lg font-bold text-amber-50">Free Consultation</h2>
                        <p className="mt-0.5 text-xs text-amber-900">{hospital?.name}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-amber-900 hover:bg-amber-950/40 hover:text-amber-400">✕</button>
                </div>

                {/* STEP 1 */}
                {step===1 && apiStep==='idle' && (<>
                    <Dots />
                    <p className="mb-4 font-['Syne',sans-serif] text-base font-bold text-amber-50">What is your goal?</p>
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                        {procedures.map(p=>(
                            <label key={p} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${form.procedure===p?'border-amber-600 bg-amber-950/30':'border-amber-900/30 bg-amber-950/10 hover:border-amber-800/60'}`}>
                                <input type="radio" name="proc" value={p} checked={form.procedure===p} onChange={()=>setForm(f=>({...f,procedure:p}))} className="accent-amber-500" />
                                <span className="text-sm text-amber-100">{p}</span>
                            </label>
                        ))}
                    </div>
                    {errMsg && <p className="mt-2 text-xs text-red-400">{errMsg}</p>}
                    <button onClick={()=>{if(!form.procedure){setErrMsg('Please select a procedure.');return;}setErrMsg('');setStep(2);}}
                        className="mt-5 w-full rounded-xl bg-amber-500 py-3 font-['Syne',sans-serif] text-sm font-bold text-black transition hover:bg-amber-400">
                        Next →
                    </button>
                </>)}

                {/* STEP 2 */}
                {step===2 && apiStep==='idle' && (<>
                    <Dots />
                    <p className="mb-4 font-['Syne',sans-serif] text-base font-bold text-amber-50">What is your timeline?</p>
                    <div className="flex flex-col gap-3">
                        {timelines.map(t=>(
                            <label key={t.v} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all ${form.timeline===t.v?'border-amber-600 bg-amber-950/30':'border-amber-900/30 bg-amber-950/10 hover:border-amber-800/60'}`}>
                                <input type="radio" name="tl" value={t.v} checked={form.timeline===t.v} onChange={()=>setForm(f=>({...f,timeline:t.v}))} className="mt-0.5 accent-amber-500" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-100">{t.label}</p>
                                    <p className="text-xs text-amber-800">{t.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                    {errMsg && <p className="mt-2 text-xs text-red-400">{errMsg}</p>}
                    <div className="mt-5 flex gap-3">
                        <button onClick={()=>setStep(1)} className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700">← Back</button>
                        <button onClick={()=>{if(!form.timeline){setErrMsg('Please select a timeline.');return;}setErrMsg('');setStep(3);}}
                            className="flex-1 rounded-xl bg-amber-500 py-3 font-['Syne',sans-serif] text-sm font-bold text-black hover:bg-amber-400">
                            Next →
                        </button>
                    </div>
                </>)}

                {/* STEP 3 */}
                {step===3 && apiStep==='idle' && (<>
                    <Dots />
                    <p className="mb-4 font-['Syne',sans-serif] text-base font-bold text-amber-50">Your details</p>
                    <div className="flex flex-col gap-3">
                        <input type="text" value={form.name} maxLength={80} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                            placeholder="Full name *"
                            className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2.5 text-sm text-amber-50 placeholder-amber-900/60 outline-none focus:border-amber-600" />
                        <input type="tel" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value.replace(/[^0-9+\s-]/g,'').slice(0,20)}))}
                            placeholder="Phone number * (08012345678)"
                            className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2.5 text-sm text-amber-50 placeholder-amber-900/60 outline-none focus:border-amber-600" />
                        <textarea value={form.notes} maxLength={300} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2}
                            placeholder="Any specific questions? (optional)"
                            className="resize-none rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2.5 text-sm text-amber-50 placeholder-amber-900/60 outline-none focus:border-amber-600" />

                        {/* Photo upload */}
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-amber-900/40 bg-amber-950/10 px-4 py-3 hover:border-amber-700/60">
                            <span className="text-xl">📸</span>
                            <div>
                                <p className="text-sm text-amber-200">{form.photo?`📎 ${form.photo.name}`:'Upload a photo for a quote (optional)'}</p>
                                <p className="text-xs text-amber-900">JPG or PNG, max 5MB. Helps surgeon give accurate pricing.</p>
                            </div>
                            <input type="file" accept="image/jpeg,image/png" className="hidden"
                                onChange={e=>{if(e.target.files?.[0]?.size<=5*1024*1024)setForm(f=>({...f,photo:e.target.files[0]}));}} />
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-900/30 bg-amber-950/10 p-3">
                            <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5 accent-amber-500" />
                            <p className="text-xs leading-relaxed text-amber-800">
                                I agree that QuickCure NG may share my details with {hospital?.name} for consultation purposes. QuickCure NG is a directory, not a medical provider. <a href="/legal" className="underline" target="_blank" rel="noopener noreferrer">Read terms.</a>
                            </p>
                        </label>
                    </div>
                    {errMsg && <p className="mt-2 text-xs text-red-400">{errMsg}</p>}
                    <div className="mt-5 flex gap-3">
                        <button onClick={()=>setStep(2)} className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700">← Back</button>
                        <button onClick={submit} disabled={!consent}
                            className="flex-1 rounded-xl bg-amber-500 py-3 font-['Syne',sans-serif] text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50">
                            ✨ Submit
                        </button>
                    </div>
                </>)}

                {apiStep==='submitting' && (<div className="flex flex-col items-center gap-3 py-10"><span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-900 border-t-amber-400" /><p className="text-sm text-amber-700">Sending your request...</p></div>)}
                {apiStep==='success' && (<div className="flex flex-col items-center gap-3 py-10 text-center"><span className="text-4xl">✨</span><p className="font-['Syne',sans-serif] text-xl font-bold text-amber-300">Request Sent!</p><p className="text-sm text-amber-700">{hospital?.name} will contact you within 24 hours.</p><button onClick={onClose} className="mt-2 rounded-xl bg-amber-950/40 px-6 py-2.5 text-sm font-semibold text-amber-400">Done</button></div>)}
                {apiStep==='error' && (<div className="flex flex-col items-center gap-3 py-8 text-center"><span className="text-4xl">⚠️</span><p className="font-['Syne',sans-serif] text-base font-bold text-red-400">Could not submit</p><p className="text-sm text-slate-400">{errMsg}</p><button onClick={()=>setApiStep('idle')} className="mt-2 rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white">Try Again</button></div>)}
            </div>
        </div>
    );
}