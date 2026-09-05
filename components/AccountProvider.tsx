"use client";

import { createContext, useContext, useEffect } from "react";
import type { Account } from "@/lib/auth";

const AccountContext = createContext<Account | null>(null);
export const AUTH_EVENT = "donelog:account-changed";
export const SESSION_EXPIRED_EVENT = "donelog:session-expired";

export function AccountProvider({ user, children }: { user: Account; children: React.ReactNode }) {
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === AUTH_EVENT) window.location.replace("/");
    };
    window.addEventListener("storage", changed);
    const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("pageshow", restored);
    };
  }, []);
  return <AccountContext.Provider value={user}>{children}</AccountContext.Provider>;
}

export function announceAccountChange() {
  try { localStorage.setItem(AUTH_EVENT, crypto.randomUUID()); } catch { /* Server checks still protect stale tabs. */ }
}

export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("AccountProvider is required");
  return account;
}

export async function accountFetch(userId: string, input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("x-donelog-user", userId);
  const response = await fetch(input, { ...init, headers, cache: "no-store" });
  if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  return response;
}
