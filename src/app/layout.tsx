import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, JetBrains_Mono, Epilogue } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

/* UI Spec §6 — Typography */
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const epilogue = Epilogue({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MERIDIAN — Northwestern IPR",
  description:
    "AI-powered social media intelligence platform for Northwestern IPR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSerifDisplay.variable} ${jetbrainsMono.variable} ${epilogue.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
