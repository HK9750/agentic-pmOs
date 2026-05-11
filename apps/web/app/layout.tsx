import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic PM OS",
  description: "Agentic project management platform for engineering teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
