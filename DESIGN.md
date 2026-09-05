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

`lib/task-queue.ts` owns persisted pending tasks, with one key per task to avoid cross-tab queue overwrites. `TaskSync` inside the authenticated account provider owns retries and an accessible persistent status with a Retry action. Retry transient failures at most five times with exponential backoff; reconnect, returning to the tab, a new submission or a new visit starts another attempt. Server rejection retains the task without automatic repeated requests until a new trigger.

`app/api/tasks/route.ts` owns idempotent creation using MongoDB's unique `_id` and preserves the submitted completion date. Tasks belong to a user; server queries and mutations always filter by the authenticated owner. Queue entries remain in this browser until server acknowledgement; they are removed individually after successful responses. Statistics merge queued and confirmed tasks by ID.

Phosphor icons, current animations and reduced-motion CSS remain the visual conventions.

History exposes a small left-side delete cross on row hover and keyboard focus, always visible on touch devices. `StatsDashboard` owns the app-styled native dialog with modal focus containment, Cancel autofocus, Escape dismissal, focus restoration, pending state and inline retry errors. User-facing labels say Delete; confirmed deletion internally sets `Task.archivedAt`; archived records remain in MongoDB and are excluded from history and statistics. No archive screen or restore control is exposed, per the user's requested lifecycle. Queued entries are saved before archiving; failed requests retain the entry. Runtime styles live in `app/globals.css`.

## Do's and Don'ts
- Keep capture immediate and allow the next task while previous tasks sync.
- Distinguish local acceptance from server confirmation in status text.
- Never remove a pending task on a failed or uncertain request.
- Preserve existing visual identity and runtime token ownership.

`EditTaskDialog` edits the task title and completion date/time through `PATCH /api/tasks/[id]`. It follows the existing modal styling and focus lifecycle. `react-datepicker` owns the date calendar, hidden by default and expanded using the date button. Selecting a date or pressing Escape closes it and restores focus to the button. Compact hours/minutes fields sit beside the date button. Time is entered separately as two numeric-keyboard text fields for hours (00–23) and minutes (00–59), with inline validation and zero-padding on blur. Changing the calendar date preserves the entered time. The date summary, month controls, cream surfaces and green selection use scoped styles in `app/globals.css`. No body portal is used, keeping the picker inside the native modal focus boundary. Values are displayed in the browser timezone and stored as UTC instants. Title-only edits preserve the original seconds. Save failures retain the draft with an inline error. Saved edits reorder history and update statistics. A pencil appears next to the task title on hover/focus and remains visible on touch devices.


## Accounts and public landing
The existing English locale, Manrope, cream surface, green actions, and Phosphor icons remain canonical. The guest home is a single hero: a centered everyday-progress headline, a “Sign up or sign in” button, and an example journal entry. The button opens a secret-key sign-in modal; “Don’t have an account? Register” navigates to `/register`. Body and display roles use Manrope with distinct scale and weight; no new font dependency is introduced. Runtime styling and scrollbar tokens are owned by `app/globals.css`.

`Landing` owns the public introduction and modal trigger. `LoginDialog` follows the existing native-dialog convention: initial field focus, modal focus containment, inert background, scroll locking, Escape dismissal, close button, and focus restoration. Closing is disabled while sign-in is pending. `AuthForm` owns the shared field, validation, submission and key-saving behavior. On `/register`, the first step asks for a username; the second shows a readable, copyable key with an explicit explanation that it is the account sign-in key and must be saved. After save acknowledgement the user can open the journal. A generated private registration request ID makes retries after a lost response idempotent while the page remains open. Secrets remain in component memory only. Unsaved keys trigger a page-unload warning. Account creation transitions to key saving, then sign-in and the journal. `AccountMenu` owns identity and sign-out on both authenticated screens.

`lib/auth.ts` owns session lookup, route protection, same-origin mutation checks, and stale-account request rejection. `AccountProvider` and `accountFetch` carry the account ID; all queue operations take an explicit user ID. Pending tasks survive logout in separate per-account storage. Only `thth13` migrates the old browser queue. `scripts/init-auth.mjs` reserves that first account and migrates all database entries without an owner, including archived records. No task dates or existing ownership are overwritten.

Canonical UI map: account form → `AuthForm`; sign-in overlay → `LoginDialog`; registration route → `app/register/page.tsx`; account actions → `AccountMenu`; session and API ownership → `lib/auth.ts`; queue ownership → `lib/task-queue.ts`; capture, edit, archive → existing components. New account flows follow their inline error and preserved-draft conventions. The sign-in overlay uses the same native `<dialog>` lifecycle as the existing edit and archive dialogs.

Verification scope: source inspection and static skill audit only. The user explicitly prohibits starting the project, builds, and tsc; browser and runtime workflow verification are left to the user.

Secret-key fields have no Show/Hide button. Sign-in input stays masked; the newly issued registration key is readable for manual saving. All auth forms use a 16px gap before the submit button when no error is present. The key-saving step uses 12px gaps between the copy action and save checkbox; empty copy feedback occupies no space.

The task input has no individual focus outline; its existing wrapper border and focus-within shadow indicate focus. `AccountMenu` provides Copy secret key with accessible success/error feedback on home and statistics. New sessions hold an AES-256-GCM encrypted copy of the sign-in key, decryptable using the raw HttpOnly session cookie only. The copy endpoint checks origin, session, and account identity and returns no-store responses. Existing sessions require signing in again once; no plaintext key is added to browser storage or server logs.

Auth cards omit the “Your own little record” eyebrow. Headings start at the card inset, with 8px to the description and 16px from description to form; descriptions use natural height. The modal close button is positioned in the upper-right without adding a blank row. Account-switch links sit 12px below the primary action. The landing action fits its contents, with a more specific selector than the shared full-width auth button.

The account menu shows only an abbreviated secret key (first nine and last four characters) and Sign out, without the username or a visible Copy secret key label. The abbreviation is a button that copies the full key, with an accessible copy label and success feedback. Initial loading fetches only the preview; the full key is requested on click. Preview failures retain a retryable control and inline explanation.

The capture home omits all account controls. Statistics keeps the account menu but omits Add entry; the brand link returns to capture. The abbreviated key is a rounded, bordered chip with hover, pressed, disabled, and keyboard-focus states. Clicking still copies the full key.

Link preview artwork uses the existing cream/forest-green palette, lowercase done wordmark, completion check, and the landing headline. `app/opengraph-image.png` is a generated public raster asset; `app/opengraph-image.alt.txt` supplies its accessible description. Browser and Apple icons derive from the existing `app/favicon-512.png` brand asset. Root metadata uses the public request origin, optionally overridden by `NEXT_PUBLIC_SITE_URL`, and includes Open Graph and Twitter large-image metadata.

The OG artwork now replaces the oversized circular check with three example completed tasks and small green checkmarks. The background is plain cream, without a surrounding border, dimensional button, or shadow; the headline remains the main element.
