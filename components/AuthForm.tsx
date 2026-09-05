"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { announceAccountChange } from "@/components/AccountProvider";
import { validLogin } from "@/lib/account-input";

export function AuthForm({ mode, onBusyChange }: { mode: "register" | "login"; onBusyChange?: (busy: boolean) => void }) {
  const Heading = mode === "register" ? "h1" : "h2";
  const [login, setLogin] = useState("");
  const [secret, setSecret] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const lock = useRef(false);
  const registrationId = useRef("");
  const field = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { if (createdKey) heading.current?.focus(); }, [createdKey]);

  useEffect(() => {
    if (!createdKey || saved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [createdKey, saved]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    setError("");
    if (createdKey && !saved) { setError("Save your secret key before continuing."); return; }
    if (!createdKey && (mode === "register" ? !validLogin(login) : !secret.trim())) {
      setError(mode === "register" ? "Use 2–40 letters, numbers, spaces, dots, hyphens or underscores." : "Enter your secret key.");
      field.current?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const registering = mode === "register" && !createdKey;
      if (registering && !registrationId.current) {
        registrationId.current = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
      }
      const response = await fetch(`/api/auth/${registering ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registering ? { login, requestId: registrationId.current } : { secret: createdKey || secret }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not continue. Please try again.");
      if (registering) {
        setCreatedKey(data.secret);
        setLogin(data.login);
      } else {
        announceAccountChange();
        window.location.replace("/");
      }
    } catch (error) {
      setError(error instanceof Error && error.name === "Error" ? error.message : "Could not connect. Check your connection and try again.");
    } finally { lock.current = false; setBusy(false); }
  }

  async function copyKey() {
    try { await navigator.clipboard.writeText(createdKey); setCopyStatus("Copied. Keep it somewhere safe."); }
    catch { setCopyStatus("Could not copy. Select the key and copy it manually."); }
  }

  return (
      <div className="auth-content">
        <Heading ref={heading} id="auth-title" tabIndex={-1}>{createdKey ? "Save your secret key." : mode === "register" ? "Create your account." : "Welcome back."}</Heading>
        <p id="auth-description" className="auth-description">{createdKey ? `Your account is ${login}. This is your key to sign in. Save it somewhere safe — you will need it to access your account again.` : mode === "register" ? "Choose your username. Next, you’ll receive your personal sign-in key." : "Paste your secret key to open your journal."}</p>
        <form onSubmit={submit} noValidate aria-busy={busy}>
          {mode === "register" && !createdKey ? <>
            <label htmlFor="account-login">Username</label>
            <input ref={field} autoFocus id="account-login" name="username" autoComplete="username" maxLength={40} value={login} disabled={busy} aria-invalid={!!error} aria-describedby="auth-error" placeholder="e.g. alex" onChange={event => { setLogin(event.target.value); setError(""); }} />
          </> : <>
            <label htmlFor="account-key">Secret key</label>
            <div className="secret-field"><input ref={field} autoFocus={!createdKey} id="account-key" name="password" type={createdKey ? "text" : "password"} autoComplete={createdKey ? "off" : "current-password"} spellCheck={false} autoCapitalize="none" value={createdKey || secret} readOnly={!!createdKey} disabled={busy} aria-invalid={!!error} aria-describedby="auth-error" onChange={event => { setSecret(event.target.value); setError(""); }} /></div>
          </>}
          {createdKey && <div className="key-save"><button type="button" className="auth-secondary" onClick={() => void copyKey()}>Copy secret key</button><p role="status">{copyStatus}</p><label className="key-checkbox"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} />I saved my key somewhere safe</label></div>}
          <p id="auth-error" className="auth-error" role="alert">{error}</p>
          <button className="auth-primary" type="submit" disabled={busy || (!!createdKey && !saved)}>{busy ? "Please wait…" : createdKey ? "Open my journal" : mode === "register" ? "Continue" : "Sign in"}<ArrowUpRight weight="bold" /></button>
        </form>
        {!createdKey && <p className="auth-switch">{mode === "register" ? "Already have an account?" : "Don’t have an account?"} {busy ? <span>{mode === "register" ? "Sign in" : "Register"}</span> : <Link href={mode === "register" ? "/?mode=login" : "/register"}>{mode === "register" ? "Sign in" : "Register"}</Link>}</p>}
      </div>
  );
}
