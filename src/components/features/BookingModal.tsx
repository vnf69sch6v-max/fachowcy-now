"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Calendar, Clock, MapPin, CreditCard, Check, Loader2,
    ChevronLeft, ChevronRight, Shield
} from "lucide-react";
import { NearbyPro } from "@/lib/ai-assistant";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise, createPaymentIntent } from "@/lib/stripe";

type BookingStep = 'datetime' | 'summary' | 'payment' | 'success';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    professional: NearbyPro;
    jobDescription: string;
    category: string;
    location: { lat: number; lng: number; address: string };
    onSuccess?: (bookingId: string) => void;
}

// Inner component to use Stripe hooks
function PaymentForm({ amount, onSuccess, onError, isProcessing }: {
    amount: number;
    onSuccess: (paymentId: string) => void;
    onError: (msg: string) => void;
    isProcessing: boolean;
}) {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) return;

        try {
            // 1. Create Payment Intent
            const { clientSecret } = await createPaymentIntent(amount, "temp_booking_id");

            // 2. Confirm Card Payment
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                }
            });

            if (error) {
                onError(error.message || "Błąd płatności");
            } else if (paymentIntent && paymentIntent.status === "succeeded") {
                onSuccess(paymentIntent.id);
            }
        } catch (err: any) {
            onError(err.message || "Błąd serwera płatności");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10">
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#ffffff',
                                '::placeholder': { color: '#94a3b8' },
                            },
                            invalid: { color: '#ef4444' },
                        },
                    }}
                />
            </div>
            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Przetwarzanie...
                    </>
                ) : (
                    <>
                        <Shield className="w-5 h-5" /> Zapłać {amount} zł
                    </>
                )}
            </button>
        </form>
    );
}

export function BookingModal({
    isOpen,
    onClose,
    professional,
    jobDescription,
    category,
    location,
    onSuccess
}: BookingModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<BookingStep>('datetime');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [cardError, setCardError] = useState<string | null>(null);

    // Generate next 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
    });

    const timeSlots = [
        '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
    ];

    const formatDate = (date: Date) => {
        const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
        return {
            day: days[date.getDay()],
            date: date.getDate(),
            month: months[date.getMonth()]
        };
    };

    const handleNextStep = () => {
        if (step === 'datetime' && selectedDate && selectedTime) {
            setStep('summary');
        } else if (step === 'summary') {
            setStep('payment');
        }
    };

    const handlePaymentSuccess = async (paymentId: string) => {
        if (!db || !user) return;

        try {
            const [hours, minutes] = selectedTime!.split(':').map(Number);
            const scheduledDate = new Date(selectedDate!);
            scheduledDate.setHours(hours, minutes, 0, 0);

            await addDoc(collection(db, "bookings"), {
                clientId: user.uid,
                hostId: professional.id,
                hostSnapshot: {
                    displayName: professional.name,
                    avatarUrl: professional.imageUrl,
                    profession: professional.profession,
                    rating: professional.rating
                },
                serviceLocation: location,
                scheduledDate: Timestamp.fromDate(scheduledDate),
                status: 'PENDING_APPROVAL',
                pricing: {
                    totalAmount: professional.price,
                    currency: 'PLN'
                },
                paymentId: paymentId,
                createdAt: serverTimestamp(),
                jobDescription: jobDescription,
                category: category
            });

            setBookingId(paymentId);
            setStep('success');
            setTimeout(() => {
                onSuccess?.(paymentId);
            }, 3000);
        } catch (error) {
            console.error("Error saving booking:", error);
            setCardError("Płatność udana, ale wystąpił błąd zapisu. Skontaktuj się z obsługą.");
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl"
                >
                    {/* Header */}
                    {step !== 'success' && (
                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {step !== 'datetime' && (
                                    <button
                                        onClick={() => setStep(step === 'payment' ? 'summary' : 'datetime')}
                                        className="p-1 hover:bg-white/10 rounded-lg transition"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                                    </button>
                                )}
                                <h2 className="text-lg font-semibold text-white">
                                    {step === 'datetime' && 'Wybierz termin'}
                                    {step === 'summary' && 'Podsumowanie'}
                                    {step === 'payment' && 'Płatność'}
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {/* Step 1: Date/Time */}
                        {step === 'datetime' && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-white/5">
                                    <img src={professional.imageUrl} alt={professional.name} className="w-12 h-12 rounded-full object-cover" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white">{professional.name}</h3>
                                        <p className="text-sm text-slate-400">{professional.profession}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-emerald-400 font-bold">{professional.price} zł</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Wybierz dzień
                                    </h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {dates.map((date, i) => {
                                            const formatted = formatDate(date);
                                            const isSelected = selectedDate?.toDateString() === date.toDateString();
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedDate(date)}
                                                    className={`p-3 rounded-xl text-center transition ${isSelected
                                                        ? 'bg-violet-600 text-white'
                                                        : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-white/5'
                                                        }`}
                                                >
                                                    <div className="text-xs opacity-70">{formatted.day.slice(0, 3)}</div>
                                                    <div className="text-lg font-bold">{formatted.date}</div>
                                                    <div className="text-xs opacity-70">{formatted.month}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {selectedDate && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Wybierz godzinę
                                        </h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            {timeSlots.map((time) => (
                                                <button
                                                    key={time}
                                                    onClick={() => setSelectedTime(time)}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${selectedTime === time
                                                        ? 'bg-violet-600 text-white'
                                                        : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-white/5'
                                                        }`}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Summary */}
                        {step === 'summary' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                                    <img src={professional.imageUrl} alt={professional.name} className="w-16 h-16 rounded-full object-cover border-2 border-violet-500" />
                                    <div>
                                        <h3 className="font-semibold text-white text-lg">{professional.name}</h3>
                                        <p className="text-slate-400">{professional.profession}</p>
                                        <div className="flex items-center gap-1 text-yellow-400 text-sm mt-1">
                                            ⭐ {professional.rating} ({professional.reviewCount} opinii)
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                                        <Calendar className="w-5 h-5 text-violet-400 mt-0.5" />
                                        <div>
                                            <div className="text-white font-medium">
                                                {selectedDate && formatDate(selectedDate).day}, {selectedDate?.getDate()} {selectedDate && formatDate(selectedDate).month}
                                            </div>
                                            <div className="text-slate-400 text-sm">Godzina: {selectedTime}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                                        <MapPin className="w-5 h-5 text-violet-400 mt-0.5" />
                                        <div>
                                            <div className="text-white font-medium">Lokalizacja</div>
                                            <div className="text-slate-400 text-sm">{location.address}</div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-800/30 rounded-lg">
                                        <div className="text-slate-400 text-sm mb-1">Opis zlecenia:</div>
                                        <div className="text-white">{jobDescription}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-emerald-900/30 rounded-xl border border-emerald-500/20">
                                    <span className="text-slate-300">Do zapłaty</span>
                                    <span className="text-2xl font-bold text-emerald-400">{professional.price} zł</span>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Payment (Stripe) */}
                        {step === 'payment' && (
                            <Elements stripe={stripePromise}>
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                                        <Shield className="w-4 h-4 text-emerald-400" />
                                        <span>Bezpieczna płatność przez Stripe</span>
                                    </div>

                                    {cardError && (
                                        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                            {cardError}
                                        </div>
                                    )}

                                    <PaymentForm
                                        amount={professional.price}
                                        onSuccess={(pid) => handlePaymentSuccess(pid)}
                                        onError={(msg) => {
                                            setCardError(msg);
                                            setIsProcessing(false);
                                        }}
                                        isProcessing={isProcessing}
                                    />
                                </div>
                            </Elements>
                        )}

                        {/* Step 4: Success */}
                        {step === 'success' && (
                            <div className="text-center py-8">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-10 h-10 text-white" />
                                </motion.div>
                                <h2 className="text-2xl font-bold text-white mb-2">Rezerwacja potwierdzona!</h2>
                                <p className="text-slate-400 mb-6">{professional.name} potwierdzi wizytę wkrótce</p>
                                <p className="text-xs text-slate-500 mt-6">Przekierowanie do Moich Zleceń...</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Navigation (Excluding Payment Step) */}
                    {step !== 'success' && step !== 'payment' && (
                        <div className="px-5 py-4 border-t border-white/10">
                            {step === 'datetime' ? (
                                <button
                                    onClick={handleNextStep}
                                    disabled={!selectedDate || !selectedTime}
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    Dalej <ChevronRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleNextStep}
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    <CreditCard className="w-5 h-5" /> Przejdź do płatności
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
