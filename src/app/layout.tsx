import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewGenius — Smart Google Review Generator",
  description:
    "Scan a QR code and get AI-generated unique review text to submit on Google Business. Boost your business reputation effortlessly.",
  keywords: ["google review", "business review", "QR code", "AI review generator"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f0f1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="antialiased bg-surface text-white min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
