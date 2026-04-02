import { useState, useEffect, useCallback, useRef } from "react";
import { Head } from "@inertiajs/react";
import HospitalCard from "@/Components/Emergency/HospitalCard";
import AestheticsCard from "@/Components/Aesthetics/AestheticsCard";
import SearchStatus from "@/Components/Emergency/SearchStatus";
import OutbreakTicker from "@/Components/Emergency/OutbreakTicker";
import FeedbackModal from "@/Components/Emergency/FeedbackModal";
import LeadCaptureModal from "@/Components/Aesthetics/LeadCaptureModal";

const EMERGENCY_RADII = [15, 30, 50, 100];
const AESTHETICS_RADII = [10, 25, 50];

export default function Search() {
    const [query, setQuery] = useState("");
    const [track, setTrack] = useState("emergency");
    const [hospitals, setHospitals] = useState([]);
    const [status, setStatus] = useState("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [aestheticsRadius, setAestheticsRadius] = useState(25);
    const [searchedRadius, setSearchedRadius] = useState(null);
    const [resolvedTerms, setResolvedTerms] = useState([]);
    const [userCoords, setUserCoords] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [feedbackTarget, setFeedbackTarget] = useState(null);
    const [leadTarget, setLeadTarget] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [cachedHospitals, setCachedHospitals] = useState([]);
    const [isDark, setIsDark] = useState(true);
    const inputRef = useRef(null);

    useEffect(() => {
        const darkMode = window.matchMedia("(prefers-color-scheme: dark)");
        setIsDark(darkMode.matches);
        const handler = (e) => setIsDark(e.matches);
        darkMode.addEventListener("change", handler);
        inputRef.current?.focus();
        fetchAlerts();
        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            darkMode.removeEventListener("change", handler);
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await fetch("/api/alerts", {
                headers: { Accept: "application/json" },
            });
            const json = await res.json();
            if (json.status === "success") setAlerts(json.data);
        } catch {}
    };

    const sanitizeCoord = (val, min, max) => {
        const n = parseFloat(val);
        return isNaN(n) ? null : Math.min(max, Math.max(min, n));
    };

    const sanitizeQuery = (val) =>
        val
            .replace(/[<>'"`;]/g, "")
            .trim()
            .slice(0, 100);

    const doSearch = useCallback(async (lat, lng, q, radius) => {
        const params = new URLSearchParams({
            latitude: sanitizeCoord(lat, -90, 90),
            longitude: sanitizeCoord(lng, -180, 180),
            radius,
            service: sanitizeQuery(q),
        });
        const res = await fetch(`/api/hospitals?${params}`, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.status !== "success")
            throw new Error(json.message ?? "Server error");
        return json;
    }, []);

    const fetchHospitals = useCallback(
        async (lat, lng, q) => {
            setStatus("searching");
            const isEmergency = track === "emergency";
            const radiiToTry = isEmergency
                ? EMERGENCY_RADII
                : [aestheticsRadius];
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
                        setTrack(json.meta?.track ?? "emergency");
                        setSearchedRadius(radius);
                        setStatus("success");
                        return;
                    }
                }
                setHospitals([]);
                setSearchedRadius(radiiToTry[radiiToTry.length - 1]);
                if (lastJson)
                    setResolvedTerms(lastJson.meta?.resolved_terms ?? []);
                setStatus("success");
            } catch (err) {
                if (isOffline && cachedHospitals.length > 0) {
                    setHospitals(cachedHospitals);
                    setStatus("success");
                } else {
                    setStatus("error");
                    setErrorMsg("Connection error. Please try again.");
                }
            }
        },
        [track, aestheticsRadius, doSearch, isOffline, cachedHospitals],
    );

    const handleSearch = useCallback(() => {
        const clean = sanitizeQuery(query);
        if (!clean) {
            inputRef.current?.focus();
            return;
        }
        setStatus("locating");
        setHospitals([]);
        setErrorMsg("");
        setResolvedTerms([]);
        setSearchedRadius(null);

        if (!navigator.geolocation) {
            setStatus("error");
            setErrorMsg("GPS not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = sanitizeCoord(pos.coords.latitude, -90, 90);
                const lng = sanitizeCoord(pos.coords.longitude, -180, 180);
                if (!lat || !lng) {
                    setStatus("error");
                    setErrorMsg("GPS error");
                    return;
                }
                setUserCoords({ lat, lng });
                fetchHospitals(lat, lng, clean);
            },
            (err) => {
                setStatus("error");
                const messages = {
                    1: "Location denied",
                    2: "GPS signal lost",
                    3: "Timeout",
                };
                setErrorMsg(messages[err.code] || "Location error");
            },
            { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true },
        );
    }, [query, fetchHospitals]);

    const switchTrack = (t) => {
        setTrack(t);
        setQuery("");
        setHospitals([]);
        setStatus("idle");
        setResolvedTerms([]);
        setSearchedRadius(null);
    };

    const isEmergency = track === "emergency";
    const isActive = status === "locating" || status === "searching";

    const theme = {
        bg: isDark
            ? isEmergency
                ? "bg-gray-950"
                : "bg-amber-950"
            : isEmergency
              ? "bg-gray-50"
              : "bg-amber-50",
        surface: isDark ? "bg-gray-900/80" : "bg-white/80",
        border: isDark ? "border-gray-800" : "border-gray-200",
        text: isDark ? "text-white" : "text-gray-900",
        muted: isDark ? "text-gray-400" : "text-gray-600",
    };

    const suggestions = isEmergency
        ? [
              { icon: "🩸", label: "Blood Bank", value: "blood bank" },
              { icon: "🛏️", label: "ICU Bed", value: "ICU bed" },
              { icon: "💨", label: "Oxygen", value: "oxygen" },
              { icon: "🐍", label: "Snake Bite", value: "snake bite" },
              {
                  icon: "🔪",
                  label: "Emergency Surgery",
                  value: "emergency surgery",
              },
              { icon: "👶", label: "Maternity", value: "maternity" },
              { icon: "🫀", label: "Heart Attack", value: "heart attack" },
              { icon: "🧪", label: "CT Scan", value: "CT scan" },
          ]
        : [
              { icon: "✨", label: "BBL", value: "BBL" },
              {
                  icon: "💇",
                  label: "Hair Transplant",
                  value: "hair transplant",
              },
              { icon: "🦷", label: "Dental Veneers", value: "dental veneers" },
              { icon: "👃", label: "Rhinoplasty", value: "rhinoplasty" },
              { icon: "💉", label: "Botox", value: "botox" },
              { icon: "🌟", label: "Skin Revision", value: "skin revision" },
              { icon: "⚗️", label: "Liposuction", value: "liposuction" },
              { icon: "💋", label: "Lip Filler", value: "filler" },
          ];

    return (
        <>
            <Head>
                <title>{`QuickCure NG — ${isEmergency ? "Emergency Medical Care" : "Premium Aesthetic Surgery"} Nigeria`}</title>

                {/* Primary Meta Tags */}
                <meta
                    name="description"
                    content={
                        isEmergency
                            ? "Find emergency hospitals, blood banks, ICU beds, and medical services near you in Nigeria. Real-time availability. Free and fast."
                            : "Find LSMOH-verified aesthetic surgeons for BBL, hair transplant, rhinoplasty, and more in Nigeria. Free consultations."
                    }
                />
                <meta
                    name="keywords"
                    content={
                        isEmergency
                            ? "emergency hospital Nigeria, blood bank Lagos, ICU bed Abuja, snake bite treatment, oxygen supply"
                            : "BBL surgery Nigeria, hair transplant Lagos, rhinoplasty Abuja, dental veneers, botox Nigeria"
                    }
                />
                <meta name="robots" content="index, follow" />
                <meta name="author" content="QuickCure NG" />

                {/* Open Graph / Social Media */}
                <meta property="og:type" content="website" />
                <meta property="og:locale" content="en_NG" />
                <meta
                    property="og:title"
                    content={`QuickCure NG — ${isEmergency ? "Emergency Care" : "Beauty & Aesthetics"} Nigeria`}
                />
                <meta
                    property="og:description"
                    content={
                        isEmergency
                            ? "Find emergency medical help near you in Nigeria. Real-time availability."
                            : "Find verified aesthetic surgeons in Nigeria. Free consultations."
                    }
                />
                <meta property="og:url" content="https://quickcure-ng.com" />
                <meta property="og:site_name" content="QuickCure NG" />
                <meta
                    property="og:image"
                    content="https://quickcure-ng.com/og-image.jpg"
                />
                <meta
                    property="og:image:alt"
                    content="QuickCure NG - Nigeria's Healthcare Directory"
                />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta
                    name="twitter:title"
                    content={`QuickCure NG — ${isEmergency ? "Emergency" : "Beauty"} Care`}
                />
                <meta
                    name="twitter:description"
                    content={
                        isEmergency
                            ? "Find emergency hospitals and clinics near you"
                            : "Find verified aesthetic surgeons in Nigeria"
                    }
                />
                <meta
                    name="twitter:image"
                    content="https://quickcure-ng.com/og-image.jpg"
                />

                {/* Theme & Appearance */}
                <meta
                    name="theme-color"
                    content={
                        isEmergency
                            ? isDark
                                ? "#0f172a"
                                : "#f8fafc"
                            : isDark
                              ? "#451a03"
                              : "#fef3c7"
                    }
                />
                <meta name="color-scheme" content={isDark ? "dark" : "light"} />

                {/* Security */}
                <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
                <meta httpEquiv="X-Frame-Options" content="DENY" />
                <meta
                    name="referrer"
                    content="strict-origin-when-cross-origin"
                />

                {/* Canonical URL */}
                <link rel="canonical" href="https://quickcure-ng.com" />

                {/* Performance: Preconnect to Google Fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />

                {/* Fonts */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
                    rel="stylesheet"
                />

                {/* Structured Data / JSON-LD */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebApplication",
                        name: "QuickCure NG",
                        alternateName: "Sabi Hospital",
                        description: isEmergency
                            ? "Find emergency hospitals, blood banks, ICU beds near you in Nigeria. Real-time availability."
                            : "Find verified aesthetic surgeons, BBL, hair transplant in Nigeria. Free consultations.",
                        url: "https://quickcure-ng.com",
                        applicationCategory: "HealthApplication",
                        operatingSystem: "Any",
                        creator: {
                            "@type": "Organization",
                            name: "QuickCure NG",
                        },
                        offers: {
                            "@type": "Offer",
                            price: "0",
                            priceCurrency: "NGN",
                        },
                        areaServed: {
                            "@type": "Country",
                            name: "Nigeria",
                        },
                        potentialAction: {
                            "@type": "SearchAction",
                            target: "https://quickcure-ng.com/?search={search_term_string}",
                            "query-input": "required name=search_term_string",
                        },
                    })}
                </script>
            </Head>

            <div
                className={`min-h-screen font-sans antialiased transition-all duration-300 ${theme.bg} ${theme.text}`}
            >
                {/* Offline banner */}
                {isOffline && (
                    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/10 backdrop-blur-md border-b border-amber-500/20 px-4 py-2 text-center text-xs">
                        📵 Offline — showing cached results
                    </div>
                )}

                {/* Outbreak ticker */}
                {isEmergency && <OutbreakTicker alerts={alerts} />}

                {/* Hero */}
                <div className="relative min-h-[90vh] flex items-center justify-center px-4">
                    <div className="absolute inset-0 overflow-hidden">
                        <div
                            className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse ${isEmergency ? "bg-red-500" : "bg-amber-500"}`}
                        />
                        <div
                            className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse delay-1000 ${isEmergency ? "bg-blue-500" : "bg-yellow-500"}`}
                        />
                    </div>

                    <div className="relative max-w-3xl w-full text-center space-y-8">
                        {/* Logo */}
                        <div
                            className="flex justify-center items-center gap-3 group cursor-pointer"
                            onClick={() =>
                                window.scrollTo({ top: 0, behavior: "smooth" })
                            }
                        >
                            <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${isEmergency ? "bg-red-500/20" : "bg-amber-500/20"}`}
                            >
                                ✚
                            </div>
                            <span className="text-2xl font-black tracking-tight">
                                {isEmergency
                                    ? "Sabi Hospital"
                                    : "QuickCure Beauty"}
                            </span>
                        </div>

                        {/* Track toggle */}
                        <div className="flex justify-center gap-2 p-1 rounded-full backdrop-blur-sm bg-white/5 border border-white/10">
                            <button
                                onClick={() => switchTrack("emergency")}
                                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                                    isEmergency
                                        ? "bg-red-500 text-white shadow-lg scale-105"
                                        : `${theme.muted} hover:bg-white/10`
                                }`}
                            >
                                🚨 Emergency
                            </button>
                            <button
                                onClick={() => switchTrack("aesthetics")}
                                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                                    !isEmergency
                                        ? "bg-amber-500 text-white shadow-lg scale-105"
                                        : `${theme.muted} hover:bg-white/10`
                                }`}
                            >
                                ✨ Beauty
                            </button>
                        </div>

                        {/* Headline */}
                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                                {isEmergency ? (
                                    <>
                                        Need{" "}
                                        <span className="text-red-500">
                                            medical help
                                        </span>{" "}
                                        now?
                                    </>
                                ) : (
                                    <>
                                        Find{" "}
                                        <span className="text-amber-500">
                                            verified surgeons
                                        </span>
                                    </>
                                )}
                            </h1>
                            <p
                                className={`text-base max-w-md mx-auto ${theme.muted}`}
                            >
                                {isEmergency
                                    ? 'Type anything — "snak bit", "oxigen" — we understand. Auto-expands search until help is found.'
                                    : "LSMOH-verified surgeons. Real results. Free consultations."}
                            </p>
                        </div>

                        {/* Search */}
                        <div className="space-y-4">
                            <div className="relative group">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">
                                    {isEmergency ? "🔍" : "✨"}
                                </span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) =>
                                        setQuery(e.target.value.slice(0, 100))
                                    }
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && handleSearch()
                                    }
                                    placeholder={
                                        isEmergency
                                            ? "e.g., snake bite, blood, ICU..."
                                            : "e.g., BBL, hair transplant..."
                                    }
                                    className={`w-full rounded-2xl border-0 py-4 pl-14 pr-5 text-lg outline-none backdrop-blur-sm transition-all focus:ring-2 focus:scale-[1.02] ${theme.surface} ${theme.border} focus:ring-${isEmergency ? "red" : "amber"}-500/50`}
                                />
                            </div>

                            <div className="flex flex-wrap justify-center gap-2">
                                {suggestions.map((s) => (
                                    <button
                                        key={s.value}
                                        onClick={() => {
                                            setQuery(s.value);
                                            inputRef.current?.focus();
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                                            query === s.value
                                                ? `${isEmergency ? "bg-red-500" : "bg-amber-500"} text-white`
                                                : `${theme.surface} ${theme.muted} hover:bg-white/10`
                                        }`}
                                    >
                                        {s.icon} {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Radius picker */}
                        {!isEmergency && (
                            <div className="flex justify-center gap-2">
                                {AESTHETICS_RADII.map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setAestheticsRadius(r)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                            aestheticsRadius === r
                                                ? "bg-amber-500 text-black"
                                                : theme.muted
                                        }`}
                                    >
                                        {r}km
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={handleSearch}
                            disabled={isActive}
                            className={`relative w-full max-w-sm mx-auto overflow-hidden rounded-full py-4 font-bold text-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                                isEmergency
                                    ? "bg-red-500 text-white"
                                    : "bg-amber-500 text-black"
                            }`}
                        >
                            <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                            {isActive ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>
                                        {status === "locating"
                                            ? "Getting location..."
                                            : "Searching..."}
                                    </span>
                                </div>
                            ) : isEmergency ? (
                                "🚨 Find Emergency Help"
                            ) : (
                                "✨ Find Verified Clinics"
                            )}
                        </button>

                        <p className={`text-xs ${theme.muted} opacity-60`}>
                            🔒 Location never stored · Free · Real-time
                        </p>
                    </div>
                </div>

                {/* Results */}
                <div className="max-w-6xl mx-auto px-4 py-12">
                    <SearchStatus
                        status={status}
                        errorMsg={errorMsg}
                        count={hospitals.length}
                        radius={searchedRadius}
                        query={query}
                        track={track}
                        onRetry={handleSearch}
                    />

                    {hospitals.length > 0 && (
                        <>
                            <p
                                className={`text-center text-sm mb-6 ${theme.muted}`}
                            >
                                Found{" "}
                                <strong
                                    className={
                                        isEmergency
                                            ? "text-red-400"
                                            : "text-amber-400"
                                    }
                                >
                                    {hospitals.length}
                                </strong>{" "}
                                {isEmergency ? "hospital" : "clinic"}
                                {hospitals.length !== 1 && "s"} with "
                                <strong>{query}"</strong>
                                {searchedRadius && (
                                    <span> within {searchedRadius}km</span>
                                )}
                            </p>
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {hospitals.map((h) =>
                                    isEmergency ? (
                                        <HospitalCard
                                            key={h.id}
                                            hospital={h}
                                            onFeedback={() =>
                                                setFeedbackTarget(h)
                                            }
                                        />
                                    ) : (
                                        <AestheticsCard
                                            key={h.id}
                                            hospital={h}
                                            onLead={() => setLeadTarget(h)}
                                        />
                                    ),
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Emergency hotlines */}
                {isEmergency && (
                    <div className="border-t py-12">
                        <div className="max-w-2xl mx-auto px-4">
                            <h2
                                className={`text-center text-xs font-bold uppercase tracking-wider mb-6 ${theme.muted}`}
                            >
                                Emergency Numbers
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    {
                                        name: "NEMA",
                                        number: "0800225563",
                                        display: "0800-NEMA",
                                    },
                                    {
                                        name: "Police",
                                        number: "112",
                                        display: "112",
                                    },
                                    {
                                        name: "Fire",
                                        number: "017944996",
                                        display: "01-7944996",
                                    },
                                    {
                                        name: "Ambulance",
                                        number: "0700527262",
                                        display: "0700-LASAMBUS",
                                    },
                                ].map((h) => (
                                    <a
                                        key={h.name}
                                        href={`tel:${h.number}`}
                                        className={`text-center p-3 rounded-xl border transition-all hover:scale-105 ${theme.surface} ${theme.border}`}
                                    >
                                        <div className="text-sm font-semibold">
                                            {h.name}
                                        </div>
                                        <div
                                            className={`text-sm font-bold mt-1 ${isEmergency ? "text-red-400" : "text-amber-400"}`}
                                        >
                                            {h.display}
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <footer className="border-t py-6 text-center text-xs opacity-50">
                    <p>
                        © {new Date().getFullYear()} QuickCure NG ·{" "}
                        <a href="/legal" className="underline">
                            Legal
                        </a>{" "}
                        · Emergency? Call 112
                    </p>
                </footer>
            </div>

            {feedbackTarget && (
                <FeedbackModal
                    hospital={feedbackTarget}
                    userCoords={userCoords}
                    onClose={() => setFeedbackTarget(null)}
                />
            )}
            {leadTarget && (
                <LeadCaptureModal
                    hospital={leadTarget}
                    onClose={() => setLeadTarget(null)}
                />
            )}
        </>
    );
}
