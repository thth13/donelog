"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check } from "@phosphor-icons/react";
import { LoginDialog } from "@/components/LoginDialog";

export function Landing({ initialLoginOpen = false }: { initialLoginOpen?: boolean }) {
  const [loginOpen, setLoginOpen] = useState(initialLoginOpen);

  useEffect(() => { setLoginOpen(initialLoginOpen); }, [initialLoginOpen]);

  function closeLogin() {
    setLoginOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.get("mode") === "login") {
      url.searchParams.delete("mode");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  return <main className="landing-shell">
    <header className="landing-header"><div className="brand"><span><Check weight="bold" /></span>done</div><span>A journal of things done</span></header>
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-story">
        <p className="eyebrow">Give your day a little credit</p>
        <h1 id="landing-title">You did more<br />than you <span>think.</span></h1>
        <p className="landing-description">The small wins count, too. Write down what you finished and watch your everyday effort add up.</p>
        <button type="button" className="auth-primary landing-cta" aria-haspopup="dialog" onClick={() => setLoginOpen(true)}>Sign up or sign in<ArrowUpRight weight="bold" /></button>
        <div className="landing-entry" aria-label="Example journal entry"><Check weight="bold" /><div><span>Finally sent that proposal</span><small>One thing done. A little more progress.</small></div></div>
      </div>
    </section>
    <footer className="landing-footer">A small habit. A visible difference.</footer>
    {loginOpen && <LoginDialog onClose={closeLogin} />}
  </main>;
}
