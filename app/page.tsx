import Link from "next/link";
import { ChartBar, Check } from "@phosphor-icons/react/dist/ssr";
import { TaskForm } from "@/components/TaskForm";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="minimal-home">
        <div className="center-brand"><span><Check weight="bold" /></span>done</div>
        <TaskForm />
        <div className="minimal-meta">
          <time>{new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</time>
          <Link href="/stats"><ChartBar weight="bold" /> Statistics</Link>
        </div>
      </section>
    </main>
  );
}
