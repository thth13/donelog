import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { TaskSync } from "@/components/TaskSync";

const manrope = Manrope({ subsets: ["cyrillic", "latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Done — completed task journal",
  description: "Record what you have done and watch your progress grow."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={manrope.variable}>{children}<TaskSync /></body></html>;
}
