---
version: alpha
name: Done
description: A quiet journal of completed tasks with immediate capture feedback.
colors:
  primary: '#344c3d'
  ink: '#1f251f'
  background: '#f5f3ed'
  border: '#dfddd5'
  muted: '#74756f'
typography:
  sans:
    fontFamily: 'Manrope, sans-serif'
rounded:
  DEFAULT: '18px'
spacing:
  page-max: '1240px'
components:
  TaskForm: {}
  TaskSync: {}
---

## Overview
Done is an English-language personal task journal. The existing centered input, cream surface, green accents and completion burst define its identity. Market scope is unspecified. Runtime tokens are owned by `app/globals.css`; this document records existing choices and does not generate CSS.

## Colors
Use the existing ink, green, cream, line and muted CSS variables for task feedback.

## Typography
Manrope is provided by `app/layout.tsx`, with Latin and Cyrillic subsets and sans-serif fallback. Existing compact utility text remains English.

## Layout
The home form is at most 620px wide within a 1240px shell. Mobile layout switches at 700px. Global synchronization feedback is fixed near the bottom without moving the input.

## Elevation & Depth
Preserve the input shadow and understated bordered surfaces.

## Shapes
The input has an 18px radius, its submit button 13px, and the completion mark is circular.

## Components
`TaskForm` owns task input and immediate local acceptance feedback. Only clear input after localStorage succeeds; preserve it with an inline error otherwise. The existing burst acknowledges local acceptance, not confirmed server persistence.

`lib/task-queue.ts` owns persisted pending tasks, with one key per task to avoid cross-tab queue overwrites. `TaskSync` in the root layout owns retries and an accessible persistent status with a Retry action. Retry transient failures at most five times with exponential backoff; reconnect, returning to the tab, a new submission or a new visit starts another attempt. Server rejection retains the task without automatic repeated requests until a new trigger.

`app/api/tasks/route.ts` owns idempotent creation using MongoDB's unique `_id` and preserves the submitted completion date. The app currently has no user/account model. Queue entries remain in this browser until server acknowledgement; they are removed individually after successful responses. Statistics merge queued and confirmed tasks by ID.

Phosphor icons, current animations and reduced-motion CSS remain the visual conventions.

## Do's and Don'ts
- Keep capture immediate and allow the next task while previous tasks sync.
- Distinguish local acceptance from server confirmation in status text.
- Never remove a pending task on a failed or uncertain request.
- Preserve existing visual identity and runtime token ownership.
