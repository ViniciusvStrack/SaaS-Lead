import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./dashboard.css";

export const metadata: Metadata = { title: "SaaS Lead", description: "Recupere oportunidades comerciais no momento certo." };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
