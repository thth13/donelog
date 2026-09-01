"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, Check } from "@phosphor-icons/react";

export function TaskForm() {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || status === "saving") return;
    setStatus("saving");
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    if (response.ok) {
      setTitle(""); setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 2200);
    } else setStatus("error");
  }

  return (
    <form className={`task-form ${status === "saved" ? "is-celebrating" : ""}`} onSubmit={submit} autoComplete="off">
      {status === "saved" && (
        <div className="celebration" aria-hidden="true">
          <div className="success-burst"><Check weight="bold" /></div>
          <div className="confetti">
            {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
          </div>
        </div>
      )}
      <div className="input-wrap">
        <input id="task" name="completed-task" aria-label="Completed task" maxLength={300} autoFocus autoComplete="off" value={title} onChange={(e) => { setTitle(e.target.value); setStatus("idle"); }} />
        <button aria-label="Save" disabled={!title.trim() || status === "saving"}><ArrowUpRight weight="bold" /></button>
      </div>
      <span className="sr-only" aria-live="polite">{status === "saved" ? "Saved" : status === "error" ? "Could not save" : ""}</span>
    </form>
  );
}
