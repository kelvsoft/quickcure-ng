/**
 * AestheticsCard — Track B money machine card.
 * Verified badge, before/after gallery, procedure list, lead CTA button.
 * Gold tier gets premium gold accent bar and featured label.
 */
export default function AestheticsCard({ hospital, index, onLead }) {
    const h      = hospital ?? {};
    const isGold = h.tier === 'gold';

    const cardClass = isGold
        ? 'border-amber-700/50 bg-gradient-to-b from-amber-950/40 to-[#0e0b07]/90 hover:border-amber-500/70'
        : 'border-slate-700/40 bg-[#0e0b07]/80 hover:border-slate-600/60';

    return (
        <article role="listitem" aria-label={`${h.name}, ${h.distance} km away`}
            className={`relative flex flex-col rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-900/20 ${cardClass}`}
            style={{ animationDelay:`${index*80}ms`, animation:'slideUp 0.4s ease both' }}>

            {/* Gold top bar */}
            {isGold && <div className="h-0.5 w-full rounded-t-2xl bg-gradient-to-r from-transparent via-amber-500/80 to-transparent" aria-hidden="true" />}
            {isGold && (
                <div className="absolute right-3 top-3 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 ring-1 ring-amber-600/30">⭐ Featured</div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-amber-900/20 p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {/* Verified badge — biggest trust signal in Nigerian aesthetics market */}
                    {h.is_verified && (
                        <div className="flex w-fit items-center gap-1.5 rounded-full border border-emerald-700/50 bg-emerald-950/40 px-2.5 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                            <span className="text-[10px] font-bold text-emerald-400">LSMOH Verified</span>
                        </div>
                    )}
                    <h2 className="font-['Syne',sans-serif] text-base font-bold leading-tight text-amber-50">{h.name}</h2>
                    <p className="text-xs text-slate-500">📍 {h.address}</p>
                </div>
                <div className={`flex flex-shrink-0 flex-col items-center rounded-xl px-3 py-2 ring-1 ${isGold?'bg-amber-950/40 ring-amber-900/30':'bg-slate-800 ring-slate-700/30'}`}>
                    <span className={`font-['Syne',sans-serif] text-xl font-extrabold leading-none ${isGold?'text-amber-300':'text-white'}`}>{h.distance}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">km</span>
                </div>
            </div>

            {/* Before/After Gallery — #1 thing beauty clients want to see */}
            {isGold && (
                <div className="border-b border-amber-900/20 px-4 py-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-800">Before / After</p>
                    <div className="flex gap-2">
                        {[0,1,2].map(n => (
                            <div key={n} className="aspect-square flex-1 overflow-hidden rounded-lg bg-amber-950/30 ring-1 ring-amber-900/30">
                                {h.gallery?.[n]
                                    ? <img src={h.gallery[n]} alt={`Result ${n+1}`} className="h-full w-full object-cover" loading="lazy" />
                                    : <div className="flex h-full items-center justify-center text-amber-900/50 text-sm">📸</div>
                                }
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Procedures */}
            {h.services?.length > 0 && (
                <div className="flex flex-col gap-1.5 p-4">
                    {h.services.slice(0,4).map((svc, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-amber-950/20 px-3 py-2 ring-1 ring-amber-900/20">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                                <span className="text-xs font-medium text-amber-100">{svc.service_name}</span>
                            </div>
                            {svc.price && <span className="text-xs font-semibold text-amber-400">₦{Number(svc.price).toLocaleString('en-NG')}</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* CTA */}
            <div className="mt-auto flex gap-2 border-t border-amber-900/20 p-4">
                <button onClick={onLead}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-['Syne',sans-serif] text-sm font-bold transition-all active:scale-95 ${isGold?'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20':'bg-amber-900/40 text-amber-400 ring-1 ring-amber-800/50 hover:bg-amber-900/60'}`}>
                    ✨ Free Consultation
                </button>
                {h.whatsapp_number && (
                    <a href={`https://wa.me/${h.whatsapp_number}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center rounded-xl border border-green-800/40 bg-green-950/20 px-4 py-3 text-xs font-bold text-green-400 transition hover:bg-green-900/30 active:scale-95">
                        💬
                    </a>
                )}
            </div>
        </article>
    );
}

if (typeof document !== 'undefined' && !document.head.querySelector('[data-qc-a]')) {
    const s = document.createElement('style');
    s.setAttribute('data-qc-a','1');
    s.textContent = `@keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(s);
}