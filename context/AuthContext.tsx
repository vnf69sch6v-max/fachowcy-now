"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, signInAnonymously, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    loginAsDemoSponsor: () => Promise<void>;
    logout: () => Promise<void>;
    isDemoConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Mock user for when Firebase is missing keys
const MOCK_USER = {
    uid: "sponsor-demo-id",
    displayName: "Sponsor Demo",
    email: "demo@sponsor.com",
    photoURL: null,
} as unknown as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDemoConfigured, setIsDemoConfigured] = useState(true);

    useEffect(() => {
        try {
            const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                setUser(currentUser);
                setLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.warn("Firebase Auth not configured correctly, using mock mode.", error);
            setTimeout(() => {
                setIsDemoConfigured(false);
                setLoading(false);
            }, 0);
        }
    }, []);

    const loginAsDemoSponsor = async () => {
        if (!isDemoConfigured) {
            // Fallback for demo without backend
            setUser(MOCK_USER);
            return;
        }

        try {
            const result = await signInAnonymously(auth);
            // Create user profile in Firestore
            await setDoc(doc(db, "users", result.user.uid), {
                name: "Sponsor Demo",
                role: "client", // or 'sponsor'
                isSponsor: true,
                createdAt: new Date(),
            }, { merge: true });
        } catch (error) {
            console.error("Login failed:", error);
            // Fallback to mock if real login fails
            setUser(MOCK_USER);
        }
    };

    const logout = async () => {
        if (!isDemoConfigured) {
            setUser(null);
            return;
        }
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginAsDemoSponsor, logout, isDemoConfigured }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
