"use client";

export type QueuedTask = { _id: string; title: string; createdAt: string };
const PREFIX = "donelog:pending-task:";
export const QUEUE_EVENT = "donelog:queue-changed";
export const SYNC_EVENT = "donelog:task-synced";

export function pendingTasks(): QueuedTask[] {
  const tasks: QueuedTask[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const task = JSON.parse(localStorage.getItem(key) || "null");
    if (!task || !/^[a-f0-9]{24}$/.test(task._id) || key !== PREFIX + task._id ||
        typeof task.title !== "string" || !task.title.trim() || task.title.length > 300 ||
        typeof task.createdAt !== "string" || !Number.isFinite(Date.parse(task.createdAt))) {
      throw new Error("Invalid saved task");
    }
    tasks.push(task);
  }
  return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function enqueueTask(title: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const task: QueuedTask = {
    _id: Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(""),
    title: title.trim(),
    createdAt: new Date().toISOString()
  };
  // One key per task prevents different tabs from overwriting each other's queue.
  localStorage.setItem(PREFIX + task._id, JSON.stringify(task));
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function acknowledgeTask(task: QueuedTask) {
  localStorage.removeItem(PREFIX + task._id);
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: task }));
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function isQueueKey(key: string | null) {
  return key === null || key.startsWith(PREFIX);
}
