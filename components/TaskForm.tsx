"use client";

import { useAccount } from "@/components/AccountProvider";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check } from "@phosphor-icons/react";

import type { ProjectOption } from "@/lib/project-types";
import { ProjectTaskInput } from "@/components/ProjectTaskInput";

import { enqueueTask } from "@/lib/task-queue";

export function TaskForm() {
  const { id: userId } = useAccount();
  const [title, setTitle] = useState("");
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const [celebration, setCelebration] = useState(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.current?.value.trim() || "";
    if (!value) return;
    try {
      enqueueTask(userId, value, project);
    } catch {
      setStatus("error");
      return;
    }
    clearTimeout(timer.current);
    if (input.current) input.current.value = "";
    setTitle("");
    setStatus("saved");
    setCelebration(value => value + 1);
    input.current?.focus();
    timer.current = setTimeout(() => setStatus("idle"), 2200);
  }

  return (
    <form className={`task-form ${status === "saved" ? "is-celebrating" : ""}`} onSubmit={submit} autoComplete="off" noValidate>
      {status === "saved" && (
        <div key={celebration} className="celebration" aria-hidden="true">
          <div className="success-burst"><Check weight="bold" /></div>
          <div className="confetti">
            {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
          </div>
        </div>
      )}
      <ProjectTaskInput inputRef={input} project={project} onProjectChange={setProject} onTitleChange={value => { clearTimeout(timer.current); setTitle(value); setStatus("idle"); }} inputProps={{
        id: "task", "aria-describedby": "task-status", name: "completed-task", "aria-label": "Completed task",
        maxLength: 300, autoFocus: true, autoComplete: "off", value: title,
        onKeyDown: event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); },
        onChange: event => { clearTimeout(timer.current); setTitle(event.target.value); setStatus("idle"); }
      }}>
        <button className="task-submit" aria-label="Save" disabled={!title.trim()}><ArrowUpRight weight="bold" /></button>
      </ProjectTaskInput>
      <span id="task-status" className={status === "error" ? "form-foot form-status error" : "sr-only"} aria-live="polite">{status === "saved" ? "Saved on this device" : status === "error" ? "Could not save on this device. Your text is still here. Free up browser storage and try again." : ""}</span>
    </form>
  );
}
