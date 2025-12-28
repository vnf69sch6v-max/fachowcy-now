"use client";

import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";

interface ImageUploaderProps {
    onUpload: (url: string) => void;
    folder: string;
}

export function ImageUploader({ onUpload, folder }: ImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { uploadImage, uploading } = useImageUpload();
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);

        // Upload
        const path = `${folder}/${Date.now()}_${file.name}`;
        const url = await uploadImage(file, path);
        if (url) {
            onUpload(url);
        }
    };

    return (
        <div className="relative">
            {preview ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 group">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                            onClick={() => {
                                setPreview(null);
                                if (inputRef.current) inputRef.current.value = '';
                            }}
                            className="bg-red-500/80 p-2 rounded-full hover:bg-red-600 transition"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
                >
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    ) : (
                        <>
                            <div className="p-3 bg-slate-800 rounded-full group-hover:scale-110 transition">
                                <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
                            </div>
                            <span className="text-xs text-slate-400 group-hover:text-slate-300">Dodaj zdjęcie problemu</span>
                        </>
                    )}
                </button>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
            />
        </div>
    );
}
