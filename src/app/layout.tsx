import type { Metadata } from "next";
import { Cairo, Readex_Pro } from "next/font/google";
import Providers from "@/app/providers";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-cairo",
});

const readex = Readex_Pro({
  subsets: ["arabic"],
  weight: ["400", "600"],
  variable: "--font-readex",
});

export const metadata: Metadata = {
  title: "نظام نقاط البيع",
  description: "لوحة تحكم وإدارة نقاط البيع",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"
        />
      </head>
      <body className={`${cairo.variable} ${readex.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
