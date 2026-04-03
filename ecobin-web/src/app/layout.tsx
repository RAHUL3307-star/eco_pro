import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

/**
 * Font loading via next/font — automatically self-hosts the fonts
 * (no external requests to Google), optimizes loading, and prevents
 * layout shift (FOUT/FOIT).
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "EcoBin — Smart Waste Segregation",
  description:
    "IoT-powered smart waste segregation system. Monitor bin levels, earn EcoCoins, and track your environmental impact in real-time.",
  keywords: [
    "EcoBin",
    "smart waste",
    "IoT",
    "waste segregation",
    "EcoCoins",
    "recycling",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="font-body bg-eco-bg text-eco-text antialiased">
        {children}
      </body>
    </html>
  );
}
