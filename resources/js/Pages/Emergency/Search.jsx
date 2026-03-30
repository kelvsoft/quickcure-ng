import { useState, useEffect, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import HospitalCard from '@/Components/Emergency/HospitalCard';
import AestheticsCard from '@/Components/Aesthetics/AestheticsCard';
import SearchStatus from '@/Components/Emergency/SearchStatus';
import OutbreakTicker from '@/Components/Emergency/OutbreakTicker';
import FeedbackModal from '@/Components/Emergency/FeedbackModal';
import LeadCaptureModal from '@/Components/Aesthetics/LeadCaptureModal';

/**
 * AUTO-EXPANDING RADIUS:
 * Emergency: tries 15km → 30km → 50km → 100km automatically.
 * No manual radius picker on emergency track — in a crisis nobody
 * wants to fiddle with settings. They need the nearest hospital NOW.
 *
 * Aesthetics: keeps a manual range because people willingly travel
 * further for an elective procedure.
 */
const EMERGENCY_RADII = [15, 30, 50, 100]; // Auto-expands through these
const AESTHETICS_RADII = [10, 25, 50];      // Manual picker for beauty

export default function Search() {
    const [query, setQuery]           = useState('');
    const [track, setTrack]           = useState('emergency');
    const [hospitals, setHospitals]   = useState([]);
    const [status, setStatus]         = useState('idle');
    const [errorMsg, setErrorMsg]     = useState('');
    const [aestheticsRadius, setAestheticsRadius] = useState(25);
    const [searchedRadius, setSearchedRadius]     = useState(null); // actual radius used
    const [resolvedTerms, setResolvedTerms] = useState([]);
    const [userCoords, setUserCoords] = useState(null);
    const [alerts, setAlerts]         = useState([]);
    const [feedbackTarget, setFeedbackTarget] = useState(null);
    const [leadTarget, setLeadTarget]         = useState(null);
    const [isOffline, setIsOffline]   = useState(!navigator.onLine);
    const [cachedHospitals, setCachedHospitals] = useState([]);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        fetchAlerts();
        const goOnline  = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online',  goOnline);
        window.addEventListener('offline', goOffline);
        return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
    }, []);

    const fetchAlerts = async () => {
        try {
            const res  = await fetch('/api/alerts', { headers:{'Accept':'application/json'} });
            const json = await res.json();
            if (json.status === 'success') setAlerts(json.data);
        } catch { /* non-critical — ticker just stays hidden */ }
    };

    const sanitizeCoord = (val, min, max) => { const n = parseFloat(val); return isNaN(n)?null:Math.min(max,Math.max(min,n)); };
    const sanitizeQuery = (val) => val.replace(/[<>'"`;]/g,'').trim().slice(0,100);

    /**
     * Core search function — called with a specific radius.
     * Returns the number of results found.
     */
    const doSearch = useCallback(async (lat, lng, q, radius) => {
        const params = new URLSearchParams({
            latitude:  sanitizeCoord(lat,-90,90),
            longitude: sanitizeCoord(lng,-180,180),
            radius,
            service:   sanitizeQuery(q),
        });

        const res = await fetch(`/api/hospitals?${params}`, {
            headers: {'Accept':'application/json','X-Requested-With':'XMLHttpRequest'},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.status !== 'success') throw new Error(json.message ?? 'Server error');
        return json;
    }, []);

    /**
     * AUTO-EXPANDING RADIUS for emergency track.
     * Tries 15km first. If 0 results, silently expands to 30km, then 50km, then 100km.
     * User sees "Searching..." the whole time — no interruption.
     */
    const fetchHospitals = useCallback(async (lat, lng, q) => {
        setStatus('searching');

        const isEmergency = track === 'emergency';
        const radiiToTry  = isEmergency ? EMERGENCY_RADII : [aestheticsRadius];

        try {
            let lastJson = null;

            for (const radius of radiiToTry) {
                const json = await doSearch(lat, lng, q, radius);
                const results = json.data.data ?? [];
                lastJson = json;

                if (results.length > 0) {
                    setHospitals(results);
                    setCachedHospitals(results);
                    setResolvedTerms(json.meta?.resolved_terms ?? []);
                    setTrack(json.meta?.track ?? 'emergency');
                    setSearchedRadius(radius);
                    setStatus('success');
                    return;
                }

                // No results — if more radii to try, keep searching silently
            }

            // All radii exhausted — show empty state
            setHospitals([]);
            setSearchedRadius(radiiToTry[radiiToTry.length - 1]);
            if (lastJson) {
                setResolvedTerms(lastJson.meta?.resolved_terms ?? []);
            }
            setStatus('success');

        } catch (err) {
            // Offline fallback
            if (isOffline && cachedHospitals.length > 0) {
                setHospitals(cachedHospitals);
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMsg('Could not load results. Please check your connection and try again.');
            }
            console.error('[QuickCure]', err);
        }
    }, [track, aestheticsRadius, doSearch, isOffline, cachedHospitals]);

    const handleSearch = useCallback(() => {
        const clean = sanitizeQuery(query);
        if (!clean) { inputRef.current?.focus(); return; }
        setStatus('locating'); setHospitals([]); setErrorMsg(''); setResolvedTerms([]);  setSearchedRadius(null);

        if (!navigator.geolocation) {
            setStatus('error');
            setErrorMsg('GPS not supported on this device. Please enable location services.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = sanitizeCoord(pos.coords.latitude,-90,90);
                const lng = sanitizeCoord(pos.coords.longitude,-180,180);
                if (!lat || !lng) { setStatus('error'); setErrorMsg('Could not read GPS. Please try again.'); return; }
                setUserCoords({ lat, lng });
                fetchHospitals(lat, lng, clean);
            },
            (err) => {
                setStatus('error');
                setErrorMsg({
                    1:'Location denied. Please enable location in browser settings.',
                    2:'GPS signal not found. Please try again.',
                    3:'Location timed out. Please try again.',
                }[err.code] ?? 'Location error. Please try again.');
            },
            { timeout:10000, maximumAge:60000, enableHighAccuracy:true }
        );
    }, [query, fetchHospitals]);

    const switchTrack = (t) => {
        setTrack(t); setQuery(''); setHospitals([]);
        setStatus('idle'); setResolvedTerms([]); setSearchedRadius(null);
    };

    const isEmergency = track === 'emergency';
    const isActive    = status === 'locating' || status === 'searching';

    const emergencySuggestions = [
        {icon:'🩸',label:'Blood Bank',       value:'blood bank'},
        {icon:'🛏', label:'ICU Bed',          value:'ICU bed'},
        {icon:'💨',label:'Oxygen',           value:'oxygen'},
        {icon:'🐍',label:'Snake Bite',       value:'snake bite'},
        {icon:'🔪',label:'Emergency Surgery',value:'emergency surgery'},
        {icon:'👶',label:'Maternity',         value:'maternity'},
        {icon:'🫀',label:'Heart Attack',     value:'heart attack'},
        {icon:'🧪',label:'CT Scan',          value:'CT scan'},
    ];

    const aestheticsSuggestions = [
        {icon:'✨',label:'BBL',            value:'BBL'},
        {icon:'💇',label:'Hair Transplant',value:'hair transplant'},
        {icon:'🦷',label:'Dental Veneers', value:'dental veneers'},
        {icon:'👃',label:'Rhinoplasty',    value:'rhinoplasty'},
        {icon:'💉',label:'Botox',          value:'botox'},
        {icon:'🌟',label:'Skin Revision',  value:'skin revision'},
        {icon:'⚗️',label:'Liposuction',   value:'liposuction'},
        {icon:'💋',label:'Lip Filler',     value:'filler'},
    ];

    const suggestions = isEmergency ? emergencySuggestions : aestheticsSuggestions;

    return (
        <>
            <Head>
                <title>QuickCure NG — Sabi Hospital & Beauty | Emergency + Aesthetics Nigeria</title>
                <meta name="description" content="Sabi Hospital: Find blood banks, ICU beds, oxygen, anti-venom near you in Nigeria. QuickCure Beauty: Find verified BBL, hair transplant, dental veneers surgeons. Free. Real-time." />
                <meta name="keywords" content="Sabi Hospital Nigeria, emergency hospital Lagos, blood bank near me, anti-venom Nigeria, BBL surgery Lagos, hair transplant Nigeria, QuickCure NG" />
                <meta name="robots" content="index, follow" />
                <meta name="theme-color" content="#080c10" />
                <link rel="canonical" href="https://quickcure-ng.com" />
                <meta property="og:type"        content="website" />
                <meta property="og:title"       content="QuickCure NG — Emergency & Aesthetics Nigeria" />
                <meta property="og:description" content="Find hospitals and clinics near you in Nigeria. Real-time availability." />
                <meta property="og:url"         content="https://quickcure-ng.com" />
                <meta property="og:image"       content="https://quickcure-ng.com/og-image.jpg" />
                <meta property="og:locale"      content="en_NG" />
                <meta name="twitter:card"       content="summary_large_image" />
                <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
                <meta httpEquiv="X-Frame-Options"        content="DENY" />
                <meta name="referrer"                    content="strict-origin-when-cross-origin" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
                <script type="application/ld+json">{JSON.stringify({
                    "@context":"https://schema.org","@type":"WebApplication",
                    "name":"QuickCure NG","alternateName":"Sabi Hospital",
                    "description":"Find emergency hospitals and aesthetic clinics in Nigeria",
                    "url":"https://quickcure-ng.com","applicationCategory":"HealthApplication",
                    "operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"NGN"},
                    "areaServed":{"@type":"Country","name":"Nigeria"},
                })}</script>
            </Head>

            <div className={`min-h-screen font-['DM_Sans',sans-serif] text-white transition-colors duration-500 ${isEmergency?'bg-[#080c10]':'bg-[#0a0800]'}`}>

                {/* Offline banner */}
                {isOffline && (
                    <div className="bg-amber-950/90 border-b border-amber-800 px-4 py-2 text-center text-xs text-amber-300">
                        📵 You are offline. Showing last known results. Call ahead to confirm availability.
                    </div>
                )}

                {/* Outbreak ticker — emergency only */}
                {isEmergency && <OutbreakTicker alerts={alerts} />}

                {/* HERO */}
                <section className={`relative overflow-hidden pb-12 pt-10 text-center transition-colors duration-500 ${isEmergency?'bg-[#0d1520]':'bg-[#13100a]'}`}>
                    <div className={`pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl transition-colors duration-700 ${isEmergency?'bg-red-700/8':'bg-amber-600/6'}`} aria-hidden="true" />

                    <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-7 px-4">

                        {/* Logo */}
                        <div className="flex items-center gap-2.5">
                            <span className="animate-pulse text-2xl text-red-500">✚</span>
                            <span className="font-['Syne',sans-serif] text-2xl font-extrabold">
                                {isEmergency ? 'Sabi Hospital' : 'QuickCure Beauty'}
                            </span>
                            <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-[11px] font-bold text-red-400 ring-1 ring-red-800/60">NG</span>
                        </div>

                        {/* Track toggle */}
                        <div className="flex rounded-2xl border border-slate-800 bg-slate-900/80 p-1.5" role="tablist" aria-label="Select service type">
                            <button role="tab" aria-selected={isEmergency} onClick={()=>switchTrack('emergency')}
                                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${isEmergency?'bg-red-600 text-white shadow-lg shadow-red-600/30':'text-slate-500 hover:text-slate-300'}`}>
                                🚨 Sabi Hospital
                            </button>
                            <button role="tab" aria-selected={!isEmergency} onClick={()=>switchTrack('aesthetics')}
                                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${!isEmergency?'bg-amber-500 text-black shadow-lg shadow-amber-500/20':'text-slate-500 hover:text-slate-300'}`}>
                                ✨ QuickCure Beauty
                            </button>
                        </div>

                        {/* Headline */}
                        {isEmergency ? (
                            <div>
                                <h1 className="font-['Syne',sans-serif] text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                                    What do you<br /><span className="text-red-500">need right now?</span>
                                </h1>
                                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                                    Type anything — even with spelling mistakes. "snak bit", "oxigen", "anti vermon" — we understand. We automatically search wider until we find the nearest hospital that has it.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h1 className="font-['Syne',sans-serif] text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                                    Find the best<br /><span className="text-amber-400">verified surgeon.</span>
                                </h1>
                                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                                    LSMOH-verified surgeons. Real before/after results. No quacks. Book a free consultation and get a quote within 24 hours.
                                </p>
                            </div>
                        )}

                        {/* Search box */}
                        <div className="w-full max-w-xl">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden="true">{isEmergency?'🔍':'✨'}</span>
                                <input ref={inputRef} type="search" value={query}
                                    onChange={e=>setQuery(e.target.value.slice(0,100))}
                                    onKeyDown={e=>{ if(e.key==='Enter') handleSearch(); }}
                                    placeholder={isEmergency?'e.g. snake bite, blood, ICU, oxygen...':'e.g. BBL, hair transplant, dental veneers...'}
                                    maxLength={100} autoComplete="off" autoCorrect="off" spellCheck="false"
                                    aria-label="Search for medical service"
                                    className={`w-full rounded-2xl border bg-slate-800/80 py-4 pl-12 pr-4 text-base text-white placeholder-slate-500 outline-none backdrop-blur-sm transition-all duration-200 focus:ring-2 ${isEmergency?'border-slate-700/60 focus:border-red-600 focus:ring-red-600/30':'border-amber-900/40 focus:border-amber-500 focus:ring-amber-500/20'}`} />
                            </div>

                            {/* Suggestion chips */}
                            <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Common searches">
                                {suggestions.map(s=>(
                                    <button key={s.value} onClick={()=>{setQuery(s.value);inputRef.current?.focus();}}
                                        aria-label={`Search for ${s.label}`}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${query===s.value?(isEmergency?'border-red-500 bg-red-500/20 text-red-300':'border-amber-500 bg-amber-500/20 text-amber-300'):'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                                        {s.icon} {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Aesthetics only — manual radius (people travel for elective procedures) */}
                        {!isEmergency && (
                            <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Search radius">
                                <span className="text-xs text-slate-600">Within:</span>
                                {AESTHETICS_RADII.map(r=>(
                                    <button key={r} onClick={()=>setAestheticsRadius(r)} aria-pressed={aestheticsRadius===r}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${aestheticsRadius===r?'border-amber-500 bg-amber-500 text-black':'border-slate-700 bg-slate-800/60 text-slate-500 hover:text-white'}`}>
                                        {r}km
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* CTA */}
                        <button onClick={handleSearch} disabled={isActive} aria-busy={isActive}
                            className={`flex w-full max-w-sm items-center justify-center gap-3 rounded-full px-8 py-4 font-['Syne',sans-serif] text-lg font-bold shadow-2xl transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0 ${isEmergency?'bg-red-600 text-white shadow-red-600/30 hover:bg-red-500':'bg-amber-500 text-black shadow-amber-500/20 hover:bg-amber-400'}`}>
                            {isActive && <span className="h-5 w-5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" />}
                            {status==='locating'?'Getting your location...':status==='searching'?'Searching...':(isEmergency?'🚨 Find Emergency Help':'✨ Find Verified Clinics')}
                        </button>

                        {!isEmergency && <p className="max-w-md text-center text-xs text-slate-700">QuickCure Beauty is a directory. Not a medical provider. Always verify surgeon credentials before booking.</p>}
                        <p className="text-xs text-slate-700">🔒 Location never stored · Free · Real-time</p>
                    </div>
                </section>

                {/* Resolved terms bar */}
                {resolvedTerms.length > 0 && status === 'success' && (
                    <div className="border-b border-slate-800/60 bg-slate-900/40 px-4 py-2 text-center text-xs text-slate-500">
                        We searched for: {resolvedTerms.map((t,i)=>(
                            <span key={t} className="font-semibold text-slate-300">{t}{i<resolvedTerms.length-1?' · ':''}</span>
                        ))}
                    </div>
                )}

                {/* Results */}
                <section className="mx-auto w-full max-w-5xl px-4 py-8" aria-label="Search results" aria-live="polite">
                    <SearchStatus
                        status={status}
                        errorMsg={errorMsg}
                        count={hospitals.length}
                        radius={searchedRadius}
                        query={query}
                        track={track}
                        onRetry={handleSearch}
                    />

                    {hospitals.length > 0 && (<>
                        <p className="mb-5 text-center text-sm text-slate-500">
                            Found <strong className={isEmergency?'text-emerald-400':'text-amber-400'}>{hospitals.length}</strong>{' '}
                            {isEmergency?'hospital':'clinic'}{hospitals.length!==1?'s':''} with{' '}
                            <strong className="text-white">"{query}"</strong>
                            {searchedRadius && <span> within {searchedRadius}km</span>}
                            {isOffline && <span className="ml-2 text-amber-500">(cached — call ahead to confirm)</span>}
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
                            {hospitals.map((h,i)=>isEmergency
                                ? <HospitalCard   key={h.id} hospital={h} index={i} onFeedback={()=>setFeedbackTarget(h)} />
                                : <AestheticsCard key={h.id} hospital={h} index={i} onLead={()=>setLeadTarget(h)} />
                            )}
                        </div>
                    </>)}
                </section>

                {/* Emergency hotlines — always visible on emergency track */}
                {isEmergency && (
                    <section className="border-t border-slate-800 bg-[#0d1520] px-4 py-10 text-center" aria-label="Nigerian emergency hotlines">
                        <h2 className="mb-6 font-['Syne',sans-serif] text-xs font-bold uppercase tracking-widest text-slate-600">Nigerian Emergency Numbers</h2>
                        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                {name:'NEMA',      number:'0800225563',display:'0800-NEMA',   desc:'National Emergency'},
                                {name:'Police',    number:'112',       display:'112',          desc:'Nigeria Police'},
                                {name:'Fire',      number:'017944996', display:'01-7944996',   desc:'Lagos Fire'},
                                {name:'Ambulance', number:'0700527262',display:'0700-LASAMBUS',desc:'Lagos Ambulance'},
                            ].map(h=>(
                                <a key={h.name} href={`tel:${h.number}`} aria-label={`Call ${h.name}`}
                                    className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition-all hover:border-red-900 hover:-translate-y-0.5">
                                    <span className="text-sm font-semibold text-white">{h.name}</span>
                                    <span className="font-['Syne',sans-serif] text-sm font-bold text-red-400">{h.display}</span>
                                    <span className="text-xs text-slate-600">{h.desc}</span>
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                <footer className="border-t border-slate-800/50 py-6 text-center text-xs text-slate-700">
                    <p>© {new Date().getFullYear()} QuickCure NG · Not a substitute for emergency services · <a href="/legal" className="underline">Legal</a></p>
                </footer>
            </div>

            {feedbackTarget && <FeedbackModal hospital={feedbackTarget} uaQA                                                                                                                                                                                                                                            QserCoords={userCoords} onClose={()=>setFeedbackTarget(null)} />}
            {leadTarget     && <LeadCaptureModal hospital={leadTarget} onClose={()=>setLeadTarget(null)} />}
        </>
    );
}