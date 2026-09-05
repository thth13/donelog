"use client";

import { accountFetch, useAccount } from "@/components/AccountProvider";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarBlank, TrendUp, X, PencilSimple } from "@phosphor-icons/react";

import { EditTaskDialog } from "@/components/EditTaskDialog";

import { acknowledgeTask, pendingTasks, QUEUE_EVENT, SYNC_EVENT, isQueueKey } from "@/lib/task-queue";

type Task = { _id: string; title: string; createdAt: string; updatedAt?: string; archivedAt?: string | null };
type Range = "days" | "weeks" | "months";

const dateKey = (value: string | Date) => new Date(value).toLocaleDateString("sv-SE");

export function StatsDashboard() {
  const { id: userId } = useAccount();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [range, setRange] = useState<Range>("days");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const editedTasks = useRef(new Map<string, Task>());
  const [archiveTarget, setArchiveTarget] = useState<Task | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiveNotice, setArchiveNotice] = useState("");
  const archivedIds = useRef(new Set<string>());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLHeadingElement>(null);
  const archiveLock = useRef(false);

  useEffect(() => {
    if (!archiveTarget) return;
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
      else historyRef.current?.focus();
    };
  }, [archiveTarget]);

  async function archiveTask() {
    if (!archiveTarget || archiveLock.current) return;
    archiveLock.current = true;
    setArchiving(true);
    setArchiveError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      // Persist queued entries before archiving so their contents stay in the database.
      if (pendingTasks(userId).some(task => task._id === archiveTarget._id)) {
        const saved = await accountFetch(userId, "/api/tasks", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(archiveTarget), signal: controller.signal
        });
        if (!saved.ok) throw new Error("Could not delete this task. Please try again.");
      }
      const response = await accountFetch(userId, `/api/tasks/${archiveTarget._id}/archive`, {
        method: "PATCH", signal: controller.signal
      });
      if (!response.ok) throw new Error("Could not delete this task. Please try again.");
      const archived: Task = await response.json();
      archivedIds.current.add(archived._id);
      setTasks(current => current.filter(task => task._id !== archived._id));
      try { acknowledgeTask(userId, archived); } catch { /* The server has already retained the archived task. */ }
      setArchiveNotice("Task deleted.");
      setArchiveTarget(null);
    } catch (error) {
      setArchiveError(error instanceof Error && error.name !== "AbortError"
        ? error.message : "Could not confirm deletion. Please try again.");
    } finally {
      clearTimeout(timeout);
      archiveLock.current = false;
      setArchiving(false);
    }
  }

  useEffect(() => {
    let active = true;
    const confirmed = new Map<string, Task>();
    const refresh = () => {
      if (!active) return;
      let local: Task[] = [];
      try { local = pendingTasks(userId); } catch { /* TaskSync displays storage errors. */ }
      const merged = new Map(confirmed);
      editedTasks.current.forEach((task, id) => {
        const current = merged.get(id);
        if (!current?.updatedAt || !task.updatedAt || current.updatedAt <= task.updatedAt) merged.set(id, task);
      });
      local.forEach(task => { if (!merged.has(task._id)) merged.set(task._id, task); });
      setTasks([...merged.values()].filter(task => !task.archivedAt && !archivedIds.current.has(task._id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    const synced = (event: Event) => {
      const task = (event as CustomEvent<Task>).detail;
      if (task.archivedAt) archivedIds.current.add(task._id);
      confirmed.set(task._id, task);
      refresh();
    };
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await accountFetch(userId, "/api/tasks", { signal: controller.signal });
        if (!response.ok) {
          const data = await response.json();
          if (active) setLoadError(data.error || "Could not load your history. Please try again.");
          return;
        }
        const data = await response.json();
        if (active && Array.isArray(data)) {
          setLoadError("");
          data.forEach((task: Task) => confirmed.set(task._id, task));
          refresh();
        }
      } catch { if (active) setLoadError("Could not load your history. Local entries are still available. Check your connection and retry."); }
      finally { if (active) setLoading(false); }
    };
    const storage = (event: StorageEvent) => { if (isQueueKey(userId, event.key)) { refresh(); void load(); } };
    window.addEventListener(QUEUE_EVENT, refresh);
    window.addEventListener(SYNC_EVENT, synced);
    window.addEventListener("storage", storage);
    refresh();
    try { if (pendingTasks(userId).length) setLoading(false); } catch { /* See TaskSync. */ }
    void load();
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener(QUEUE_EVENT, refresh);
      window.removeEventListener(SYNC_EVENT, synced);
      window.removeEventListener("storage", storage);
    };
  }, [userId, loadAttempt]);

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    const today = new Date();
    if (range === "days") {
      for (let i = 13; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); map.set(dateKey(d), 0); }
      tasks.forEach(t => { const key = dateKey(t.createdAt); if (map.has(key)) map.set(key, (map.get(key) || 0) + 1); });
      return [...map].map(([key, count]) => ({ label: new Date(key).toLocaleDateString("en-US", { day: "numeric", month: "short" }), count }));
    }
    const periods = range === "weeks" ? 12 : 12;
    for (let i = periods - 1; i >= 0; i--) {
      const d = new Date(today);
      if (range === "months") d.setMonth(d.getMonth() - i, 1);
      else { d.setDate(d.getDate() - i * 7); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); }
      map.set(dateKey(d), 0);
    }
    tasks.forEach(t => {
      const d = new Date(t.createdAt);
      if (range === "months") d.setDate(1);
      else { const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); }
      const key = dateKey(d); if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map].map(([key, count]) => ({ label: range === "months" ? new Date(key).toLocaleDateString("en-US", { month: "short" }) : new Date(key).toLocaleDateString("en-US", { day: "numeric", month: "short" }), count }));
  }, [tasks, range]);

  const groups = useMemo(() => Object.entries(tasks.reduce<Record<string, Task[]>>((acc, task) => { const key = dateKey(task.createdAt); (acc[key] ??= []).push(task); return acc; }, {})), [tasks]);
  const thisMonth = tasks.filter(t => { const d = new Date(t.createdAt), n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length;

  return (
    <>
      {loadError && <p className="history-load-error" role="alert">{loadError} <button type="button" onClick={() => setLoadAttempt(value => value + 1)}>Retry</button></p>}
      <section className="stats-heading"><div><div className="eyebrow">Your progress</div><h1>Statistics</h1><p>Everything you have done, all in one clear view.</p></div><div className="summary"><span>This month</span><strong>{thisMonth}</strong><small><TrendUp weight="bold" /> completed tasks</small></div></section>
      <section className="chart-card">
        <div className="chart-top"><div><h2>Work rhythm</h2><p>Number of completed tasks</p></div><div className="tabs">{(["days", "weeks", "months"] as Range[]).map(item => <button className={range === item ? "active" : ""} onClick={() => setRange(item)} key={item}>{item === "days" ? "Days" : item === "weeks" ? "Weeks" : "Months"}</button>)}</div></div>
        <div className="chart-area">{loading ? <div className="loading">Loading data…</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e7e4dc" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#77756e", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#a09d94", fontSize: 11 }} /><Tooltip cursor={{ fill: "#f0eee7" }} contentStyle={{ border: 0, borderRadius: 12, boxShadow: "0 10px 30px #1b201820" }} formatter={(value) => [value, "Tasks"]} /><Bar dataKey="count" fill="#344c3d" radius={[6, 6, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer>}</div>
      </section>
      <section className="history"><div className="history-title"><div><h2 ref={historyRef} tabIndex={-1}>History</h2><p>Your completed tasks by day</p></div><CalendarBlank size={24} /></div>{!loading && groups.length === 0 ? <div className="empty">Your first entries will appear here.</div> : groups.map(([date, items]) => <div className="day-group" key={date}><div className="day-date"><strong>{new Date(date).toLocaleDateString("en-US", { day: "2-digit" })}</strong><span>{new Date(date).toLocaleDateString("en-US", { month: "long", weekday: "short" })}</span></div><ul>{items.map(task => <li key={task._id}><div className="task-marker"><i /><button type="button" className="archive-task" aria-label={`Delete task: ${task.title}`} title="Delete task" onClick={() => { setArchiveError(""); setArchiveNotice(""); setArchiveTarget(task); }}><X size={13} weight="bold" /></button></div><span className="task-title-content"><span>{task.title}</span><button type="button" className="edit-task" aria-label={`Edit task: ${task.title}`} title="Edit task" onClick={() => { setArchiveNotice(""); setEditTarget(task); }}><PencilSimple size={14} /></button></span><time>{new Date(task.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</time></li>)}</ul></div>)}</section>
      {editTarget && <EditTaskDialog key={editTarget._id} task={editTarget} onClose={() => setEditTarget(null)} onSaved={task => {
        editedTasks.current.set(task._id, task);
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: task }));
        setArchiveNotice("Task updated.");
      }} />}
      <p className="sr-only" role="status">{archiveNotice}</p>
      {archiveTarget && <dialog ref={dialogRef} className="archive-dialog" aria-labelledby="archive-title" aria-describedby="archive-description" onCancel={event => { event.preventDefault(); if (!archiveLock.current) setArchiveTarget(null); }}>
        <h2 id="archive-title">Delete task?</h2>
        <p className="archive-task-title">{archiveTarget.title}</p>
        <p id="archive-description">This task will be removed from your history and statistics.</p>
        {archiveError && <p className="archive-error" role="alert">{archiveError}</p>}
        <div className="archive-dialog-actions">
          <button type="button" autoFocus disabled={archiving} onClick={() => setArchiveTarget(null)}>Cancel</button>
          <button type="button" className="archive-confirm" disabled={archiving} aria-busy={archiving} onClick={() => void archiveTask()}>{archiving ? "Deleting…" : "Delete task"}</button>
        </div>
      </dialog>}
    </>
  );
}
