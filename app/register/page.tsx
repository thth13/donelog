import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Create an account — Done" };

export default async function RegisterPage() {
  if (await currentUser()) redirect("/");
  return <main className="registration-shell">
    <div className="center-brand"><span><Check weight="bold" /></span>done</div>
    <section className="auth-card registration-card" aria-labelledby="auth-title">
      <AuthForm mode="register" />
    </section>
    <ThemeToggle />
  </main>;
}
