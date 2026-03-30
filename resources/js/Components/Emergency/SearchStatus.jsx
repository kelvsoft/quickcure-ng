export default function SearchStatus({ status, errorMsg, count, radius, query, track, onRetry }) {
    const isEmergency = track !== 'aesthetics';
    const accent   = isEmergency ? 'text-red-400' : 'text-amber-400';
    const btnBase  = `mt-2 rounded-full border border-slate-700 bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-700 ${isEmergency?'hover:border-red-700':'hover:border-amber-700'}`;

    if (status === 'idle') return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-5xl">{isEmergency?'🏥':'✨'}</span>
            <p className="font-['Syne',sans-serif] text-lg font-bold text-slate-400">
                {isEmergency?'Tell us what you need':'What procedure are you looking for?'}
            </p>
            <p className="max-w-sm text-sm text-slate-600">
                {isEmergency
                    ? 'Type anything — even with spelling mistakes. "snak bit", "oxigen", "anti vermon" — we understand.'
                    : 'Type a procedure and we find the best verified surgeons near you.'}
            </p>
        </div>
    );

    if (status === 'locating') return (
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="status" aria-live="polite">
            <span className="animate-bounce text-4xl">📡</span>
            <p className="font-['Syne',sans-serif] text-lg font-bold text-white">Getting your location...</p>
            <p className="text-sm text-slate-500">Please allow location access when prompted</p>
        </div>
    );

    if (status === 'searching') return (
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="status" aria-live="polite">
            <span className="animate-pulse text-4xl">{isEmergency?'🔍':'✨'}</span>
            <p className="font-['Syne',sans-serif] text-lg font-bold text-white">
                Searching for <span className={accent}>"{query}"</span>...
            </p>
            <p className="text-sm text-slate-500">Finding {isEmergency?'hospitals':'clinics'} within {radius}km</p>
        </div>
    );

    if (status === 'error') return (
        <div className="flex flex-col items-center gap-4 py-16 text-center" role="alert" aria-live="assertive">
            <span className="text-4xl">⚠️</span>
            <p className="font-['Syne',sans-serif] text-lg font-bold text-red-400">Something went wrong</p>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">{errorMsg}</p>
            <button onClick={onRetry} className={btnBase}>Try Again</button>
        </div>
    );

    if (status === 'success' && count === 0) return (
        <div className="flex flex-col items-center gap-4 py-16 text-center" role="status">
            <span className="text-4xl">😔</span>
            <p className="font-['Syne',sans-serif] text-lg font-bold text-white">
                No results for <span className={accent}>"{query}"</span> within {radius}km
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
                Try a larger search radius, a different term, or call emergency services directly below.
            </p>
            <button onClick={onRetry} className={btnBase}>Search Again</button>
        </div>
    );

    return null;
}