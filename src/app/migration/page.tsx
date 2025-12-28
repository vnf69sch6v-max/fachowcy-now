"use client";

import { useState } from "react";
import { migrateOrdersToBookings, MigrationStats } from "@/lib/migrations/run-migration";
import { Loader2, Play, CheckCircle, AlertTriangle } from "lucide-react";

export default function MigrationPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<MigrationStats>({
        total: 0,
        migrated: 0,
        errors: 0,
        logs: []
    });

    const handleStartMigration = async () => {
        if (!confirm("Czy na pewno chcesz uruchomić migrację? Operacja zapisze dane do kolekcji 'bookings'.")) {
            return;
        }

        setIsRunning(true);
        setStats(prev => ({ ...prev, logs: [] }));

        try {
            await migrateOrdersToBookings((newStats) => {
                setStats(newStats);
            });
        } catch (error) {
            console.error("Migration fatal error", error);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 font-mono">
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-400 mb-2">
                        System Migracji Danych (v1 → v2)
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Narzędzie przenosi dane z kolekcji `orders` do `bookings`,
                        aplikując nowe statusy i tworząc snapshoty.
                    </p>
                </div>

                {/* Stats Panel */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-white/10 p-4 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase">Znaleziono</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="bg-slate-900 border border-white/10 p-4 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase">Zmigrowano</p>
                        <p className="text-2xl font-bold text-emerald-400">{stats.migrated}</p>
                    </div>
                    <div className="bg-slate-900 border border-white/10 p-4 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase">Błędy</p>
                        <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleStartMigration}
                        disabled={isRunning}
                        className={`
                            px-6 py-3 rounded-lg font-bold flex items-center gap-2
                            ${isRunning
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }
                        `}
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Przetwarzanie...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                Uruchom Migrację
                            </>
                        )}
                    </button>

                    {stats.migrated > 0 && !isRunning && (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <CheckCircle className="w-5 h-5" />
                            <span>Zakończono pomyślnie</span>
                        </div>
                    )}
                </div>

                {/* Console Output */}
                <div className="bg-black/50 border border-white/10 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
                    {stats.logs.length === 0 ? (
                        <span className="text-slate-600 italic">Gotowy do pracy...</span>
                    ) : (
                        stats.logs.map((log, i) => (
                            <div key={i} className="mb-1 text-slate-300 border-b border-white/5 pb-1 last:border-0">
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
