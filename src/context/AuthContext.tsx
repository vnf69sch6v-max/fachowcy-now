"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    signInAnonymously,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export type UserRole = 'client' | 'professional';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    userRole: UserRole;
    toggleRole: () => void;
    setRole: (role: UserRole) => void;
    loginAsDemoSponsor: () => Promise<void>;
    loginGoogle: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
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
    const [userRole, setUserRole] = useState<UserRole>('client');

    // Toggle between client and professional role
    const toggleRole = () => {
        setUserRole(prev => prev === 'client' ? 'professional' : 'client');
    };

    const setRole = (role: UserRole) => {
        setUserRole(role);
    };

    useEffect(() => {
        // Check if auth was initialized successfully in firebase.ts
        if (!auth) {
            console.warn("Firebase Auth not initialized (Missing keys?). Using Mock Mode.");
            // Wrap in timeout to avoid synchronous setState warning
            setTimeout(() => {
                setIsDemoConfigured(false);
                setLoading(false);
            }, 0);
            return;
        }

        try {
            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                setUser(currentUser);
                setLoading(false);

                // Ensure user doc exists in Firestore upon any login
                if (currentUser && db) {
                    const userRef = doc(db, "users", currentUser.uid);
                    const snap = await getDoc(userRef);
                    if (!snap.exists()) {
                        await setDoc(userRef, {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName,
                            role: 'client', // default role
                            createdAt: new Date()
                        }, { merge: true });
                    }
                }
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Auth state change error:", error);
            setTimeout(() => {
                setIsDemoConfigured(false);
                setLoading(false);
            }, 0);
        }
    }, []);

    const loginAsDemoSponsor = async () => {
        if (!isDemoConfigured || !auth || !db) {
            setTimeout(() => setUser(MOCK_USER), 500);
            return;
        }

        try {
            await signInAnonymously(auth);
            // Firestore data handled by onAuthStateChanged
        } catch (error) {
            console.error("Login failed:", error);
            setUser(MOCK_USER);
        }
    };

    const loginGoogle = async () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    }
    const loginWithEmail = async (email: string, pass: string) => {
        if (!auth) return;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    };

    const registerWithEmail = async (email: string, pass: string, name: string) => {
        if (!auth) return;
        try {
            const result = await createUserWithEmailAndPassword(auth, email, pass);
            // Create user doc
            if (db && result.user) {
                await setDoc(doc(db, "users", result.user.uid), {
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: name,
                    role: userRole,
                    createdAt: new Date()
                });
            }
        } catch (error) {
            console.error("Register Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        if (!isDemoConfigured || !auth) {
            setUser(null);
            return;
        }
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            userRole,
            toggleRole,
            setRole,
            loginAsDemoSponsor,
            loginGoogle,
            loginWithEmail,
            registerWithEmail,
            logout,
            isDemoConfigured
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

