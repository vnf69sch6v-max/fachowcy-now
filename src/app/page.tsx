"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, LayoutDashboard, Map as MapIcon } from "lucide-react";
import { MapProvider } from "@/components/features/MapProvider";
import { MapOverview } from "@/components/features/MapOverview";
import { SearchOverlay, CategoryType, PlaceLocation } from "@/components/features/SearchOverlay";
import { ProCard } from "@/components/ui/ProCard";
import { ChatWindow } from "@/components/features/ChatWindow";
import { DashboardView } from "@/components/features/DashboardView";
import { ClientDashboard } from "@/components/features/ClientDashboard";
import { ProDashboard } from "@/components/features/ProDashboard";
import { RoleSwitcher } from "@/components/ui/RoleSwitcher";
import { AnimatePresence } from "framer-motion";
import { seedFachowcy } from "@/lib/seedFachowcy";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { ProviderProfile } from "@/types/firestore";

// UI Professional Type (Mapped from Provider)
interface Professional {
  id: string;
  name: string;
  profession: string;
  price: number;
  rating: number;
  imageUrl: string;
  location: { lat: number; lng: number };
}

export default function Home() {
  const { user, loginAsDemoSponsor, loginGoogle, loading, isDemoConfigured, userRole } = useAuth();
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [activeChatPro, setActiveChatPro] = useState<Professional | null>(null);
  const [view, setView] = useState<"map" | "dashboard">("map");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("Wszyscy");
  const [mapCenter, setMapCenter] = useState<PlaceLocation | null>(null);

  // Check if we're in online mode (Google Maps API key present)
  const isOnline = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  // Auto-login for demo speed if not logged in
  useEffect(() => {
    if (!loading && !user) {
      // Optional
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 md:w-16 md:h-16 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Login Screen (Intro)
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="z-10 text-center space-y-6 bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-xl">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">FachowcyNow</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Witaj w demo aplikacji. Kliknij poniżej, aby wejść jako inwestor i zobaczyć mapę Poznania.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={loginGoogle}
              className="py-3 px-8 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Zaloguj przez Google
            </button>

            <div className="flex items-center gap-2 opacity-50 my-1">
              <div className="h-px bg-white/20 flex-1" />
              <span className="text-xs text-white">LUB</span>
              <div className="h-px bg-white/20 flex-1" />
            </div>

            <button
              onClick={loginAsDemoSponsor}
              className="py-3 px-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-transform active:scale-95 shadow-lg border border-white/10"
            >
              Wejdź jako Gość (Demo)
            </button>
            {/* Login Screen Extra: Seed Button */}
            {!isDemoConfigured && (
              <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-center">Tryb Offline Aktywny</span>
            )}
            <button
              onClick={async () => {
                try {
                  const res = await seedFachowcy();
                  if (res.success) {
                    alert(`Sukces! Dodano ${res.count} fachowców. Odśwież stronę.`);
                  } else {
                    console.error("Seed error details:", res.error);
                    alert(`Błąd seedowania: ${typeof res.error === 'object' ? JSON.stringify(res.error) : res.error}`);
                  }
                } catch (e) {
                  alert("Krytyczny błąd: " + e);
                }
              }}
              className="text-xs text-slate-500 hover:text-white mt-2 underline"
            >
              [DEV] Załaduj dane do bazy
            </button>
            <button
              onClick={async () => {
                const { startSimulation, stopSimulation } = await import("@/lib/simulateLiveTraffic");
                // Simple toggle logic (in real app use state)
                // We assume if we click, we want to start, unless we want to stop. 
                // ideally we'd track state, but for dev tool simplified:
                const started = await startSimulation();
                if (started) alert("Symulacja ruchu włączona (Fachowcy będą się przemieszczać).");
                else {
                  stopSimulation();
                  alert("Symulacja zatrzymana.");
                }
              }}
              className="text-xs text-emerald-500 hover:text-emerald-400 mt-1 underline"
            >
              [DEV] Symuluj Ruch (Live)
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Main App View
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col">

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {view === "map" ? (
          <MapProvider>
            {/* Map Layer */}
            <div className="absolute inset-0 z-0">
              <MapOverview
                onSelectPro={(pro) => setSelectedPro(pro)}
                categoryFilter={activeCategory}
                centerLocation={mapCenter}
              />
            </div>

            {/* UI Layer */}
            <div className="relative z-10 w-full h-full pointer-events-none flex flex-col justify-between">
              <SearchOverlay
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                onPlaceSelect={setMapCenter}
                isOnline={isOnline}
              />

              {/* Bottom Card Area */}
              <div className="p-4 md:p-8 flex justify-center md:justify-start md:items-end pointer-events-none mb-16 md:mb-0">
                <AnimatePresence>
                  {selectedPro && (
                    <div className="pointer-events-auto">
                      <ProCard
                        name={selectedPro.name}
                        profession={selectedPro.profession}
                        price={selectedPro.price}
                        rating={selectedPro.rating}
                        timeAway="12 min"
                        imageUrl={selectedPro.imageUrl}
                        onChat={() => setActiveChatPro(selectedPro)}
                        onBook={async () => {
                          if (db && user) {
                            try {
                              await addDoc(collection(db, "orders"), {
                                clientId: user.uid,
                                proId: selectedPro.id,
                                proName: selectedPro.name,
                                price: selectedPro.price,
                                status: "pending",
                                createdAt: new Date()
                              });
                              console.log("Order created!");
                            } catch (e) { console.error("Booking error", e); }
                          }
                          setView("dashboard");
                        }}
                      />
                      <button
                        onClick={() => setSelectedPro(null)}
                        className="absolute top-2 right-2 text-white/50 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Chat Window Layer */}
              <div className="pointer-events-auto">
                <AnimatePresence>
                  {activeChatPro && (
                    <ChatWindow
                      proId={activeChatPro.id}
                      proName={activeChatPro.name}
                      proImage={activeChatPro.imageUrl}
                      onClose={() => setActiveChatPro(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </MapProvider>
        ) : (
          <DashboardView />
        )}
      </div>

      {/* Navigation Bar (Glassmorphism) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6 shadow-2xl">
        {/* Role Switcher */}
        <RoleSwitcher />

        <div className="w-px h-8 bg-white/10" />

        <button
          onClick={() => setView("map")}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'map' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <MapIcon className="w-5 h-5 md:w-6 md:h-6" />
          <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Mapa</span>
        </button>
        <div className="w-px h-8 bg-white/10" />
        <button
          onClick={() => setView("dashboard")}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'dashboard' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6" />
          <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Pulpit</span>
        </button>
      </div>

      {/* Role-based Dashboard Overlays */}
      <AnimatePresence>
        {view === "map" && userRole === 'client' && (
          <ClientDashboard
            onOpenChat={(proId, proName, proImage) => setActiveChatPro({
              id: proId,
              name: proName,
              profession: '',
              price: 0,
              rating: 0,
              imageUrl: proImage,
              location: { lat: 0, lng: 0 }
            })}
            onShowLocation={(lat, lng) => setMapCenter({ lat, lng, name: 'Lokalizacja zlecenia' })}
          />
        )}
        {view === "map" && userRole === 'professional' && (
          <ProDashboard />
        )}
      </AnimatePresence>
    </div>
  );
}

