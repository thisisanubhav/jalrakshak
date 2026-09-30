import type { Metadata, Viewport } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata: Metadata = {
  title: "JalRakshak | Community Water Screening",
  description: "Offline-first field screening for community water sources in Jharkhand",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0d594f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
