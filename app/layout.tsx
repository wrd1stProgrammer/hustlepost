import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { getRequestLocale } from "@/lib/i18n/request";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hustle-AI",
  description: "Marketing automation SaaS for indie hackers",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
