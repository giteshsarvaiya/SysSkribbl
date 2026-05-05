import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const BASE_URL = "https://skribbl.giteshsarvaiya.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "SysSkribbl — Draw. Guess. Architect.",
  description:
    "Skribbl.io meets System Design. Draw distributed systems, let others guess.",
  openGraph: {
    title: "SysSkribbl — Draw. Guess. Architect.",
    description:
      "Skribbl.io meets System Design. Draw distributed systems, let others guess.",
    url: BASE_URL,
    siteName: "SysSkribbl",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SysSkribbl — Draw. Guess. Architect.",
    description:
      "Skribbl.io meets System Design. Draw distributed systems, let others guess.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable}`}>
      <body className="font-nunito min-h-screen bg-game-bg text-game-text">
        {children}
      </body>
    </html>
  );
}
