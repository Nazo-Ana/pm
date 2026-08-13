import type { Metadata } from "next";
import "./globals.css";
import { DynamicBackground } from "@/components/DynamicBackground";

export const metadata: Metadata = {
  title: "Kanban Studio",
  description: "A focused, single-board kanban workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><DynamicBackground />{children}</body>
    </html>
  );
}
