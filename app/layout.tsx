import type { Metadata } from "next";
import { VT323, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AGENTIC_BENCHMARK",
  description: "Ranking of how agentic the hackathon projects really are.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${vt323.variable} ${jetbrains.variable}`}>
      <body>
        <div className="crt">
          <div className="scanlines" aria-hidden />
          {children}
        </div>
      </body>
    </html>
  );
}
