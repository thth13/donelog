import Link from "next/link";
import { ChartBar, Check } from "@phosphor-icons/react/dist/ssr";

export function Header({ stats = false }: { stats?: boolean }) {
  return (
    <header className="header">
      <Link className="brand" href="/"><span><Check weight="bold" /></span>done</Link>
      <Link className="nav-link" href={stats ? "/" : "/stats"}>
        {stats ? "Add entry" : <><ChartBar weight="bold" /> Statistics</>}
      </Link>
    </header>
  );
}
