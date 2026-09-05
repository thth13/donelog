"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { AuthForm } from "@/components/AuthForm";

export function LoginDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  return <dialog ref={dialogRef} className="auth-card auth-dialog" aria-labelledby="auth-title" aria-describedby="auth-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <button type="button" className="auth-close" aria-label="Close sign in" disabled={busy} onClick={onClose}><X size={20} /></button>
    <AuthForm mode="login" onBusyChange={setBusy} />
  </dialog>;
}
