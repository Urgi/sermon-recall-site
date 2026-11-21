# UI/UX pass: Sermon Recall website

**Date:** 2026-11-20 · **Build:** `main` @ 0692529, local dev server (`localhost:3100`) on the live Supabase project, Stripe test mode
**Checked:** every public page signed out; every admin page signed in as an admin pastor of *Grace Community (demo)*. Each at 1280px and 375px, in dark and light admin themes. Each page had an automated check for contrast, tap-target size, unlabeled fields and horizontal overflow, plus screenshots and a read of the code.
**Not checked in a browser:** `/register` and `/verify-email` signed out, and `/invite/[token]` and `/auth/callback`. The signed-in session redirects away from these, so they were reviewed from code. `/forgot-password` and `/reset-password` just redirect to `/login`. Billing checkout and plan switching were not clicked.

Priority: **P1** = broken, or blocks or misleads people · **P2** = a clear usability or accessibility problem · **P3** = polish.
Effort: **S** = minutes · **M** = under an hour · **L** = a larger change.

---

## Cross-cutting (affects many pages)

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| X1 | P1 | **Primary buttons fail contrast.** White text on `#0ea5e9` is **2.77:1**; the accessibility minimum (WCAG AA) is 4.5:1. Affected: "Pastor sign in", "Create church", "+ Add sermon", "Upload sermon", "Invite team member", "Save…", "Continue", "Review & send now", the selected "7 days" chip, and "Open in app". | Darken the filled button colour to `#0284c7` (already the hover colour, 4.1:1 with bold 14–16px text), with `#0369a1` on hover. Do this in `.admin-btn-primary` and the hard-coded public, auth and chip buttons. The colour family stays the same. | M |
| X2 | P1 | **Light theme: the `--admin-dim` token (`#94a3b8`) is 2.5:1 on white.** It's used for table headers, billing labels ("Plan", "Status", …), "Step 1 of 3", date placeholders and the chart legend. | Change light `--admin-dim` to `#64748b` (4.8:1). Dark mode is unaffected. | S |
| X3 | P2 | **Dark theme: small grey text is 4.0–4.3:1.** This covers `#64748b` on near-black: sidebar user and church name, table headers, the footer tagline, "Last updated", and hint lines on the public pages. | Change dark `--admin-dim` to `#7c8aa0` (about 5:1). On the public pages, swap `#64748b` for `#94a3b8` in body copy. | S |
| X4 | P2 | **Every page has the tab title "Sermon Recall".** This includes the admin pages, the auth pages and `/join/[code]`. Browser tabs, history and screen readers can't tell the pages apart. | Add a root `title.template` of `%s · Sermon Recall`, plus `metadata.title` on each page ("Dashboard", "Members", "Billing", "Sign in", …). | S |
| X5 | P2 | **The theme default disagrees with itself.** With nothing stored, `ThemeScript` picks *system* (light on a light-mode Mac), but `readStoredAdminThemePreference()` falls back to *dark*. So new users get a flash of the light theme followed by dark. | Make the fallback `'system'` in both, which matches the "System" option on the Settings page. | S |
| X6 | P3 | **Text links and inline actions are 20–21px tall.** This is under the 24px minimum (WCAG 2.2) for "View all →", "Review →", "See who opened", footer links and "Remove". | Add `min-h-6` / `py-1` (inline-flex) to these. | S |

## Admin › Members (`MembersRoster.tsx`): new, deserved a close look

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| M1 | **P1** | **The Remove button is cut off on phones.** At 375px the table is 417px wide inside a 341px card with `overflow-hidden`, so the Remove column sits off-screen and can't be reached. | Let the table scroll sideways (`overflow-x-auto`), and on phones put Remove in the member cell under the contact line so it's always visible. | S |
| M2 | P2 | **The App Store Reviewer account looks like any other member.** One click and a confirmation removes the account Apple's reviewers use. | Show a "Reviewer account" badge and add an extra warning sentence in the confirm dialog for that email. Display only; the API is unchanged. Hiding the button entirely would be a behaviour change, so that's your call. | S |
| M3 | P2 | **The Remove button's tap target is 53×21px.** | Pad it to at least 32px tall; inline-flex. | S |
| M4 | P3 | **The success or error message appears as plain text above the search box,** and doesn't look like a status message. | Show it as an alert box (green or red tint, the same pattern as the billing notices below), with a dismiss button. | S |
| M5 | P3 | **The dialog title reads "Remove ?" while it closes,** because `removeTarget` is cleared before the exit animation finishes. | Keep the last name in a ref while the dialog closes. | S |
| M6 | P3 | **The "Email a member" field in the Invite card has no label** (placeholder only). | Add an `aria-label`. | S |
| M7 | P3 | **Member counts don't match.** The dashboard says **3** total members; the Members page and sidebar badge say **2**. The dashboard count probably includes staff. | Relabel the dashboard tile, or align the count. Copy only, and only once we know which number is meant. | S |

## Admin › Billing (`billing/page.tsx`, `BillingPanel.tsx`): new, deserved a close look

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| B1 | ~~P1~~ | ~~**"Test mode — use card 4242 4242 4242 4242" always shows.**~~ **Done:** the line was removed in 4524c35 (another session). | – | – |
| B2 | P2 | **Plan switching uses the browser's built-in `window.confirm` box,** which looks nothing like the rest of the admin site and can't be styled. A successful switch gives no feedback (the page just refreshes). | Use a `ModalShell` confirm dialog with the plan, price, member limit and a proration note, then a success notice ("You're now on Plus"). Same API call. | M |
| B3 | P2 | **The status badge shows raw Stripe values:** "no subscription", "past due", "incomplete_expired" (only the first `_` is replaced). All statuses share one neutral style. | Map them to labels (Active, Trial, Payment failed, Canceled, Not subscribed) and colour the existing `admin-badge` variants by status. | S |
| B4 | P2 | **Notices look the same whatever they say.** Checkout success, checkout canceled, payment failed and "reached member limit" are all neutral grey. Payment failed and member limit should stand out. | Use green / amber / red tints and a heading in each. | S |
| B5 | P3 | **The "Renews on —" row appears when there is no subscription.** | Hide the row with no subscription. Show "Ends on" when the subscription is set to cancel. | S |
| B6 | P3 | **"More than 500 members? Contact us" has no link.** | Make it a `mailto:` link to the support address. | S |
| B7 | P3 | **Width doesn't match other pages.** The page is narrower (`max-w-3xl`) and centred, while the other pages are wide (`max-w-6xl`) and left-aligned. | Leave the width, but left-align it like Settings. Optional. | S |

## Admin › Dashboard (`DashboardOverview.tsx`, `DashboardShareCard.tsx`)

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| D1 | **P1** | **"Share with members" cuts the church code to "GRA…"** at both 1280px and 375px. The main thing a pastor needs to read out is hidden, and the Copy link / Download QR labels wrap onto two lines. The same card on the Members page truncates on phones. | When narrow, stack the QR under the code (`flex-wrap`), let the code wrap instead of truncating, and stack the buttons when tight. | S |
| D2 | P2 | **On phones the four stat tiles stack into four full-width cards,** about 600px of scrolling before any content. The same happens on Team. | Use a two-column grid under `sm`. | S |
| D3 | P3 | **"Open the Members tab" under Total members looks like a hint, not a link.** | Make it a link to `/members`. | S |

## Admin shell and navigation

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| N1 | P2 | **On phones the tab row scrolls sideways, with nothing to show there's more.** Billing, Notifications and Settings are off-screen. | Add a fade on the right edge, and scroll the active tab into view. | S |
| N2 | P3 | **"← Dashboard" back links appear on Notifications and Settings,** which are top-level pages in the sidebar. No other top-level page has one. | Remove them. | S |
| N3 | P3 | **The phone header says "Church admin"** without naming the church. | Show the church name, cut short if needed. | S |

## Admin › Sermons, sermon detail, new sermon

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| S1 | P2 | **Opening a "Ready for review" sermon in a new browser starts a fresh AI generation** (`POST /api/generate-devotionals`). The draft preview is kept only in the browser's `localStorage`, so a second device or a cleared browser regenerates it, possibly with different text. **Not a visual fix:** it needs the preview stored on the server. Logged as a follow-up, not part of this pass. | Follow-up. | L |
| S2 | P3 | **The date picker on the new-sermon form is about 20px narrower** than the Title and Pastor fields. | Make it `w-full`. | S |
| S3 | P3 | **The "Ready for review" filter is pre-selected on Sermons,** so "All (9)" isn't the default view. That's intentional and worth keeping, but there's nothing to say a filter is active. | Leave as is. Noted only. | – |

## Admin › Team and Notifications

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| T1 | P3 | **On phones the four stat tiles stack** (same as D2). | Two-column grid. | S |
| T2 | P3 | **The Notifications audience picker is hard to follow.** It mixes "Team roles" checkboxes with an "All church members" checkbox under one heading, and three staff roles are pre-ticked. | Split it into "Who receives this" with two clear groups (Congregation / Team roles). Copy and layout only. | M |
| T3 | P3 | **The role checkboxes are 16px** (inside labels, so the real tap area is larger). | Make the label rows at least 32px tall. | S |

## Auth pages (`/login`, `/register`, `/verify-email`, `/invite/[token]`, `/auth/callback`)

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| A1 | **P1** | **Login: people with a code can't find where to type it.** Seen live: the user typed their code into the *Email* field. The only way in for an existing code is the "Enter confirmation code" link, which sits after "No account?" and goes to `/verify-email`, the new-account confirmation screen. | Add an "I already have a code" button to the email step that goes straight to the code screen with the email kept. If someone types only digits into Email, show a message pointing to the code screen instead of sending. Rename the footer link to "Confirm a new account". The sign-in calls stay the same. | M |
| A2 | P2 | **Register looks different from Login.** Its inputs are smaller and squarer, the labels are grey instead of white, and the button is a rounded rectangle where Login's is a pill. The card padding is also too big for phones (`p-8` at 375px). | Use Login's input and button classes; `p-6 sm:p-8`. | S |
| A3 | P3 | **The invite page has no logo or card,** unlike the other auth pages. | Wrap it in the same card and logo. | S |
| A4 | P3 | **On a slow network the auth callback shows "Finishing sign-in…" with no way out.** | After a timeout, add a "Back to sign in" link to the client. Check `AuthCallbackClient` first. | S |

## Public pages (`/`, `/faq`, `/privacy`, `/support`, `/delete-account`, `/join/[code]`)

| # | P | Finding | Fix | Effort |
|---|---|---|---|---|
| P1 | P2 | **The filled buttons fail contrast** (see X1), and the grey text is 4.0–4.3:1 (see X3). | Covered by X1 and X3. | – |
| P2 | P2 | **`/join/[code]`:** no page title; the join URL in `#475569` is about 2.6:1 contrast; "Open in app" does nothing on a desktop browser. | Add a title "Join {church}". Brighten the URL text. Note "Open in app" works on phones. | S |
| P3 | P2 | **The "Church code not found" page is a dead end for members.** Its only link is "Pastor admin sign in". | Add a link to the home page and the app-store links. | S |
| P4 | P3 | **The phone header hides FAQ and Support,** so the only way to reach them is the footer. | Show them as compact links on phones. There's room, since the header holds only the logo and one button. | S |
| P5 | P3 | **On the homepage "Read the FAQ →" and "Visit support page →" run together on one line** with uneven spacing. | Use a flex row with a gap. | S |
| P6 | P3 | **Support says "Sermon Recall is operated by Sermon Recall."** | Reword it ("Sermon Recall helps churches…"). | S |
| P7 | P3 | **The footer lists `llms.txt` among the links for people.** | Remove it from the visible footer. The file is still served and listed in `robots.txt` / `sitemap.xml`. | S |
| P8 | P3 | **Copy: "Saturday/Sunday's message"** in the hero headline reads awkwardly. | "this weekend's message". Your call on the wording. | S |
| — | note | **Privacy, Settings and the join link show `http://localhost:3000`.** That comes from the local `.env` site URL, not a production bug. | None. | – |

---

## Proposed scope for this pass

**Fix now (all P1 and P2 items, plus cheap P3s):** X1–X6, M1–M7, B2–B7, D1–D3, N1–N3, S2, T1, T3, A1–A4, P2–P7.
**Needs your call:** P8 (headline copy), M2 (badge only, or also hide Remove for the reviewer account), T2 (audience picker layout).
**Follow-up, not in this pass:** S1 (store the review preview on the server).

No API routes, billing behaviour or database changes are involved.

---

## What was changed (2026-11-20)

All changes are uncommitted on `main`. `npx tsc --noEmit` and `npx next lint` are clean.

- **Cross-cutting:**
  - Filled buttons now use `#0379bd`→`#0369a1` (white text 4.7–5.9:1) in `.admin-btn-primary`, the auth and public buttons, and the dashboard range chip. The old gradient also hid the hover colour; hover now works.
  - Dark `--admin-dim` is `#7c8aa0`; light `--admin-dim` is `#64748b`; light `--admin-accent` is `#0369a1`.
  - Grey text on the public pages is `#94a3b8`.
  - The theme falls back to `system` everywhere.
  - Every admin, auth and join page has its own tab title.
  - Link tap targets are larger (sermon Review, View all, See who opened, the date picker's Clear, the footer, the public links).
- **Members:**
  - The table scrolls sideways; on phones Remove sits under each member and is 32px tall.
  - "App Review account" badge, plus a warning in the remove dialog for that account.
  - Success and error messages appear as dismissible notices.
  - The dialog copy stays in place while it closes.
  - The invite email field is labelled.
- **Billing:**
  - Plan switching uses a `ModalShell` confirm and shows a success notice. The API call is unchanged.
  - Status labels and colours (Active, Trial, Payment failed, …).
  - Coloured notices for checkout, payment failed and member limit.
  - The renewal row shows only with an active subscription.
  - "Contact us" is a `mailto:` link.
  - B1 was already done in 4524c35.
- **Dashboard and Team:**
  - The share card wraps instead of truncating, so the code is always visible.
  - Two-column stat tiles on phones.
  - Chart legend text uses the muted token.
- **Shell:**
  - On phones the tab row fades at the edge that has more tabs, and keeps the current tab centred.
  - The phone header shows the church name.
  - The sidebar user and church text is larger.
  - "← Dashboard" removed from Notifications and Settings.
- **Auth:**
  - Login has "I already have a code". A code typed into the Email field is caught and kept, with a prompt for the email. Our own email check replaces the browser's built-in one.
  - Footer links are now "Create a church account" and "Confirm your new account".
  - Register and Verify share Login's styles (`components/auth/authFormStyles.ts`).
  - The invite page has the logo.
  - The callback shows "Go to sign in" after 6 seconds.
- **Public:**
  - FAQ and Support links show on phones.
  - The homepage support links have even spacing.
  - The `llms.txt` footer link is removed.
  - Support copy reworded.
  - `/join` titles are "Join {church}" or "Church code not found".
  - The not-found page has the logo, app-store links and a home link.

**Not done:** P8 (headline copy, your call), T2 (audience picker redesign), D3 (the tile is already a link), B7 (Settings is centred the same way, so it's consistent), S1 (follow-up).

**Not checked in a browser:**
- The login, register and verify screens: the signed-in session redirects away from them, so they were checked only with the type checker and lint.
- The plan-switch dialog: Plus has no price ID locally, so its button is disabled.
