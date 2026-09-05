"use client";

import { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { CaretLeft, CaretRight, CalendarBlank, Clock } from "@phosphor-icons/react";
import { acknowledgeTask, pendingTasks } from "@/lib/task-queue";

type Task = { _id: string; title: string; createdAt: string; updatedAt?: string; archivedAt?: string | null };

function localDateTime(value: string) {
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditTaskDialog({ task, onClose, onSaved }: { task: Task; onClose: () => void; onSaved: (task: Task) => void }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(localDateTime(task.createdAt));
  const [hours, setHours] = useState(localDateTime(task.createdAt).slice(11, 13));
  const [minutes, setMinutes] = useState(localDateTime(task.createdAt).slice(14, 16));
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<"title" | "date" | "hours" | "minutes" | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
      else document.querySelector<HTMLElement>(".history-title h2")?.focus();
    };
  }, []);

  async function save() {
    if (lock.current) return;
    setInvalid(null);
    setError("");
    if (!title.trim() || title.trim().length > 300) {
      setInvalid("title"); setError("Enter a task title of up to 300 characters."); titleRef.current?.focus(); return;
    }
    if (!/^\d{1,2}$/.test(hours) || Number(hours) > 23) {
      setInvalid("hours"); setError("Enter hours from 00 to 23."); hoursRef.current?.focus(); return;
    }
    if (!/^\d{1,2}$/.test(minutes) || Number(minutes) > 59) {
      setInvalid("minutes"); setError("Enter minutes from 00 to 59."); minutesRef.current?.focus(); return;
    }
    const completedAt = `${date.slice(0, 10)}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    if (!completedAt || !Number.isFinite(new Date(completedAt).getTime()) || localDateTime(new Date(completedAt).toISOString()) !== completedAt) {
      setInvalid("date"); setError("Enter a valid date and time."); dateButtonRef.current?.focus(); return;
    }
    lock.current = true;
    setSaving(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      if (pendingTasks().some(entry => entry._id === task._id)) {
        const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task), signal: controller.signal });
        if (!response.ok) throw new Error("Could not sync this task. Please try again.");
        acknowledgeTask(await response.json());
      }
      const response = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), createdAt: completedAt === localDateTime(task.createdAt) ? task.createdAt : new Date(completedAt).toISOString() }),
        signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save changes. Please try again.");
      onSaved(result);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "Could not confirm saving. Please try again.");
    } finally {
      clearTimeout(timeout);
      lock.current = false;
      setSaving(false);
    }
  }

  return <dialog ref={dialogRef} className="archive-dialog edit-dialog" aria-labelledby="edit-title" onCancel={event => { event.preventDefault(); if (calendarOpen) { setCalendarOpen(false); dateButtonRef.current?.focus(); } else if (!lock.current) onClose(); }}>
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <h2 id="edit-title">Edit task</h2>
      <label htmlFor="task-title">Task</label>
      <input ref={titleRef} id="task-title" autoFocus value={title} maxLength={300} disabled={saving} aria-invalid={invalid === "title"} aria-describedby={invalid === "title" ? "edit-error" : undefined} onChange={event => { setTitle(event.target.value); setInvalid(null); setError(""); }} />
      <div id="task-date-label" className="date-field-label">Date and time</div>
      <div className="task-datetime-row">
        <button ref={dateButtonRef} type="button" className="task-date-trigger" disabled={saving} aria-expanded={calendarOpen} aria-controls="task-calendar" onClick={() => setCalendarOpen(open => !open)}>
          <CalendarBlank size={15} aria-hidden="true" />
          {new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
        </button>
      <fieldset className="task-time-fields" disabled={saving} aria-describedby="edit-timezone">
        <legend className="sr-only">Time</legend>
        <div className="task-time-inputs"><Clock size={14} aria-hidden="true" />
          <div><label className="sr-only" htmlFor="task-hours">Hours</label><input ref={hoursRef} id="task-hours" type="text" inputMode="numeric" maxLength={2} placeholder="HH" value={hours} aria-invalid={invalid === "hours"} aria-describedby={invalid === "hours" ? "edit-error" : undefined} onFocus={event => event.target.select()} onChange={event => { if (/^\d{0,2}$/.test(event.target.value)) { setHours(event.target.value); setInvalid(null); setError(""); } }} onBlur={() => { if (hours) setHours(hours.padStart(2, "0")); }} /></div>
          <span className="time-separator" aria-hidden="true">:</span>
          <div><label className="sr-only" htmlFor="task-minutes">Minutes</label><input ref={minutesRef} id="task-minutes" type="text" inputMode="numeric" maxLength={2} placeholder="MM" value={minutes} aria-invalid={invalid === "minutes"} aria-describedby={invalid === "minutes" ? "edit-error" : undefined} onFocus={event => event.target.select()} onChange={event => { if (/^\d{0,2}$/.test(event.target.value)) { setMinutes(event.target.value); setInvalid(null); setError(""); } }} onBlur={() => { if (minutes) setMinutes(minutes.padStart(2, "0")); }} /></div>
        </div>
      </fieldset>
      </div>
      <div id="task-calendar" hidden={!calendarOpen}>
        {calendarOpen && <div className="datetime-picker" ref={dateRef} tabIndex={-1} role="group" aria-labelledby="task-date-label" aria-describedby={invalid === "date" ? "edit-timezone edit-error" : "edit-timezone"}>
        <fieldset disabled={saving} className="datetime-calendar" aria-label="Choose completion date">
          <DatePicker
            inline
            selected={new Date(date)}
            onChange={value => { if (value && !lock.current) { setDate(localDateTime(value.toISOString())); setInvalid(null); setError(""); } }}
            onSelect={() => { setCalendarOpen(false); dateButtonRef.current?.focus(); }}
            calendarStartDay={1}
            fixedHeight
            disabled={saving}
            calendarClassName="done-datepicker"
            renderCustomHeader={({ date: month, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => <div className="datepicker-heading">
              <button type="button" aria-label="Previous month" disabled={saving || prevMonthButtonDisabled} onClick={decreaseMonth}><CaretLeft size={15} weight="bold" /></button>
              <span aria-live="polite">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              <button type="button" aria-label="Next month" disabled={saving || nextMonthButtonDisabled} onClick={increaseMonth}><CaretRight size={15} weight="bold" /></button>
            </div>}
          />
        </fieldset>
        </div>}
      </div>
      <p id="edit-timezone">Your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
      {error && <p id="edit-error" className="archive-error" role="alert">{error}</p>}
      <div className="archive-dialog-actions">
        <button type="button" disabled={saving} onClick={onClose}>Cancel</button>
        <button type="submit" className="archive-confirm" disabled={saving} aria-busy={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  </dialog>;
}
