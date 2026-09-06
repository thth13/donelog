import Link from "next/link";
import { ChartBar, Check } from "@phosphor-icons/react/dist/ssr";
import { TaskForm } from "@/components/TaskForm";
import { currentUser } from "@/lib/auth";
import { Landing } from "@/components/Landing";
import { AccountProvider } from "@/components/AccountProvider";
import { TaskSync } from "@/components/TaskSync";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function Home({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await currentUser();
  if (!user) return <Landing initialLoginOpen={(await searchParams).mode === "login"} />;
  return (
    <AccountProvider user={user}>
    <main className="home-shell">
      <section className="minimal-home">
        <div className="center-brand"><span><Check weight="bold" /></span>done</div>
        <TaskForm />
        <div className="minimal-meta">
          <time>{new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</time>
          <div className="minimal-actions"><Link href="/stats"><ChartBar weight="bold" /> Statistics</Link><ThemeToggle /></div>
        </div>
      </section>
    </main>
    <TaskSync />
    </AccountProvider>
  );
}
