import { useState } from 'react';
import { router } from '@inertiajs/react';

export default function HospitalTable({ hospitals }) {
    const [search, setSearch] = useState('');

    // SECURITY: Filter is client-side only — safe, no SQL involved
    const filtered = hospitals.filter(h =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.address.toLowerCase().includes(search.toLowerCase())
    );

    const verify = (id) => {
        router.patch(`/admin/hospitals/${id}/verify`, {}, { preserveScroll: true });
    };

    const tierBadge = {
        gold:   'bg-amber-950/40 text-amber-400 ring-amber-800/40',
        silver: 'bg-slate-800/40 text-slate-400 ring-slate-700/40',
        basic:  'bg-slate-900/40 text-slate-500 ring-slate-800/40',
    };

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
            {/* Table header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="font-['Syne',sans-serif] text-base font-bold text-white">
                    All Hospitals ({hospitals.length})
                </h2>
                <input
                    type="search"
                    placeholder="Search hospitals..."
                    value={search}
                    onChange={e => setSearch(
                        // SECURITY: Limit search input length
                        e.target.value.slice(0, 100)
                    )}
                    aria-label="Search hospitals"
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-800"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full" aria-label="Hospitals list">
                    <thead>
                        <tr className="border-b border-slate-800/60 text-left">
                            {['Hospital', 'Tier', 'Phone', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-600">
                                    No hospitals found
                                </td>
                            </tr>
                        ) : filtered.map((h, i) => (
                            <tr
                                key={h.id}
                                className={`border-b border-slate-800/40 transition-colors hover:bg-slate-800/30 ${i % 2 === 0 ? '' : 'bg-slate-900/20'}`}
                            >
                                <td className="px-6 py-4">
                                    <p className="text-sm font-semibold text-white">{h.name}</p>
                                    <p className="text-xs text-slate-500">{h.address}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${tierBadge[h.tier] ?? tierBadge.basic}`}>
                                        {h.tier}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <a
                                        href={`tel:${h.phone}`}
                                        className="text-sm text-slate-400 transition hover:text-white"
                                        aria-label={`Call ${h.name}`}
                                    >
                                        {h.phone}
                                    </a>
                                </td>
                                <td className="px-6 py-4">
                                    {h.is_verified ? (
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                                            Verified
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                                            Pending
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        {!h.is_verified && (
                                            <button
                                                onClick={() => verify(h.id)}
                                                aria-label={`Verify ${h.name}`}
                                                className="rounded-lg bg-emerald-900/30 px-3 py-1.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-800/50 transition hover:bg-emerald-900/60"
                                            >
                                                Verify
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}