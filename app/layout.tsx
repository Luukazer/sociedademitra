import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ficha RPG",
  description: "Fichas digitais para o seu RPG.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
