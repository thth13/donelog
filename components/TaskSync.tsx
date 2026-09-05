"use client";

import { accountFetch, SESSION_EXPIRED_EVENT, useAccount } from "@/components/AccountProvider";

import { useEffect, useState } from "react";
import { acknowledgeTask, migrateLegacyQueue, isQueueKey, pendingTasks, QUEUE_EVENT } from "@/lib/task-queue";

export function TaskSync() {
  const { id: userId, login } = useAccount();
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
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
        if (login === "thth13") migrateLegacyQueue(userId);
        const tasks = pendingTasks(userId);
        setMessage(tasks.length ? "Saved on this device · waiting to sync" : "");
        for (const task of tasks) {
          if (stopped || !navigator.onLine) break;
          controller = new AbortController();
          const timeout = setTimeout(() => controller?.abort(), 15000);
          let response: Response;
          try {
            response = await accountFetch(userId, "/api/tasks", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(task), signal: controller.signal
            });
          } finally { clearTimeout(timeout); }
          if (!response.ok) {
            blocked = true;
            retry = response.status >= 500 || response.status === 408 || response.status === 429;
            setMessage(response.status === 401 ? "Session expired · sign in again to sync your saved tasks" : response.status === 409 ? "Sync conflict · reload and sign in to the original account" : "Tasks are kept on this device · could not sync");
            break;
          }
          acknowledgeTask(userId, await response.json());
        }
        if (!pendingTasks(userId).length) { setMessage(""); attempts = 0; }
      } catch {
        retry = true;
        if (!stopped) setMessage("Could not sync · local tasks will be retried when you return");
      } finally {
        running = false;
        if (!stopped && retry && navigator.onLine && attempts < 5) {
          timer = setTimeout(() => void sync(), Math.min(2000 * 2 ** attempts++, 60000));
        } else if (!stopped && !retry && !blocked && navigator.onLine) {
          // Pick up tasks submitted while an earlier request was in flight.
          try { if (pendingTasks(userId).length) timer = setTimeout(() => void sync(), 1000); } catch { /* Retain inaccessible storage. */ }
        }
      }
    }
    const wake = () => { attempts = 0; void sync(); };
    const visible = () => { if (document.visibilityState === "visible") wake(); };
    const storage = (event: StorageEvent) => { if (isQueueKey(userId, event.key)) wake(); };
    const sessionExpired = () => setExpired(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, sessionExpired);
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
      window.removeEventListener(SESSION_EXPIRED_EVENT, sessionExpired);
      window.removeEventListener("storage", storage);
      window.removeEventListener(QUEUE_EVENT, wake);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [userId, login]);

  return <div className="sync-notice" role="status">{expired ? <>Session expired. Your pending entries are kept on this device. <a href="/?mode=login">Sign in again</a></> : message && <>{message} <button type="button" onClick={() => window.dispatchEvent(new Event(QUEUE_EVENT))}>Retry</button></>}</div>;
}
