import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FachowcyNow - Usługi Domowe",
  description: "Aplikacja łącząca klientów z fachowcami.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={cn(inter.className, "bg-slate-950 text-slate-100 antialiased min-h-screen")}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
