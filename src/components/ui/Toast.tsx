"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info, XCircle, X, Wifi, WifiOff } from "lucide-react";

// ===========================================
// TYPES
// ===========================================

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, "id">) => void;
    showError: (title: string, message?: string) => void;
    showSuccess: (title: string, message?: string) => void;
    showInfo: (title: string, message?: string) => void;
    showWarning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// ===========================================
// TOAST COMPONENT
// ===========================================

const TOAST_ICONS: Record<ToastType, typeof AlertCircle> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
};

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        icon: "text-emerald-400",
    },
    error: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        icon: "text-red-400",
    },
    warning: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        icon: "text-amber-400",
    },
    info: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        icon: "text-blue-400",
    },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const Icon = TOAST_ICONS[toast.type];
    const styles = TOAST_STYLES[toast.type];

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`${styles.bg} ${styles.border} border backdrop-blur-xl rounded-xl p-4 shadow-2xl max-w-sm w-full`}
        >
            <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{toast.title}</p>
                    {toast.message && (
                        <p className="text-slate-400 text-xs mt-1">{toast.message}</p>
                    )}
                </div>
                <button
                    onClick={onDismiss}
                    className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}

// ===========================================
// TOAST PROVIDER
// ===========================================

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toast: Omit<Toast, "id">) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newToast: Toast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto dismiss
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const showError = useCallback((title: string, message?: string) => {
        showToast({ type: "error", title, message });
    }, [showToast]);

    const showSuccess = useCallback((title: string, message?: string) => {
        showToast({ type: "success", title, message });
    }, [showToast]);

    const showInfo = useCallback((title: string, message?: string) => {
        showToast({ type: "info", title, message });
    }, [showToast]);

    const showWarning = useCallback((title: string, message?: string) => {
        showToast({ type: "warning", title, message });
    }, [showToast]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, showError, showSuccess, showInfo, showWarning }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map(toast => (
                        <div key={toast.id} className="pointer-events-auto">
                            <ToastItem
                                toast={toast}
                                onDismiss={() => dismissToast(toast.id)}
                            />
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

// ===========================================
// HOOK
// ===========================================

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

// ===========================================
// OFFLINE INDICATOR
// ===========================================

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);

    // Listen for online/offline events
    if (typeof window !== "undefined") {
        window.addEventListener("online", () => setIsOnline(true));
        window.addEventListener("offline", () => setIsOnline(false));
    }

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-red-500/90 backdrop-blur-sm py-2 px-4 flex items-center justify-center gap-2 text-white text-sm font-medium"
                >
                    <WifiOff className="w-4 h-4" />
                    Brak połączenia z internetem
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ===========================================
// ERROR BOUNDARY FALLBACK
// ===========================================

export function ErrorFallback({
    error,
    resetErrorBoundary
}: {
    error: Error;
    resetErrorBoundary: () => void;
}) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                    Coś poszło nie tak
                </h1>
                <p className="text-slate-400 mb-6">
                    {error.message || "Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę."}
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Odśwież stronę
                    </button>
                    <button
                        onClick={resetErrorBoundary}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
                    >
                        Spróbuj ponownie
                    </button>
                </div>
            </div>
        </div>
    );
}
