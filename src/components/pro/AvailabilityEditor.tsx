"use client";

import { useState, useEffect } from "react";
import { Clock, Save, Loader2 } from "lucide-react";
import { doc, setDoc, getDoc, serverTimestamp, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface Availability {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
    isActive: boolean;
}

const DAYS = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

export function AvailabilityEditor() {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState<Availability[]>(
        DAYS.map((_, i) => ({
            dayOfWeek: i,
            startHour: 8,
            endHour: 18,
            isActive: i > 0 && i < 6 // Mon-Fri default
        }))
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user || !db) return;

        const loadSchedule = async () => {
            try {
                const docRef = doc(db as Firestore, "provider_schedules", user.uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.weeklySchedule) {
                        setSchedule(data.weeklySchedule);
                    }
                }
            } catch (e) {
                console.error("Error loading schedule:", e);
            }
            setLoading(false);
        };

        loadSchedule();
    }, [user]);

    const handleSave = async () => {
        if (!user || !db) return;
        setSaving(true);
        try {
            await setDoc(doc(db as Firestore, "provider_schedules", user.uid), {
                userId: user.uid,
                weeklySchedule: schedule,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Error saving schedule:", e);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Ładowanie grafiku...</div>;

    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Godziny Pracy
            </h3>

            <div className="space-y-3">
                {schedule.map((day, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-slate-800/30 p-3 rounded-lg border border-white/5">
                        <label className="flex items-center gap-3 w-40 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={day.isActive}
                                onChange={(e) => {
                                    const updated = [...schedule];
                                    updated[idx].isActive = e.target.checked;
                                    setSchedule(updated);
                                }}
                                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0"
                            />
                            <span className={`text-sm font-medium ${day.isActive ? 'text-white' : 'text-slate-500'}`}>
                                {DAYS[idx]}
                            </span>
                        </label>

                        {day.isActive ? (
                            <div className="flex items-center gap-2">
                                <select
                                    value={day.startHour}
                                    onChange={(e) => {
                                        const updated = [...schedule];
                                        updated[idx].startHour = parseInt(e.target.value);
                                        setSchedule(updated);
                                    }}
                                    className="bg-slate-800 text-white rounded px-3 py-1.5 text-sm border border-white/10 focus:border-blue-500 outline-none"
                                >
                                    {Array.from({ length: 24 }, (_, h) => (
                                        <option key={h} value={h}>{h}:00</option>
                                    ))}
                                </select>
                                <span className="text-slate-400">-</span>
                                <select
                                    value={day.endHour}
                                    onChange={(e) => {
                                        const updated = [...schedule];
                                        updated[idx].endHour = parseInt(e.target.value);
                                        setSchedule(updated);
                                    }}
                                    className="bg-slate-800 text-white rounded px-3 py-1.5 text-sm border border-white/10 focus:border-blue-500 outline-none"
                                >
                                    {Array.from({ length: 24 }, (_, h) => (
                                        <option key={h} value={h}>{h}:00</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <span className="text-slate-600 text-sm italic">Niedostępne</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 rounded-xl text-white font-medium flex items-center gap-2 transition-colors"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Zapisz zmiany
                </button>
            </div>
        </div>
    );
}
