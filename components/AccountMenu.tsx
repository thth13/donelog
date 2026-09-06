"use client";

import { useEffect, useState } from "react";
import { accountFetch, announceAccountChange, useAccount } from "@/components/AccountProvider";

export function AccountMenu() {
  const user = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState("");
  const [loadingKey, setLoadingKey] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setLoadingKey(true);
    setPreview("");
    async function loadPreview() {
      try {
        const response = await accountFetch(user.id, "/api/auth/key?preview=1", { method: "POST", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load your key. Click to retry.");
        if (active) setPreview(data.preview);
      } catch (error) {
        if (active) setError(error instanceof Error && error.name === "Error" ? error.message : "Could not load your key. Click to retry.");
      } finally {
        clearTimeout(timeout);
        if (active) setLoadingKey(false);
      }
    }
    void loadPreview();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [user.id]);

  async function copyKey() {
    if (busy) return;
    setBusy(true);
    setError("");
    setCopied(false);
    let requestError = "";
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable. Open the site over HTTPS to copy your key.");
      const loadKey = async () => {
        const response = await accountFetch(user.id, "/api/auth/key", { method: "POST", signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        if (!response.ok) {
          requestError = data.error || "Could not load your key. Please try again.";
          throw new Error(requestError);
        }
        setPreview(data.preview);
        return data.secret as string;
      };
      // Start clipboard access inside the click gesture, including in Safari.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": loadKey().then(secret => new Blob([secret], { type: "text/plain" })) })]);
      } else {
        await navigator.clipboard.writeText(await loadKey());
      }
      setCopied(true);
    } catch (error) {
      setError(requestError || (error instanceof Error && error.name === "Error" ? error.message : "Could not copy your key. Allow clipboard access and try again."));
    } finally { setBusy(false); }
  }
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      announceAccountChange();
      window.location.replace("/");
    } catch { setError("Could not sign out. Try again."); setBusy(false); }
  }
  return <div className="account-menu"><button type="button" className="account-key" title="Copy authorization key" aria-label={preview ? `Copy authorization key ${preview}` : "Load and copy authorization key"} disabled={busy || loadingKey} aria-busy={busy || loadingKey} onClick={() => void copyKey()}>{preview || (loadingKey ? "Loading key…" : "Key unavailable")}</button><button type="button" disabled={busy} aria-busy={busy} onClick={() => void signOut()}>Sign out</button><span className="account-error" role="alert">{error}</span><span className="account-copy-status" role="status">{copied ? "Key copied" : ""}</span></div>;
}
