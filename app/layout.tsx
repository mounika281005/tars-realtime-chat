import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Tars Realtime Chat",
  description: "Full-stack real-time messaging built with Next.js, Convex, and Clerk.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-zinc-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
