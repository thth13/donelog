import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const manrope = Manrope({ subsets: ["cyrillic", "latin"], variable: "--font-manrope" });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim() || requestHeaders.get("host") || "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol : /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
  const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`);
  const title = "Done — completed task journal";
  const description = "Record what you have done and watch your progress grow.";
  return {
    metadataBase,
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "Done",
      locale: "en_US",
      title,
      description,
      url: "/"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: new URL("/opengraph-image.png", metadataBase).href, alt: "Done — You did more than you think. A journal of things done." }]
    }
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `(() => { let theme; try { theme = localStorage.getItem("donelog-theme"); } catch {} document.documentElement.dataset.theme = theme === "light" || theme === "dark" ? theme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; })();` }} /></head><body className={manrope.variable}>{children}</body></html>;
}
