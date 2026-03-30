/**
 * OutbreakTicker — scrolls right to left across top of emergency page.
 * Pauses on hover. Screen reader gets a static list.
 * Severity drives colour: critical=red, warning=amber, info=blue.
 */
export default function OutbreakTicker({ alerts = [] }) {
    if (!alerts?.length) return null;

    const top = alerts.some(a => a.severity === 'critical') ? 'critical'
              : alerts.some(a => a.severity === 'warning')  ? 'warning' : 'info';

    const s = {
        critical: { wrap: 'bg-red-950/95 border-red-800',    badge: 'bg-red-700 text-red-100',    text: 'text-red-200',   icon: '🚨' },
        warning:  { wrap: 'bg-amber-950/95 border-amber-800', badge: 'bg-amber-700 text-amber-100', text: 'text-amber-200', icon: '⚠️' },
        info:     { wrap: 'bg-blue-950/95 border-blue-800',   badge: 'bg-blue-700 text-blue-100',   text: 'text-blue-200',  icon: 'ℹ️' },
    }[top];

    const items = [...alerts, ...alerts]; // duplicate for seamless loop

    return (
        <div className={`relative flex items-center overflow-hidden border-b ${s.wrap}`}
            role="region" aria-label="Health outbreak alerts">
            {/* Fixed label */}
            <div className={`absolute left-0 z-10 flex h-full items-center px-3 ${s.wrap}`}>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.badge}`}>
                    {s.icon} ALERT
                </span>
            </div>

            {/* Scrolling track */}
            <div className="qct flex items-center py-2 pl-28 will-change-transform">
                {items.map((a, i) => (
                    <span key={`${a.id}-${i}`} className={`flex flex-shrink-0 items-center gap-2 pr-14 text-sm ${s.text}`}>
                        <strong className="font-bold">{a.title}:</strong>
                        <span>{a.message}</span>
                        <span className="text-lg opacity-30">·</span>
                    </span>
                ))}
            </div>

            {/* Screen reader */}
            <ul className="sr-only">{alerts.map(a => <li key={a.id}>{a.title}: {a.message}</li>)}</ul>

            <style>{`
                .qct{animation:qcTick 35s linear infinite;width:max-content}
                .qct:hover{animation-play-state:paused}
                @keyframes qcTick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
                @media(prefers-reduced-motion:reduce){.qct{animation:none}}
            `}</style>
        </div>
    );
}