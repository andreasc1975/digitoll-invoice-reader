import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digitoll Invoice Reader",
  description: "Extract customs data from invoices for Digitoll declarations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" data-theme="light">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}