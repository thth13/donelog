"use client";

import type { ProjectOption } from "@/lib/project-types";

export type QueuedTask = { _id: string; title: string; projectId?: string | null; project?: string; createdAt: string };
const PREFIX = "donelog:pending-task:";
export const QUEUE_EVENT = "donelog:queue-changed";
export const SYNC_EVENT = "donelog:task-synced";

export function pendingTasks(userId: string): QueuedTask[] {
  const prefix = `${PREFIX}${userId}:`;
  const tasks: QueuedTask[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    const task = JSON.parse(localStorage.getItem(key) || "null");
    if (!task || !/^[a-f0-9]{24}$/.test(task._id) || key !== prefix + task._id ||
        typeof task.title !== "string" || !task.title.trim() || task.title.length > 300 ||
        (task.projectId !== undefined && task.projectId !== null && (typeof task.projectId !== "string" || !/^[a-f0-9]{24}$/.test(task.projectId))) ||
        (task.project !== undefined && (typeof task.project !== "string" || task.project.length > 80)) ||
        typeof task.createdAt !== "string" || !Number.isFinite(Date.parse(task.createdAt))) {
      throw new Error("Invalid saved task");
    }
    tasks.push(task);
  }
  return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function enqueueTask(userId: string, title: string, project: ProjectOption | null = null) {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const task: QueuedTask = {
    _id: Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(""),
    title: title.trim(),
    projectId: project?._id || null,
    // Display snapshot for offline history; the server stores only projectId.
    project: project?.name || "",
    createdAt: new Date().toISOString()
  };
  // One key per task prevents different tabs from overwriting each other's queue.
  localStorage.setItem(`${PREFIX}${userId}:` + task._id, JSON.stringify(task));
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function acknowledgeTask(userId: string, task: QueuedTask) {
  localStorage.removeItem(`${PREFIX}${userId}:` + task._id);
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: task }));
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function isQueueKey(userId: string, key: string | null) {
  return key === null || key.startsWith(`${PREFIX}${userId}:`);
}

// Only the reserved owner can import the pre-account browser queue.
export function migrateLegacyQueue(userId: string) {
  const keys = Object.keys(localStorage).filter(key => /^donelog:pending-task:[a-f0-9]{24}$/.test(key));
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value === null) continue;
    const destination = `${PREFIX}${userId}:${key.slice(PREFIX.length)}`;
    if (localStorage.getItem(destination) === null) localStorage.setItem(destination, value);
    localStorage.removeItem(key);
  }
  if (keys.length) window.dispatchEvent(new Event(QUEUE_EVENT));
}
