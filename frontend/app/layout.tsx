import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "./providers/providers";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-serif",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luvira Guardian",
  description:
    "A secure AI incident response agent that observes incidents, reasons about appropriate responses, and orchestrates actions across developer tools while operating within explicit permission boundaries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-serif",
        robotoSlab.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Auth0Provider>{children}</Auth0Provider>
        </Providers>
      </body>
    </html>
  );
}
