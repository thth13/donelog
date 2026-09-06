"use client";

import { InputHTMLAttributes, ReactNode, RefObject, useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check, Plus } from "@phosphor-icons/react";
import { accountFetch, useAccount } from "@/components/AccountProvider";
import { pendingTasks, QUEUE_EVENT } from "@/lib/task-queue";
import { ProjectOption, isProjectOption, mergeProjects } from "@/lib/project-types";
import { projectStyle } from "@/lib/project-style";

type Props = {
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  inputRef: RefObject<HTMLInputElement | null>;
  project: ProjectOption | null;
  onProjectChange: (project: ProjectOption | null) => void;
  onTitleChange: (title: string) => void;
  children?: ReactNode;
};
const words = (text: string) => text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

export function ProjectTaskInput({ inputProps, inputRef, project, onProjectChange, onTitleChange, children }: Props) {
  const { id: userId } = useAccount();
  const id = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const catalog = useRef<ProjectOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [mode, setMode] = useState<"closed" | "suggest" | "select">("closed");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const createLock = useRef(false);
  const consumedTitle = useRef<string | null>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const title = String(inputProps.value || "");
  const position = Math.min(caret ?? title.length, title.length);
  const token = [...title.matchAll(/[\p{L}\p{N}]+/gu)].find(match => match.index <= position && match.index + match[0].length >= position);
  const fragment = token?.[0].toLocaleLowerCase() || "";
  const suggestions = fragment.length < 2 ? [] : projects.filter(option => option._id !== project?._id && words(option.name).some(word => word.startsWith(fragment)));
  const options = mode === "select" ? projects.filter(option => option.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : suggestions;
  const open = !inputProps.disabled && (mode === "select" || (mode === "suggest" && options.length > 0));

  useEffect(() => {
    const controller = new AbortController();
    const cacheKey = `donelog:projects:v2:${userId}`;
    catalog.current = [];
    const update = () => {
      let local: ProjectOption[] = [];
      try { local = pendingTasks(userId).map(task => ({ _id: task.projectId, name: task.project })).filter(isProjectOption); } catch { /* The task queue reports storage errors. */ }
      catalog.current = mergeProjects(catalog.current, local);
      setProjects(catalog.current);
    };
    try {
      const cached: unknown = JSON.parse(localStorage.getItem(cacheKey) || "[]");
      if (Array.isArray(cached)) catalog.current = cached.filter(isProjectOption);
    } catch { /* A cache is optional. */ }
    update();
    async function loadProjects() {
      try {
        const response = await accountFetch(userId, "/api/projects", { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load projects. Reopen the page to retry.");
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isProjectOption)) throw new Error("Invalid projects response.");
        const remote = data;
        if (controller.signal.aborted) return;
        catalog.current = mergeProjects(catalog.current, remote);
        update();
        try { localStorage.setItem(cacheKey, JSON.stringify(catalog.current)); } catch { /* Keep the fetched list in memory. */ }
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load projects.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void loadProjects();
    window.addEventListener("online", loadProjects);
    window.addEventListener(QUEUE_EVENT, update);
    return () => { controller.abort(); window.removeEventListener("online", loadProjects); window.removeEventListener(QUEUE_EVENT, update); };
  }, [userId]);

  useEffect(() => {
    setActive(0);
    if (consumedTitle.current === title) {
      consumedTitle.current = null;
      return;
    }
    if (document.activeElement === inputRef.current) setMode(title.trim() ? "suggest" : "closed");
  }, [title, inputRef]);
  useEffect(() => { if (mode === "select") searchRef.current?.focus(); }, [mode]);

  function choose(option: ProjectOption | null, consume = false) {
    let nextCaret: number | undefined;
    if (consume && token) {
      let start = token.index;
      let end = start + token[0].length;
      // Remove one adjoining space, keeping the rest of the task text intact.
      if (title[end] === " ") end++;
      else if (start > 0 && title[start - 1] === " ") start--;
      const nextTitle = title.slice(0, start) + title.slice(end);
      consumedTitle.current = nextTitle;
      onTitleChange(nextTitle);
      setCaret(start);
      nextCaret = start;
    }
    onProjectChange(option);
    setMode("closed");
    setQuery("");
    inputRef.current?.focus();
    if (nextCaret !== undefined) {
      const selection = nextCaret;
      requestAnimationFrame(() => inputRef.current?.setSelectionRange(selection, selection));
    }
  }
  async function createProject() {
    const name = query.trim();
    if (!name || createLock.current) return;
    createLock.current = true;
    setCreating(true);
    setError("");
    try {
      const response = await accountFetch(userId, "/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }), signal: AbortSignal.timeout(15000)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create project.");
      if (!isProjectOption(result)) throw new Error("Invalid project response.");
      catalog.current = mergeProjects(catalog.current, [result]);
      try { localStorage.setItem(`donelog:projects:v2:${userId}`, JSON.stringify(catalog.current)); } catch { /* Optional cache. */ }
      setProjects(catalog.current);
      choose(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create project."); }
    finally { createLock.current = false; setCreating(false); }
  }

  return <div className="project-task-field" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMode("closed");
  }} onKeyDown={event => {
    if (event.key === "Escape" && open) {
      event.preventDefault(); event.stopPropagation(); setMode("closed");
      if (mode === "select") triggerRef.current?.focus();
    }
  }}>
    <div className="input-wrap">
      <input {...inputProps} ref={inputRef} role="combobox" aria-autocomplete="list" aria-expanded={open && mode === "suggest"} aria-controls={open && mode === "suggest" ? id : undefined} aria-activedescendant={open && mode === "suggest" ? `${id}-${Math.min(active, options.length - 1)}` : undefined} onChange={event => {
        setCaret(event.currentTarget.selectionStart);
        inputProps.onChange?.(event);
      }} onSelect={event => {
        setCaret(event.currentTarget.selectionStart);
        inputProps.onSelect?.(event);
      }} onKeyDown={event => {
        inputProps.onKeyDown?.(event);
        if (event.nativeEvent.isComposing || event.defaultPrevented) return;
        if (suggestions.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault(); setMode("suggest");
          setActive(current => mode !== "suggest" ? 0 : (current + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
        } else if (open && mode === "suggest" && event.key === "Enter") {
          event.preventDefault(); choose(options[Math.min(active, options.length - 1)], true);
        }
      }} />
      <button ref={triggerRef} type="button" className={`project-trigger ${project ? "has-project" : ""}`} style={project ? projectStyle(project.name) : undefined} disabled={inputProps.disabled || creating} aria-label={`Project: ${project?.name || "none"}`} aria-expanded={open && mode === "select"} aria-controls={open && mode === "select" ? `${id}-picker` : undefined} onClick={() => { setMode(mode === "select" ? "closed" : "select"); setQuery(""); setActive(0); }}>
        <span>{project?.name || "Project"}</span><CaretDown size={12} />
      </button>
      {children}
    </div>
    {open && <div id={`${id}-picker`} className="project-menu">
      {mode === "select" ? <>
        <input ref={searchRef} className="project-search" aria-label="Find or create a project" placeholder="Find or create a project…" maxLength={80} value={query} disabled={creating} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault(); }} />
        <button type="button" className="project-option" disabled={creating} onClick={() => choose(null)}>No project{!project && <Check size={14} />}</button>
      </> : <div className="project-menu-label">Projects · Enter to select</div>}
      <div id={id} role={mode === "suggest" ? "listbox" : undefined} aria-label="Projects" className="project-options">
        {options.map((option, index) => <button type="button" id={`${id}-${index}`} key={option._id} role={mode === "suggest" ? "option" : undefined} aria-selected={mode === "suggest" ? active === index : undefined} className={`project-option ${mode === "suggest" && active === index ? "is-active" : ""}`} style={projectStyle(option.name)} disabled={creating} onMouseDown={event => { if (mode === "suggest") event.preventDefault(); }} onClick={() => choose(option, mode === "suggest")}><span className="project-color-dot" aria-hidden="true" /><span>{option.name}</span>{project?._id === option._id && <Check size={14} />}</button>)}
      </div>
      {mode === "select" && <>
        {loading && <div className="project-menu-label">Loading projects…</div>}
        {!loading && !options.length && <div className="project-menu-label">{query ? "No matching projects" : "Create your first project below"}</div>}
        {query.trim() && !projects.some(option => option.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase()) && <button type="button" className="project-option project-create" disabled={creating} onClick={() => void createProject()}><Plus size={14} /><span>{creating ? "Creating…" : `Create “${query.trim()}”`}</span></button>}
        {error && <p className="project-error" role="alert">{error}</p>}
      </>}
    </div>}
  </div>;
}
