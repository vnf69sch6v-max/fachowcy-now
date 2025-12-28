"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Ban, Check } from "lucide-react";
import { AvailabilityService } from "@/lib/availability-service";
import { ProviderSchedule, DaySchedule } from "@/types/firestore-v2";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Calendar for Providers to manage their availability
 * V1: Simple weekly template management + date blocking
 */
export function AvailabilityCalendar() {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState<ProviderSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null); // 0-6
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        loadSchedule();
    }, [user]);

    const loadSchedule = async () => {
        if (!user) return;
        try {
            const data = await AvailabilityService.getSchedule(user.uid);
            if (data) {
                setSchedule(data);
            } else {
                // Initialize default schedule
                const defaultSchedule: ProviderSchedule = {
                    userId: user.uid,
                    weeklySchedule: Array.from({ length: 7 }, (_, i) => ({
                        dayOfWeek: i,
                        isActive: i > 0 && i < 6, // Mon-Fri active by default
                        slots: [{ start: "09:00", end: "17:00" }]
                    })),
                    blockedDates: [],
                    instantBooking: false,
                    maxBookingsPerDay: 5,
                    updatedAt: null as any // Will be set on save
                };
                setSchedule(defaultSchedule);
            }
        } catch (error) {
            console.error("Failed to load schedule", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user || !schedule) return;
        setSaving(true);
        try {
            await AvailabilityService.saveSchedule(user.uid, schedule);
            // Show toast success
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setSaving(false);
        }
    };

    const toggleDayActive = (dayIndex: number) => {
        if (!schedule) return;
        const newWeekly = [...schedule.weeklySchedule];
        newWeekly[dayIndex] = {
            ...newWeekly[dayIndex],
            isActive: !newWeekly[dayIndex].isActive
        };
        setSchedule({ ...schedule, weeklySchedule: newWeekly });
    };

    const updateSlot = (dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
        if (!schedule) return;
        const newWeekly = [...schedule.weeklySchedule];
        const newSlots = [...newWeekly[dayIndex].slots];
        newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
        newWeekly[dayIndex] = { ...newWeekly[dayIndex], slots: newSlots };
        setSchedule({ ...schedule, weeklySchedule: newWeekly });
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Ładowanie grafiku...</div>;
    if (!schedule) return null;

    const DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

    return (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        Twój Grafik Pracy
                    </h2>
                    <p className="text-sm text-slate-400">Zarządzaj swoją dostępnością i godzinami pracy</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {saving ? "Zapisywanie..." : "Zapisz Zmiany"}
                </Button>
            </div>

            <div className="space-y-4">
                {schedule.weeklySchedule.map((day, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border transition-colors",
                            day.isActive
                                ? "bg-slate-800/50 border-slate-700"
                                : "bg-slate-900 border-slate-800 opacity-60"
                        )}
                    >
                        {/* Day Toggle */}
                        <div className="flex items-center gap-4 min-w-[150px]">
                            <button
                                onClick={() => toggleDayActive(index)}
                                className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                                    day.isActive
                                        ? "bg-blue-500 border-blue-500"
                                        : "border-slate-600 hover:border-slate-500"
                                )}
                            >
                                {day.isActive && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                            <span className={cn("font-medium", day.isActive ? "text-white" : "text-slate-500")}>
                                {DAYS[index]}
                            </span>
                        </div>

                        {/* Slots */}
                        {day.isActive ? (
                            <div className="flex-1 flex flex-wrap gap-3">
                                {day.slots.map((slot, slotIndex) => (
                                    <div key={slotIndex} className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700">
                                        <input
                                            type="time"
                                            value={slot.start}
                                            onChange={(e) => updateSlot(index, slotIndex, 'start', e.target.value)}
                                            className="bg-transparent text-white outline-none text-sm w-[60px]"
                                        />
                                        <span className="text-slate-600">-</span>
                                        <input
                                            type="time"
                                            value={slot.end}
                                            onChange={(e) => updateSlot(index, slotIndex, 'end', e.target.value)}
                                            className="bg-transparent text-white outline-none text-sm w-[60px]"
                                        />
                                    </div>
                                ))}
                                <Button variant="ghost" size="sm" className="text-xs text-blue-400 hover:text-blue-300">
                                    + Dodaj przerwę
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center gap-2 text-slate-500 italic text-sm">
                                <Ban className="w-4 h-4" /> Niedostępny
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-200">
                <p>💡 Wskazówka: Zablokowane daty i urlopy możesz ustawić w sekcji "Wyjątki i Urlopy".</p>
            </div>
        </Card>
    );
}
