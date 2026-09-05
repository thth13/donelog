import Link from "next/link";
import { ChartBar, Check } from "@phosphor-icons/react/dist/ssr";
import { AccountMenu } from "@/components/AccountMenu";

export function Header({ stats = false }: { stats?: boolean }) {
  return (
    <header className="header">
      <Link className="brand" href="/"><span><Check weight="bold" /></span>done</Link>
      <div className="header-actions">{!stats && <Link className="nav-link" href="/stats">
        <ChartBar weight="bold" /> Statistics
      </Link>}
      <AccountMenu /></div>
    </header>
  );
}
