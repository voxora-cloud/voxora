import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxora - Real-time Chat Support",
  description: "Open source real-time chat support platform for teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
