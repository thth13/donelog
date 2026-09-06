"use client";

import { useEffect } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

const storageKey = "donelog-theme";

export function ThemeToggle() {
  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      let preference: string | null = null;
      try { preference = localStorage.getItem(storageKey); } catch { /* Storage may be unavailable. */ }
      document.documentElement.dataset.theme = preference === "light" || preference === "dark"
        ? preference : systemTheme.matches ? "dark" : "light";
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) syncTheme();
    };
    syncTheme();
    systemTheme.addEventListener("change", syncTheme);
    window.addEventListener("storage", onStorage);
    return () => {
      systemTheme.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggleTheme() {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(storageKey, theme); } catch { /* Switching still works without storage. */ }
  }

  return <button type="button" className="theme-toggle" onClick={toggleTheme}>
    <span className="theme-to-dark"><Moon size={18} aria-hidden="true" /><span className="sr-only">Switch to dark theme</span></span>
    <span className="theme-to-light"><Sun size={18} aria-hidden="true" /><span className="sr-only">Switch to light theme</span></span>
  </button>;
}
