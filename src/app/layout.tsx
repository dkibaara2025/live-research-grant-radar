import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Research Grant Radar",
  description: "Rank research funding opportunities and generate action plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
