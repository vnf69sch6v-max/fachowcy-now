"use client";

import { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase";

export function useImageUpload() {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const uploadImage = async (file: File, path: string): Promise<string | null> => {
        if (!app) {
            setError("Firebase not initialized");
            return null;
        }

        setUploading(true);
        setError(null);

        try {
            const storage = getStorage(app);
            const storageRef = ref(storage, path);

            // Simple upload (no resumable task for brevity)
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            setUploading(false);
            return url;
        } catch (e: any) {
            console.error("Upload error:", e);
            setError(e.message || "Upload failed");
            setUploading(false);
            return null;
        }
    };

    return { uploadImage, uploading, progress, error };
}
