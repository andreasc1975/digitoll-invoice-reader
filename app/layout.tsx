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
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}