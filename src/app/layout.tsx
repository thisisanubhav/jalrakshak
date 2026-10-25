import type { Metadata, Viewport } from "next";
import { ClickRipple } from "@/components/ClickRipple";
import "./globals.css";
import "./reference-ui.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata: Metadata = {
  title: "JalRakshak | Water Measurement & Field Follow-up",
  description:
    "Offline-first manual water measurement quality, historical comparisons and investigation records for field teams across India",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JalRakshak",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d594f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<ClickRipple /></body>
    </html>
  );
}
