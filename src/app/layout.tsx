import type { Metadata, Viewport } from "next";
import {
  Bebas_Neue,
  Instrument_Serif,
  JetBrains_Mono,
  Schibsted_Grotesk,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4EBD8",
};

export const metadata: Metadata = {
  title: "Playbench Studio",
  description:
    "Playbench is a Los Angeles experimental studio for kinetic sculpture, hardware, and quiet wonders.",
  openGraph: {
    title: "Playbench Studio",
    description:
      "A Los Angeles experimental studio for kinetic sculpture, hardware, and more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Playbench Studio",
    description:
      "A Los Angeles experimental studio for kinetic sculpture, hardware, and more.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${schibsted.variable} ${jetbrains.variable} ${bebas.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
