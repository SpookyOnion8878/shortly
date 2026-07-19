import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shortly — Modern URL Shortener",
  description:
    "A self-hostable URL shortener with deep click analytics. Built with Next.js, TypeScript and Tailwind CSS.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  )
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
          <header className="mb-8 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 font-bold">
                S
              </span>
              <span className="text-lg font-semibold tracking-tight">Shortly</span>
            </a>
            <a
              href="/"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              New link
            </a>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-12 text-center text-xs text-slate-500">
            Built with Next.js · TypeScript · Tailwind CSS — MIT Licensed
          </footer>
        </div>
      </body>
    </html>
  );
}
