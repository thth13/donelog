"use client";

import { useEffect, useState } from "react";
import { acknowledgeTask, isQueueKey, pendingTasks, QUEUE_EVENT } from "@/lib/task-queue";

export function TaskSync() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let stopped = false;
    let running = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    async function sync() {
      if (stopped || running) return;
      clearTimeout(timer);
      running = true;
      let retry = false;
      let blocked = false;
      try {
        const tasks = pendingTasks();
        setMessage(tasks.length ? "Saved on this device · waiting to sync" : "");
        for (const task of tasks) {
          if (stopped || !navigator.onLine) break;
          controller = new AbortController();
          const timeout = setTimeout(() => controller?.abort(), 15000);
          let response: Response;
          try {
            response = await fetch("/api/tasks", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(task), signal: controller.signal
            });
          } finally { clearTimeout(timeout); }
          if (!response.ok) {
            blocked = true;
            retry = response.status >= 500 || response.status === 408 || response.status === 429;
            setMessage("Tasks are kept on this device · could not sync");
            break;
          }
          acknowledgeTask(task);
        }
        if (!pendingTasks().length) { setMessage(""); attempts = 0; }
      } catch {
        retry = true;
        if (!stopped) setMessage("Could not sync · local tasks will be retried when you return");
      } finally {
        running = false;
        if (!stopped && retry && navigator.onLine && attempts < 5) {
          timer = setTimeout(() => void sync(), Math.min(2000 * 2 ** attempts++, 60000));
        } else if (!stopped && !retry && !blocked && navigator.onLine) {
          // Pick up tasks submitted while an earlier request was in flight.
          try { if (pendingTasks().length) timer = setTimeout(() => void sync(), 1000); } catch { /* Retain inaccessible storage. */ }
        }
      }
    }
    const wake = () => { attempts = 0; void sync(); };
    const visible = () => { if (document.visibilityState === "visible") wake(); };
    const storage = (event: StorageEvent) => { if (isQueueKey(event.key)) wake(); };
    window.addEventListener("online", wake);
    window.addEventListener("storage", storage);
    window.addEventListener(QUEUE_EVENT, wake);
    document.addEventListener("visibilitychange", visible);
    wake();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      window.removeEventListener("online", wake);
      window.removeEventListener("storage", storage);
      window.removeEventListener(QUEUE_EVENT, wake);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  return <div className="sync-notice" role="status">{message && <>{message} <button type="button" onClick={() => window.dispatchEvent(new Event(QUEUE_EVENT))}>Retry</button></>}</div>;
}
