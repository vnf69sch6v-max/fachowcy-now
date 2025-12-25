"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export function FirebaseStatus() {
    const [status, setStatus] = useState<{
        auth: "loading" | "connected" | "disconnected" | "error";
        db: "loading" | "connected" | "disconnected" | "error";
        errorMsg?: string;
    }>({ auth: "loading", db: "loading" });

    useEffect(() => {
        // 1. Check Auth Connection
        if (!auth) {
            setStatus(s => ({ ...s, auth: "error", errorMsg: "Auth object is null" }));
            return;
        }

        const unsubscribe = onAuthStateChanged(auth,
            (user) => {
                setStatus(s => ({ ...s, auth: "connected" }));
                console.log("[FirebaseStatus] Auth Connected. User:", user?.uid || "Anonymous");
            },
            (error) => {
                setStatus(s => ({ ...s, auth: "error", errorMsg: error.message }));
            }
        );

        // 2. Check DB Connection (Write/Read Test)
        async function checkDb() {
            if (!db) {
                setStatus(s => ({ ...s, db: "error", errorMsg: "DB object is null" }));
                return;
            }

            try {
                // Try to write a timestamp to a special 'system' or 'debug' collection
                // or just read something that definitely doesn't exist but checking connection
                const testRef = doc(db, "_debug_connectivity", "ping");
                await setDoc(testRef, { lastPing: new Date(), client: "web" });

                // If write succeeds, we are good
                setStatus(s => ({ ...s, db: "connected" }));
            } catch (e: any) {
                console.error("[FirebaseStatus] DB Error:", e);
                // "Missing or insufficient permissions" means we connected but were rejected -> VALID connection
                if (e.code === 'permission-denied') {
                    setStatus(s => ({ ...s, db: "connected", errorMsg: "Connected (but Permission Denied - Rules Issue)" }));
                } else if (e.code === 'unavailable') {
                    setStatus(s => ({ ...s, db: "disconnected", errorMsg: "Offline / Unavailable" }));
                } else {
                    setStatus(s => ({ ...s, db: "error", errorMsg: e.message }));
                }
            }
        }

        checkDb();

        return () => unsubscribe();
    }, []);

    // if (status.auth === "connected" && status.db === "connected") return null; // Hide if all good (or maybe show small indicator)

    return (
        <div className="fixed bottom-4 left-4 z-[9999] bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-2xl max-w-sm">
            <h3 className="text-white font-bold mb-2">Firebase Diagnostics</h3>

            <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-sm">Auth:</span>
                <StatusBadge status={status.auth} />
            </div>

            <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Firestore:</span>
                <StatusBadge status={status.db} />
            </div>

            {status.errorMsg && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                    {status.errorMsg}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                <button
                    onClick={async () => {
                        try {
                            // Dynamic import to avoid cycles or issues
                            const { seedFachowcy } = await import("@/lib/seedFachowcy");
                            const res = await seedFachowcy();
                            if (res.success) alert(`Dodano ${res.count} fachowców!`);
                            else alert("Błąd seedowania: " + res.error);
                        } catch (e) { alert("Err: " + e); }
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                >
                    [DEV] Załaduj Dane (Seed)
                </button>

                <button
                    onClick={async () => {
                        console.log("🔵 [DEBUG] Simulation button clicked!");
                        try {
                            const { startSimulation, stopSimulation } = await import("@/lib/simulateLiveTraffic");
                            console.log("🔵 [DEBUG] Module imported successfully");
                            const started = await startSimulation();
                            console.log("🔵 [DEBUG] startSimulation returned:", started);
                            if (started) alert("Symulacja odpalona!");
                            else {
                                stopSimulation();
                                alert("Symulacja STOP.");
                            }
                        } catch (e) {
                            console.error("🔴 [DEBUG] Error in simulation:", e);
                            alert("Błąd symulacji: " + e);
                        }
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors"
                >
                    [DEV] Symulacja Ruchu
                </button>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'loading') return <span className="text-yellow-500 text-xs">Connecting...</span>;
    if (status === 'connected') return <span className="text-emerald-500 text-xs font-bold">OK</span>;
    return <span className="text-red-500 text-xs font-bold uppercase">{status}</span>;
}
