"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarBlank, TrendUp } from "@phosphor-icons/react";

import { pendingTasks, QUEUE_EVENT, SYNC_EVENT, isQueueKey } from "@/lib/task-queue";

type Task = { _id: string; title: string; createdAt: string };
type Range = "days" | "weeks" | "months";

const dateKey = (value: string | Date) => new Date(value).toLocaleDateString("sv-SE");

export function StatsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [range, setRange] = useState<Range>("days");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const confirmed = new Map<string, Task>();
    const refresh = () => {
      if (!active) return;
      let local: Task[] = [];
      try { local = pendingTasks(); } catch { /* TaskSync displays storage errors. */ }
      const merged = new Map(confirmed);
      local.forEach(task => { if (!merged.has(task._id)) merged.set(task._id, task); });
      setTasks([...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    const synced = (event: Event) => {
      const task = (event as CustomEvent<Task>).detail;
      confirmed.set(task._id, task);
      refresh();
    };
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/tasks", { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (active && Array.isArray(data)) {
          data.forEach((task: Task) => confirmed.set(task._id, task));
          refresh();
        }
      } catch { /* Keep locally queued tasks visible while offline. */ }
      finally { if (active) setLoading(false); }
    };
    const storage = (event: StorageEvent) => { if (isQueueKey(event.key)) { refresh(); void load(); } };
    window.addEventListener(QUEUE_EVENT, refresh);
    window.addEventListener(SYNC_EVENT, synced);
    window.addEventListener("storage", storage);
    refresh();
    try { if (pendingTasks().length) setLoading(false); } catch { /* See TaskSync. */ }
    void load();
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener(QUEUE_EVENT, refresh);
      window.removeEventListener(SYNC_EVENT, synced);
      window.removeEventListener("storage", storage);
    };
  }, []);

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
      <section className="stats-heading"><div><div className="eyebrow">Your progress</div><h1>Statistics</h1><p>Everything you have done, all in one clear view.</p></div><div className="summary"><span>This month</span><strong>{thisMonth}</strong><small><TrendUp weight="bold" /> completed tasks</small></div></section>
      <section className="chart-card">
        <div className="chart-top"><div><h2>Work rhythm</h2><p>Number of completed tasks</p></div><div className="tabs">{(["days", "weeks", "months"] as Range[]).map(item => <button className={range === item ? "active" : ""} onClick={() => setRange(item)} key={item}>{item === "days" ? "Days" : item === "weeks" ? "Weeks" : "Months"}</button>)}</div></div>
        <div className="chart-area">{loading ? <div className="loading">Loading data…</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e7e4dc" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#77756e", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#a09d94", fontSize: 11 }} /><Tooltip cursor={{ fill: "#f0eee7" }} contentStyle={{ border: 0, borderRadius: 12, boxShadow: "0 10px 30px #1b201820" }} formatter={(value) => [value, "Tasks"]} /><Bar dataKey="count" fill="#344c3d" radius={[6, 6, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer>}</div>
      </section>
      <section className="history"><div className="history-title"><div><h2>History</h2><p>Your completed tasks by day</p></div><CalendarBlank size={24} /></div>{!loading && groups.length === 0 ? <div className="empty">Your first entries will appear here.</div> : groups.map(([date, items]) => <div className="day-group" key={date}><div className="day-date"><strong>{new Date(date).toLocaleDateString("en-US", { day: "2-digit" })}</strong><span>{new Date(date).toLocaleDateString("en-US", { month: "long", weekday: "short" })}</span></div><ul>{items.map(task => <li key={task._id}><i /> <span>{task.title}</span><time>{new Date(task.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</time></li>)}</ul></div>)}</section>
    </>
  );
}
