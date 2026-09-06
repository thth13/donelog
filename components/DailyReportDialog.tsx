"use client";

import { projectStyle } from "@/lib/project-style";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, EnvelopeSimple, ShareNetwork, WhatsappLogo, X } from "@phosphor-icons/react";

type ReportTask = { _id: string; title: string; project?: string; createdAt: string };
const timeLabel = (value: string) => new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export function DailyReportDialog({ date, tasks, incomplete, onClose }: {
  date: string;
  tasks: ReportTask[];
  incomplete: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shareLock = useRef(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const day = new Date(`${date}T12:00:00`);
  const dateLabel = day.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const entries = [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const countLabel = `${entries.length.toLocaleString("en-US")} ${entries.length === 1 ? "task" : "tasks"} completed`;
  const title = `Daily report · ${dateLabel}`;
  const text = ["done — Daily report", dateLabel, "", countLabel,
    ...(incomplete ? ["Partial report: some entries could not be loaded."] : []), "",
    ...(entries.length ? entries.map(task => `✓ ${task.title}${task.project ? ` [${task.project}]` : ""} (${timeLabel(task.createdAt)})`) : ["No completed tasks for this day."])].join("\n");
  const encodedText = encodeURIComponent(text);
  // Keep long reports intact: clipboard/native sharing avoid deep-link length limits.
  const linkShareAvailable = encodedText.length < 6000;

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    setCanShare(typeof navigator.share === "function");
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  async function share(method: "copy" | "native") {
    if (shareLock.current) return;
    shareLock.current = true;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      if (method === "copy") {
        await navigator.clipboard.writeText(text);
        setNotice("Report copied. Paste it into any conversation.");
      } else {
        await navigator.share({ title, text });
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError(method === "copy" ? "Could not copy the report. Select and copy the report below." : "Could not open sharing. Try copying the report instead.");
      }
    } finally {
      shareLock.current = false;
      setBusy(false);
    }
  }

  return <dialog ref={dialogRef} className="archive-dialog daily-report-dialog" aria-labelledby="daily-report-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="daily-report-toolbar">
      <h2 id="daily-report-title">Daily report</h2>
      <button type="button" className="daily-report-close" autoFocus aria-label="Close daily report" onClick={onClose}><X size={20} /></button>
    </header>
    <article className="daily-report-paper" aria-label={`Report for ${dateLabel}`}>
      <div className="daily-report-brand"><span><Check weight="bold" size={15} /></span>done<span className="daily-report-weekday">{day.toLocaleDateString("en-US", { weekday: "long" })}</span></div>
      <div className="daily-report-intro"><h3>{dateLabel}</h3></div>
      <div className="daily-report-total"><strong>{entries.length.toLocaleString("en-US")}</strong><span>{entries.length === 1 ? "task" : "tasks"}<br />completed</span><Check size={28} weight="bold" aria-hidden="true" /></div>
      {incomplete && <p className="daily-report-warning">Partial report: some entries could not be loaded.</p>}
      {entries.length ? <ol className="daily-report-entries">{entries.map(task => <li key={task._id}><Check size={16} weight="bold" aria-hidden="true" /><span>{task.title}{task.project && <span className="project-chip" style={projectStyle(task.project)}>{task.project}</span>}</span><time dateTime={task.createdAt}>{timeLabel(task.createdAt)}</time></li>)}</ol> : <p className="daily-report-empty">No completed tasks for this day. Your next small win starts with one entry.</p>}
    </article>
    <div className="daily-report-sharing">
      <button type="button" className="daily-report-share" aria-expanded={shareOpen} aria-controls="daily-report-share-options" onClick={() => setShareOpen(value => !value)}><ShareNetwork size={18} />Share report</button>
      <div id="daily-report-share-options" hidden={!shareOpen}>
        <p>Share this day’s tasks as a text report.</p>
        <div className="daily-report-share-options">
          <button type="button" disabled={busy} onClick={() => void share("copy")}><Copy size={18} />Copy text</button>
          {linkShareAvailable && <>
            <a href={`https://wa.me/?text=${encodedText}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={18} />WhatsApp</a>
            <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`}><EnvelopeSimple size={18} />Email</a>
          </>}
          {canShare && <button type="button" disabled={busy} onClick={() => void share("native")}><ShareNetwork size={18} />More apps</button>}
        </div>
        {!linkShareAvailable && <p>This report is long. Copy the full text to share it in your app.</p>}
        <p className="daily-report-feedback" role="status" aria-busy={busy}>{busy ? "Preparing report…" : notice}</p>
        {error && <><p className="archive-error" role="alert">{error}</p><label className="sr-only" htmlFor="daily-report-copy">Report text</label><textarea id="daily-report-copy" className="daily-report-copy" readOnly value={text} onFocus={event => event.currentTarget.select()} /></>}
      </div>
    </div>
  </dialog>;
}
