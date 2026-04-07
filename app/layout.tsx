import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/request";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hustle-AI",
  description: "Marketing automation SaaS for indie hackers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
