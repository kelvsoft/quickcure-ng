/**
 * HospitalCard — Emergency track result card.
 * OFFLINE: Shows "Last known" badge if data is >30 min stale.
 * FEEDBACK: Flag button opens GPS-locked feedback modal.
 */
export default function HospitalCard({ hospital, index, onFeedback }) {
    const h = hospital ?? {};

    const tierBorder = { gold:'border-amber-800/40 hover:border-amber-600/60', silver:'border-slate-700/40 hover:border-slate-500/60', basic:'border-slate-800/40 hover:border-slate-700/50' }[h.tier] ?? 'border-slate-800/40';
    const tierBadge  = { gold:'bg-amber-950/40 text-amber-400 ring-amber-800/40', silver:'bg-slate-800/40 text-slate-400 ring-slate-700/40', basic:'bg-slate-900/40 text-slate-500 ring-slate-800/40' }[h.tier] ?? 'bg-slate-900/40 text-slate-500';
    const svcStyle   = {
        available: { dot:'bg-emerald-400', text:'text-emerald-400', label:'Available' },
        low:       { dot:'bg-amber-400',   text:'text-amber-400',   label:'Low Stock' },
        none:      { dot:'bg-red-500',     text:'text-red-500',     label:'Unavailable' },
    };

    // Offline mode — flag stale data (>30 min since last_confirmed_at)
    const isStale = h.services?.some(s => {
        if (!s.last_confirmed_at) return false;
        return (Date.now() - new Date(s.last_confirmed_at).getTime()) > 30 * 60 * 1000;
    });

    return (
        <article role="listitem" aria-label={`${h.name}, ${h.distance} km away`}
            className={`relative flex flex-col rounded-2xl border bg-slate-900/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 ${tierBorder}`}
            style={{ animationDelay:`${index*80}ms`, animation:'slideUp 0.4s ease both' }}>

            {/* Stale / offline badge */}
            {isStale && (
                <div className="absolute right-3 top-3 z-10 rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] text-slate-400" title="Data may be outdated — call ahead to confirm">
                    🕐 Last known
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className={`w-fit rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 ${tierBadge}`}>
                        {h.tier === 'gold' ? '⭐ Gold' : h.tier}
                    </span>
                    <h2 className="font-['Syne',sans-serif] text-base font-bold leading-tight text-white">{h.name}</h2>
                    <p className="text-xs text-slate-500">📍 {h.address}</p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-center rounded-xl bg-slate-800 px-3 py-2">
                    <span className="font-['Syne',sans-serif] text-xl font-extrabold leading-none text-white">{h.distance}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">km</span>
                </div>
            </div>

            {/* Services */}
            {h.services?.length > 0 && (
                <div className="flex flex-col gap-2 p-4">
                    {h.services.map((svc, i) => {
                        const st = svcStyle[svc.status] ?? svcStyle.none;
                        return (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2.5">
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${st.dot}`} aria-hidden="true" />
                                    <span className="truncate text-xs font-medium text-slate-200">{svc.service_name}</span>
                                </div>
                                <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                                    {svc.price && <span className="text-[11px] text-slate-500">₦{Number(svc.price).toLocaleString('en-NG')}</span>}
                                    <span className={`text-[11px] font-semibold ${st.text}`}>{st.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Actions */}
            <div className="mt-auto flex gap-2 border-t border-slate-800/60 p-4">
                <a href={`tel:${h.phone}`} aria-label={`Call ${h.name}`}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white transition hover:bg-red-500 active:scale-95">
                    📞 Call
                </a>
                {h.whatsapp_number && (
                    <a href={`https://wa.me/${h.whatsapp_number}`} target="_blank" rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center rounded-lg border border-green-800/40 bg-green-950/20 py-2.5 text-xs font-bold text-green-400 transition hover:bg-green-900/30 active:scale-95">
                        💬 WA
                    </a>
                )}
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.lat)},${encodeURIComponent(h.lng)}`}
                    target="_blank" rel="noopener noreferrer" aria-label="Get directions"
                    className="flex items-center justify-center rounded-lg bg-slate-800 px-3 py-2.5 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-white active:scale-95">
                    🗺
                </a>
                <button onClick={onFeedback} title="Report: service not available when I arrived"
                    aria-label="Report incorrect information (GPS required)"
                    className="flex items-center justify-center rounded-lg bg-slate-800 px-3 py-2.5 text-xs text-slate-500 transition hover:bg-red-950/40 hover:text-red-400 active:scale-95">
                    🚩
                </button>
            </div>
        </article>
    );
}

if (typeof document !== 'undefined' && !document.head.querySelector('[data-qc-c]')) {
    const s = document.createElement('style');
    s.setAttribute('data-qc-c','1');
    s.textContent = `@keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(s);
}