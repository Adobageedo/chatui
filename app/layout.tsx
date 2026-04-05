import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./AppProviders";

export const metadata: Metadata = {
  title: "ChatUI - AI Assistant",
  description: "Your AI-powered chat assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-dvh">
      <body className="h-dvh antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
