"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LayoutDashboard, Map as MapIcon, LogOut, User as UserIcon, RefreshCw, Plus } from "lucide-react";
import { MapProvider } from "@/components/features/MapProvider";
import dynamic from "next/dynamic";
import { RoutePolyline } from "@/components/map/RoutePolyline";
import { SearchOverlay, CategoryType, PlaceLocation } from "@/components/features/SearchOverlay";
import { ProCard } from "@/components/ui/ProCard";
import { ChatWindow } from "@/components/features/ChatWindow";
import { DashboardView } from "@/components/features/DashboardView";
import { ClientDashboard } from "@/components/features/ClientDashboard";
import { ProDashboard } from "@/components/features/ProDashboard";
import { AnimatePresence } from "framer-motion";
import { seedFachowcy } from "@/lib/seedFachowcy";
import { addDoc, collection, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { bookingConverter, generateBookingHash, BookingStatus } from "@/types/firestore-v2";
import { ChatService } from "@/lib/chat-service";
import { AIJobAssistant } from "@/components/features/AIJobAssistant";
import { BookingModal } from "@/components/features/BookingModal";
import { BottomTabBar, TabType } from "@/components/navigation/BottomTabBar";
import { MessagesTab } from "@/components/features/MessagesTab";

import { ProviderProfile } from "@/types/firestore";
import { useClientLocation, useDirections, calculateStraightDistance, formatDistance, formatDuration } from "@/hooks/useDirections";

// UI Professional Type (Mapped from Provider)
interface Professional {
  id: string;
  name: string;
  profession: string;
  price: number;
  rating: number;
  reviewCount?: number;
  imageUrl: string;
  location: { lat: number; lng: number };
  isPromoted?: boolean;
}

// Dynamic import to prevent SSR hydration errors with Google Maps
const MapOverview = dynamic(() => import("@/components/features/MapOverview").then(mod => mod.MapOverview), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500 animate-pulse">Ładowanie mapy...</div>
});

import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function Home() {
  const { user, loading, userRole,
    setRole,
    toggleRole,
    loginAsDemoSponsor,
    loginGoogle,
    loginWithEmail,
    registerWithEmail,
    logout
  } = useAuth();

  usePushNotifications(); // Init Push Notifications

  const router = useRouter();
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [activeChatPro, setActiveChatPro] = useState<Professional | null>(null);
  const [bookingModalPro, setBookingModalPro] = useState<Professional | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("Wszyscy");
  const [mapCenter, setMapCenter] = useState<PlaceLocation | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  const [fitBoundsLocations, setFitBoundsLocations] = useState<{ user: { lat: number; lng: number }; pro: { lat: number; lng: number } } | null>(null);

  // Email Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");

  // Check if we're in online mode (Google Maps API key present)
  const isOnline = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  // Get client's current location
  const { location: clientLocation } = useClientLocation();

  // Calculate directions when a professional is selected
  const directions = useDirections(
    clientLocation,
    selectedPro?.location || null
  );

  // Fallback distance calculation if Directions API not available
  const fallbackDistance = selectedPro && clientLocation
    ? calculateStraightDistance(clientLocation, selectedPro.location)
    : null;

  // Auto-redirect professionals to appropriate page (register or dashboard)
  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (!loading && user && userRole === 'professional') {
        // Check if we already redirected this session
        const hasRedirected = sessionStorage.getItem('pro_redirected');
        if (hasRedirected) return;

        try {
          // Check if user has a public profile (registered)
          if (!db) {
            router.push('/pro/register');
            return;
          }
          const { doc, getDoc } = await import('firebase/firestore');
          const profileRef = doc(db, 'public_profiles', user.uid);
          const profileSnap = await getDoc(profileRef);

          sessionStorage.setItem('pro_redirected', 'true');

          if (profileSnap.exists()) {
            // User is registered, go to dashboard
            router.push('/pro/dashboard');
          } else {
            // New user, go to registration
            router.push('/pro/register');
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          // Fallback to register on error
          sessionStorage.setItem('pro_redirected', 'true');
          router.push('/pro/register');
        }
      }
    };

    checkProfileAndRedirect();

    // Clear redirect flag when user logs out
    if (!user) {
      sessionStorage.removeItem('pro_redirected');
    }
  }, [loading, user, userRole, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 md:w-16 md:h-16 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Login Screen (Intro)
  if (!user) {
    const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError("");
      try {
        if (isRegistering) {
          await registerWithEmail(email, password, name || "Użytkownik");
        } else {
          await loginWithEmail(email, password);
        }
      } catch (err: any) {
        setAuthError(err.message || "Wystąpił błąd logowania");
      }
    };

    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="z-10 text-center space-y-6 bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-xl max-w-md w-full">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">FachowcyNow</h1>
          <p className="text-slate-400">
            Znajdź fachowca lub oferuj swoje usługi
          </p>

          {/* Role Selection */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setRole('client')}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all active:scale-95 ${userRole === 'client'
                ? 'bg-blue-500/20 border-blue-400/50 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/50'
                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50'
                }`}
            >
              <span className="text-2xl">👤</span>
              <span className="font-semibold text-sm">Jestem Klientem</span>
            </button>
            <button
              onClick={() => setRole('professional')}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all active:scale-95 ${userRole === 'professional'
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50'
                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50'
                }`}
            >
              <span className="text-2xl">🔧</span>
              <span className="font-semibold text-sm">Jestem Fachowcem</span>
            </button>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3 text-left">
            {isRegistering && (
              <input
                type="text"
                placeholder="Imię i Nazwisko"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            )}
            <input
              type="email"
              placeholder="Adres e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            <input
              type="password"
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />

            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}

            <button
              type="submit"
              className={`py-3 px-8 rounded-xl font-bold transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2 ${userRole === 'client' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              {isRegistering ? 'Zarejestruj się' : 'Zaloguj się'}
            </button>
          </form>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-slate-400 hover:text-white underline"
          >
            {isRegistering ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
          </button>

          <div className="flex items-center gap-2 opacity-50 my-1">
            <div className="h-px bg-white/20 flex-1" />
            <span className="text-xs text-white">LUB</span>
            <div className="h-px bg-white/20 flex-1" />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button" // Prevent form submission if inside form (though it's outside)
              onClick={async () => {
                setAuthError("");
                try {
                  await loginGoogle();
                } catch (error: any) {
                  console.error("Google Login Catch:", error);
                  // Translate common errors
                  if (error?.code === 'auth/unauthorized-domain') {
                    setAuthError("Domena nie jest autoryzowana w Firebase Console (Authentication -> Settings -> Authorized Domains).");
                  } else if (error?.code === 'auth/popup-closed-by-user') {
                    setAuthError("Okno logowania zostało zamknięte.");
                  } else {
                    setAuthError("Błąd logowania Google: " + (error.message || error));
                  }
                }
              }}
              className="py-3 px-8 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Kontynuuj z Google
            </button>

            <button
              onClick={loginAsDemoSponsor}
              className="py-3 px-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-transform active:scale-95 shadow-lg border border-white/10"
            >
              Wejdź jako Gość (Demo)
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
        {activeTab === "map" ? (
          <MapProvider>
            {/* Map Layer */}
            <div className="absolute inset-0 z-0">
              <MapOverview
                onSelectPro={(pro) => setSelectedPro(pro)}
                categoryFilter={activeCategory}
                centerLocation={mapCenter}
                userRole={userRole as 'client' | 'professional' | null}
                fitBoundsLocations={fitBoundsLocations}
                userLocation={clientLocation}
              />
              {/* Route Polyline (Uber-like) */}
              <RoutePolyline
                origin={clientLocation}
                destination={selectedPro?.location || null}
                isVisible={!!selectedPro}
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

              {/* Top Right User Menu - Positioned below search area */}
              <div className="absolute top-24 right-4 z-50 pointer-events-auto">
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg hover:bg-slate-800 transition-colors"
                  >
                    <UserIcon className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <div className="absolute top-12 right-0 w-64 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1 overflow-hidden">
                        <div className="px-3 py-2 border-b border-white/5 mb-1">
                          <p className="text-white font-semibold text-sm">{user?.displayName || 'Użytkownik'}</p>
                          <p className="text-xs text-slate-400 capitalize">{userRole === 'client' ? 'Klient' : 'Fachowiec'}</p>
                        </div>

                        <button
                          onClick={() => {
                            toggleRole();
                            setIsUserMenuOpen(false);
                            if (userRole === 'client') {
                              // Switching TO Professional
                              router.push('/pro/dashboard');
                            } else {
                              // Switching TO Client
                              setActiveTab('map'); // Ensure we see map or dashboard
                            }
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm transition-colors text-blue-300"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Przełącz na {userRole === 'client' ? 'Fachowca' : 'Klienta'}</span>
                        </button>

                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm transition-colors text-red-400"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Wyloguj</span>
                        </button>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Bottom Card Area - Fixed at bottom, above nav bar */}
              <div className="absolute bottom-20 left-4 right-4 md:left-8 md:right-auto z-20 pointer-events-none">
                <AnimatePresence>
                  {selectedPro && (
                    <div className="pointer-events-auto">
                      <ProCard
                        name={selectedPro.name}
                        profession={selectedPro.profession}
                        price={selectedPro.price}
                        rating={selectedPro.rating}
                        reviewCount={selectedPro.reviewCount}
                        distance={directions.distance.text || (fallbackDistance ? formatDistance(fallbackDistance.distanceKm) : undefined)}
                        duration={directions.duration.text || (fallbackDistance ? formatDuration(fallbackDistance.estimatedMinutes) : undefined)}
                        isLoading={directions.isLoading}
                        isPromoted={selectedPro.isPromoted}
                        imageUrl={selectedPro.imageUrl}
                        variant={userRole === 'professional' ? 'job' : 'default'}
                        onClose={() => setSelectedPro(null)}
                        onChat={() => setActiveChatPro(selectedPro)}
                        onBook={() => {
                          if (userRole === 'professional') {
                            // Pro clicked "Szczegóły" on a Job Pin
                            setActiveTab('orders');
                            setSelectedPro(null);
                          } else if (user) {
                            setBookingModalPro(selectedPro);
                          } else {
                            // login prompt logic if needed or just redirect
                            loginGoogle(); // Just basic usage
                          }
                        }}
                      />
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </MapProvider>


          // ... existing imports ...

          // Inside Home component render:
        ) : activeTab === "assistant" ? (
          /* Fullscreen AI Assistant View */
          <div className="w-full h-full bg-slate-950 flex flex-col pb-20">
            <AIJobAssistant
              isOpen={true}
              onClose={() => setActiveTab("map")}
              onJobCreated={(jobId) => {
                console.log('Job created:', jobId);
                setActiveTab("orders");
              }}
              onViewProOnMap={(pro) => {
                setSelectedPro({
                  id: pro.id,
                  name: pro.name,
                  profession: pro.profession,
                  price: pro.price,
                  rating: pro.rating,
                  reviewCount: pro.reviewCount,
                  imageUrl: pro.imageUrl,
                  location: pro.location,
                  isPromoted: false
                });
                if (clientLocation) {
                  setFitBoundsLocations({
                    user: clientLocation,
                    pro: pro.location
                  });
                }
                setActiveTab("map");
              }}
              onOpenChat={(pro) => {
                setActiveChatPro({
                  id: pro.id,
                  name: pro.name,
                  profession: pro.profession,
                  price: pro.price,
                  rating: pro.rating,
                  imageUrl: pro.imageUrl,
                  location: pro.location
                });
              }}
              fullscreen
            />
          </div>
        ) : activeTab === "messages" ? (
          /* Messages View */
          <div className="w-full h-full bg-slate-950 pb-20 overflow-hidden">
            <MessagesTab />
          </div>
        ) : activeTab === "orders" ? (
          /* Orders/Dashboard View */
          <div className="w-full h-full bg-slate-950 pb-20 overflow-y-auto">
            <DashboardView onChatOpen={(pro) => setActiveChatPro(pro)} />
          </div>
        ) : activeTab === "profile" ? (
          /* Profile View */
          <div className="w-full h-full bg-slate-950 pb-20 overflow-y-auto">
            <div className="max-w-md mx-auto p-6 pt-12">
              <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                </div>
                <h2 className="text-xl font-bold text-white">{user?.displayName || "Użytkownik"}</h2>
                <p className="text-slate-400 text-sm">{user?.email}</p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">
                  <span className={`w-2 h-2 rounded-full ${userRole === 'professional' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {userRole === 'professional' ? 'Fachowiec' : 'Klient'}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => toggleRole()}
                  className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-white/10 text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Przełącz rolę</p>
                      <p className="text-slate-400 text-sm">
                        {userRole === 'professional' ? 'Przełącz na Klienta' : 'Przełącz na Fachowca'}
                      </p>
                    </div>
                    <RefreshCw className="w-5 h-5 text-slate-400" />
                  </div>
                </button>

                {userRole === 'professional' && (
                  <button
                    onClick={() => router.push('/pro/dashboard')}
                    className="w-full p-4 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/20 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-400 font-medium">Panel Fachowca</p>
                        <p className="text-slate-400 text-sm">Zarządzaj zleceniami i kalendarzem</p>
                      </div>
                      <LayoutDashboard className="w-5 h-5 text-amber-400" />
                    </div>
                  </button>
                )}

                <button
                  onClick={logout}
                  className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/20 text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-400 font-medium">Wyloguj się</p>
                      <p className="text-slate-400 text-sm">Zakończ sesję</p>
                    </div>
                    <LogOut className="w-5 h-5 text-red-400" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <DashboardView onChatOpen={(pro) => setActiveChatPro(pro)} />
        )}
      </div>

      {/* Global Chat Overlay (moved outside map view) */}
      <div className="pointer-events-auto z-50">
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

      {/* New Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'orders' && userRole === 'professional') {
            router.push('/pro/dashboard');
          } else {
            setActiveTab(tab);
          }
        }}
        userRole={userRole as 'client' | 'professional' | null}
      />

      {/* FAB Button - Add Job (Only for Clients) */}
      {userRole === 'client' && activeTab === 'map' && (
        <button
          onClick={() => setIsAIAssistantOpen(true)}
          className="fixed bottom-28 right-4 md:right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 shadow-2xl shadow-violet-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      )}

      {/* AI Job Assistant Modal */}
      <AIJobAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onJobCreated={(jobId) => {
          console.log('Job created:', jobId);
          setIsAIAssistantOpen(false);
        }}
        onViewProOnMap={(pro) => {
          // Convert NearbyPro to Professional type and show on map
          setSelectedPro({
            id: pro.id,
            name: pro.name,
            profession: pro.profession,
            price: pro.price,
            rating: pro.rating,
            reviewCount: pro.reviewCount,
            imageUrl: pro.imageUrl,
            location: pro.location,
            isPromoted: false
          });

          // Fit map to show both user and professional
          if (clientLocation) {
            setFitBoundsLocations({
              user: clientLocation,
              pro: pro.location
            });
          }

          setIsAIAssistantOpen(false);
        }}
        onOpenChat={(pro) => {
          setIsAIAssistantOpen(false);
          setActiveChatPro({
            id: pro.id,
            name: pro.name,
            profession: pro.profession,
            price: pro.price,
            rating: pro.rating,
            reviewCount: pro.reviewCount,
            imageUrl: pro.imageUrl,
            location: pro.location,
            isPromoted: false
          });
        }}
      />

      {/* Role-based Dashboard Overlays - REMOVED FROM MAP VIEW 
          Bookings now belong in the Zlecenia tab for cleaner UX */}

      {/* Booking Modal (Direct from Map) */}
      {bookingModalPro && (
        <BookingModal
          isOpen={!!bookingModalPro}
          onClose={() => setBookingModalPro(null)}
          professional={{
            id: bookingModalPro.id,
            name: bookingModalPro.name,
            profession: bookingModalPro.profession,
            price: bookingModalPro.price,
            rating: bookingModalPro.rating,
            reviewCount: bookingModalPro.reviewCount || 0,
            imageUrl: bookingModalPro.imageUrl,
            location: bookingModalPro.location,
            distance: 0,
            estimatedArrival: 10, // minutes
            isVerified: true
          }}
          jobDescription="Rezerwacja bezpośrednia z mapy"
          category={bookingModalPro.profession}
          location={{
            lat: bookingModalPro.location.lat,
            lng: bookingModalPro.location.lng,
            address: "Lokalizacja zlecenia"
          }}
          onSuccess={(id) => {
            setBookingModalPro(null);
            setSelectedPro(null);
            setActiveTab('orders');
          }}
        />
      )}
    </div>
  );
}

