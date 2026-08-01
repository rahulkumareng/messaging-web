# DESIGN.md — Messaging Web

Design philosophy, adoption status, and progress for the messaging-web UI.
Source of truth for what the UI is supposed to look like and how far along we are.

---

## 0. The hard law: NO IMAGES. EVER.

Declared a **hard law by the user on 2026-08-02**. It overrides everything else in this document:

- **Never touch any kind of image file, in any way.** No creating, editing, moving, or deleting — rasters (`.png`, `.jpg`, …) *and* SVG assets. `public/favicon.svg` is **frozen**.
- All visuals are **code**: Chakra tokens/CSS for surfaces and effects, inline SVG React components (in `src/components/icons.tsx`) for icons and illustrations. There are no image dependencies in the design.
- If a genuine image is ever needed, **ask the user to supply it** — they own the asset side; we do code. Stop there and don't improvise an image ourselves.

---

## 1. Design philosophy

**Core rule — first principles + accessibility.** Every design decision derives from what the user actually needs: question convention, defaults, and other apps' patterns instead of copying them. Accessibility is a floor, not a feature:
- **Color contrast** — WCAG AA for text everywhere; semantic tokens (`text.*`, `accent.*`, `warm.*`) are tuned per theme so contrast holds in light and dark
- **Keyboard navigation** — everything reachable and operable by keyboard: visible focus (global `:focus-visible` outline), dialog focus-trapping + Escape-to-close (Chakra Dialog), logical tab order
- **Semantics & labels** — real buttons/links/inputs, `aria-label` on icon-only controls, `aria-current` on the active conversation, `role="status"`/`aria-live` for the connection state
- **No color-only signals** — unread dot always accompanies message ordering/weight; connection dot is paired with a text label; status icons pair with text where it matters
- **Motion safety** — global `prefers-reduced-motion: reduce` override kills all animations

**"Cartoon Duo" — minimalist bones, cartoon skin.** Direction (user, 2026-08-02): *"minimalist + dual tone + a bit funky cartoony."*

**Dual tone** = a **two-accent palette**, not light/dark: ink-blue `#2d5bff` is the primary accent (actions, bubbles, links); warm amber `#f59e0b` is the sparing second accent (unread dots, badges, highlights). Light is the default theme; dark is a `.dark` class on `<html>`.

| Element | Spec |
|---|---|
| Accents | **graphite ink** `#3a3a42` (`brand.*`, blue removed 2026-08-02 per user) + warm `#f59e0b` (`warm.*`) — amber is now the ONLY color; graphite = action, amber = attention |
| Type | **Fredoka** (400–700) for **brand moments only**: wordmark + auth-page headings (≥24px). **Inter** everywhere else — headings, dialog titles, buttons, body |
| Borders | **2px** on all interactive/solid surfaces: buttons, inputs, cards, bubbles, avatar tiles, dialog, active list item |
| Shadows | **Tiered by hierarchy, not dosage**: cards/dialogs `4px`, buttons `3px` — bubbles and list rows are **calm** (2px border, no shadow). The active row floats; hover rows don't. Press = `translate(2px, 2px)` + shadow removed |
| Radii | Cards `2xl`, bubbles `xl`, inputs/buttons `lg`, avatars rounded-square `lg` |
| Motion | Message arrival = `spring-in` 180ms (opacity + 3px rise + scale 0.98→1, **no overshoot above 1**); button press-down; connected dot soft `pulse` (2.4s) when live; warm hovers; auth card keeps the `fade-in-up` hero; global `prefers-reduced-motion` override |
| Warm pop (semantic only) | Unread dot + "Admin" badge (attention register). Group icons, gear, success states are **neutral** — warm is never decoration |
| Illustrations | Abstract duotone inline-SVG (no faces, no sparkles), 88px seasoning — **the copy does the work**: `InboxArt`, `ChatArt`, `SearchArt`; `BoltIcon` brand mark |
| Icons | All hand-authored inline SVG (`chakra.svg`), no `createIcon` helper / no emoji / no text glyphs; uniform 24×24 stroke (fill none, currentColor, 2px, round); `UsersIcon` fixed to the real lucide "users" (was a mislabeled edit/pencil glyph) |
| Avatars | Rounded-square "sticker" tiles, 2px ink border, white bold initials on one of **ten desaturated tones** (sat 18–48%, varied lightness, ≥4.9:1 white text both themes — muted but distinct, not muddy); per-identity tilt (−3°..+3°) **on `small` tiles only** |

### Restraint rules — the "nevers" (audit 2026-08-02, ~45 expert sources; record in §4)

- **One color, one job.** Graphite ink = action (bubbles, buttons); warm amber = energy + attention (unread dot, Admin badge, active-row marker, warm hovers, **send button lights amber when you have text**). Amber splits into two roles: `warm.solid` = fill (send button, dot, art), `warm.text` = readable content on light/dark (hover icons, markers — warm.solid is light and vanishes on white). Outline follows fill luminance: light fills get dark outlines, dark fills get light ones — in both modes.
- **Motion is feedback, and there is some.** Aliveness comes from responsiveness: message `spring-in`, connected-dot `pulse`, warm hovers, amber send-state. Subtle (≤200ms, no overshoot), transform/opacity only, reduced-motion-safe. Dull ≠ calm.
- **Loudness by hierarchy, not dosage.** If every surface is equally chunky, nothing is. Shadows go on cards/buttons; bubbles and rows stay calm. One loud state per surface class.
- **Display type is a brand moment.** Fredoka ≥24px only. A rounded face on 14px buttons reads childish.
- **Motion answers a question.** Arrival = fade 160ms; press ≤100ms; one hero moment. If the answer to "what does this animation communicate?" is "delight," cut it.
- **Copy does the work.** Dry, specific, 3–12 words, one action. No emoji, no exclamation parties.
- **Never color-only.** Unread = warm dot **+ bold name**; connection = dot + label; ticks pair icons with meaning.
- **Contrast is a floor.** Every text token ≥4.5:1 in both themes (computed, verified). Dark accent is a **deep blue** (`brand.600`) with white text (6.6:1 rest / 5.2:1 hover) — the classic messaging convention; the accent's text/icon role has its own light token (`accent.text`) so links and read ticks never vanish on dark canvas.
- **Disabled is gray, never a wash.** Fading a colored button (opacity) makes its label unreadable in both modes — disabled cartoon buttons get explicit `bg.hover` + `text.secondary` + no border/shadow.
- **Token references must be `var()` chains.** Chakra v3.36 emits bare token-name references (`brand.500`) verbatim into CSS — an invalid color that the browser drops (transparent bg, white-on-white). Semantic token values must use `var(--chakra-colors-…)`; verify with `system.getTokenCss({})`, never designed values.
- **60-second clustering.** Consecutive same-sender messages merge: one sender label + one timestamp per cluster, ~2px within / ~10px between — a thread is a conversation, not a log.
- **Two-tone ink in dark.** One ink color can't outline both dark and light fills: `border.ink` (dark line) draws light fills — my bubbles, buttons, avatars, warm dots; `border.ink-light` (light line, ≈11.7:1) draws surfaces that go dark — incoming bubbles, cards, dialogs, art. Dark shadows are light hard edges ("backlight"), so depth and press-down survive on near-black.

**Implementation homes (Chakra v3):** tokens/recipes/keyframes → `src/theme.ts`; icons & illustrations → `src/components/icons.tsx`; per-component styling → each component file, using semantic tokens (`accent.*`, `warm.*`, `border.ink`, `shadows.offset`, layerStyle `card`, button `cartoon` variant).

---

## 2. Adoption status (per file)

### Done ✅

| File | What |
|---|---|
| `src/theme.ts` | `warm` color scale; semantic tokens `warm.*`, `border.ink`, `shadows.offset` / `offset-lg`; `layerStyles.card` (2px ink border + offset-lg + 2xl); button recipe (display font + opt-in `cartoon` variant with press-down); input/textarea 2px borders; keyframes `pop-in` + `wiggle`; Fredoka via `fonts.heading`/`fonts.display` |
| `index.html` | `theme-color` → `#f5f5f7`; Fredoka added to Google Fonts link |
| `src/components/icons.tsx` | `BoltIcon` brand mark (speech bubble + warm bolt); duotone `InboxArt`, `ChatArt`, `SearchArt` empty-state illustrations |
| `src/components/AppDialog.tsx` | Content uses `layerStyle="card"` (2px border + offset shadow + 2xl radius); stale "glass" docstring corrected |
| `src/components/AvatarInitials.tsx` | Rounded-square tile (`borderRadius="lg"`), 2px `border.ink` border, per-hash rotation −3°..+3°, white bold initials |

### All plan items implemented ✅ (verified in working tree 2026-08-02)

| File | What |
|---|---|
| `src/pages/ChatPage.tsx` | Sidebar brand: `BoltIcon` + "Messenger" wordmark; new-chat/new-group icon buttons hover warm (`warm.solid`/`warm.muted`) — the old `brand.300` hovers are gone |
| `src/components/ConversationItem.tsx` | Active item: 2px `border.accent` + `offset` shadow + `lg` radius; hover: 2px `border.strong` + shadow; unread dot → `warm.solid` with ink border; group icon → `warm.solid` |
| `src/components/ConversationList.tsx` | Search input 2px border + `lg` radius (recipe); empty states use `InboxArt` / `SearchArt` (explicit boxSize); "Start a conversation" button: `colorScheme="brand" cartoon` (2px border + offset shadow + press) |
| `src/components/ChatView.tsx` | Bubbles: mine = `accent.solid` + 2px `border.ink` + `offset` shadow + `xl` radius + pop-in; theirs = `bg.raised` + 2px `border.ink` + offset shadow + pop-in. Date separators: pill chip (1px border, `bg.raised`). Input 2px border + `lg` radius, focus `border.accent`; send button `cartoon` with press; empty state: `ChatArt`; settings gear: warm hover + wiggle |
| `src/components/CreateGroupModal.tsx`, `GroupSettingsModal.tsx`, `NewDirectChatModal.tsx` | Primary buttons `colorScheme="brand" cartoon` (border + offset shadow + press); inputs 2px border (recipe); Admin badge `colorPalette="warm"`. No structural changes |
| `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx` | Card `layerStyle="card"`; `BoltIcon` mark above heading; submit button `colorScheme="brand" cartoon`; inputs 2px border |

### Restraint pass ✅ (2026-08-02 — the anti-slop audit; see §4)

| File | What |
|---|---|
| `src/theme.ts` | Contrast: dark `accent.solid` → `brand.300` + `text.inverse` → navy `#0d2066` (inverted dark accent, 7.3:1 at rest and hover); `text.muted` → `#6f6f78`/`#8a8a94` (4.57/5.64:1); `success`/`danger` light → `#078049`/`#c93a40` (4.60/4.63:1); `border.accent` → full-strength brand (5.18/8.84:1). Fredoka zoned to `fonts.display` (heading token back to Inter). Button recipe: Inter, `_disabled` in cartoon variant. Deleted `pop-in` + `wiggle` keyframes; `fade-in-up` retuned (4px, no overshoot) |
| `src/components/icons.tsx` | `InboxArt`/`ChatArt`/`SearchArt` redrawn **abstract** — no faces, no sparkles; single `warm.400` accent each; 88px default; dark-safe (no `warm.200` glare) |
| `src/components/ChatView.tsx` | **60s same-sender clustering** (one label + one time per cluster; 2px within / 10px between); bubbles **calm** (2px border, no shadow) with 16px text; mine = `accent.solid`/`text.inverse`; arrival `fade-in-up 160ms`; wiggle removed (back + gear); send button `text.inverse`; empty copy → "Send the first message below to start chatting." |
| `src/components/ConversationItem.tsx` | Hover shadow removed (hover = tint + border only); **unread name bold** (no color-only signal); group icon → `text.secondary` |
| `src/components/ConversationList.tsx` | Art 88px; copy → "Search for someone by email to start a chat."; start button explicit `accent.solid`/`text.inverse` tokens |
| Modals (3) | Primary buttons explicit accent tokens (dark-mode safe); Admin badge text → `warm.800`/`warm.200` (7.09/14.49:1); 🚀 removed from placeholder |
| `src/pages/LoginPage.tsx`, `RegisterPage.tsx` | Submit buttons explicit accent tokens; h1 `fontFamily="display"` (the brand moment) |
| `src/pages/ChatPage.tsx` | Wordmark `fontFamily="display"` |
| `src/components/AvatarInitials.tsx` | Tilt on `small` tiles only |

### Dark-mode repair pass ✅ (2026-08-02 — parallel agent audit + fix; record in §4)

| File | What |
|---|---|
| `src/theme.ts` | **Two-tone ink**: new `border.ink-light` (`#16161a`/`#d6d6dc`) for surfaces that go dark in dark mode — incoming bubbles, cards, dialogs, art strokes (11.7:1); `border.ink` stays the dark line for light fills (my bubbles, buttons, avatars, dots). `bg.active` dark → 0.25 alpha; `bg.hover` → `#24242c`; `border.subtle` → `#2f2f37`; `border.strong` → `#4a4a54`; `danger.border` dark → 0.8 alpha. Shadows: dark values are now light hard edges (`rgba(255,255,255,0.08)`) — "backlight" depth + visible press-down. **Fixed the transparent-subtle bug**: added `brand.subtle`/`brand.fg` + `warm.subtle`/`warm.fg` palette tokens so Chakra `subtle` variants render (Admin badge, Add/Chat buttons had transparent backgrounds). Focus ring unified on `brand.300` |
| `src/components/AvatarInitials.tsx` | 9 of 10 tile colors darkened (verified 4.5+:1 with white initials) — amber `#9b6e1f`, mint `#238565`, orange `#ab6524`, teal `#25837e`, sky `#2e7cb2`, rose `#b5577e`, coral `#c0554e`, violet `#8064d1`, indigo `#5969ea`; slate unchanged |
| `src/components/ChatView.tsx` | Incoming bubbles, date chips, textarea get `border.ink-light` in dark (their outlines were 1.09:1 — invisible); my bubbles keep the dark line |
| `src/components/icons.tsx` | Art strokes split per fill: `bg.raised` shapes → `ink-light` in dark (tray, envelope, bubble, lens, BoltIcon bubble); `warm` shapes keep the dark line |
| `src/components/ConversationList.tsx` | Search input → `border.strong` in dark (idle input was 1.13:1) |
| 3 modals | All inputs + result boxes → `border.strong` in dark; selected-user Tags → `variant="subtle" colorPalette="brand"` (were faint gray outline pills, off-language) |

**Follow-up (user-reported, 2026-08-02):** the disabled-state 45% opacity wash made every disabled/loading cartoon button unreadable in both modes (send button, Create Group, Save, Sign In/Create Account, Chat) — replaced with explicit gray disabled tokens. **Root-cause fix:** Chakra v3.36 emits bare token-name references verbatim (`--chakra-colors-accent\.solid: brand.500` — invalid CSS → transparent backgrounds) — all reference-valued tokens rewritten as `var()` chains; the "white on white" bubbles/buttons were this bug, not styling. `layerStyle.card` dark border → `border.ink-light`; `bg.raised` dark → `#1f1f27`. **Graphite swap (user, 2026-08-02):** blue accent removed — `brand` scale redefined as neutral graphite (`#3a3a42` solid, `#55555f` dark-mode), amber is the only color; accent split into surface (`accent.solid`/`accent.hover`) vs text/icon (`accent.text`); read ticks → `success.solid` (green); outlines now follow fill luminance (my bubbles/buttons: canvas-white outline in light, `ink-light` in dark); focus ring → `border.accent`; `bg.active`/`accent.muted`/`brand.subtle` tints → graphite rgba.

### Feature: resizable conversation list ✅ (2026-08-02)

`SidebarResizeHandle.tsx` — draggable divider between the list and chat area. Pointer-capture drag (mouse/touch) + keyboard (←/→ arrows) via `role="separator"` with aria-valuenow; clamped 280–560px; persisted to `localStorage` (`chat-sidebar-width`); desktop-only (mobile sidebar is full-width). Lives at ChatPage.

### Refactor: readability & maintainability ✅ (2026-08-02)

A structural pass — no visual change — that thinned the two thickest files and killed duplication. `ChatPage` (594 → 290 lines) is now a thin shell: layout, modal orchestration, and a couple of `useMemo`s for preview strings. Its domain logic moved into focused hooks; the modals share extracted components.

**New hooks (`src/hooks/`)**
| File | Owns |
|---|---|
| `useMessages.ts` | Per-conversation message map — history fetch on conversation switch (read-watermark hydrated from participants) + live WS frame handling (`message_sent` → 'sent', `message_delivered` → 'delivered', `message_received` append + delivery ack, `message_read` → blue ticks, `error` → 'failed'). Exposes `appendOptimistic` for the send path. Uses latest-value refs so the fetch fires on id-change only (not on participant mutation) and the frame effect reads the freshest participants — the idiomatic "trigger on X, use latest Y" pattern, which also satisfies `react-hooks/exhaustive-deps` without suppression. |
| `usePreviewMap.ts` | Sidebar last-message backfill — one `GET ?limit=1` per conversation per session (module-scope guard survives StrictMode double-mount). Real history supersedes backfill. |
| `useUnreadMap.ts` | Sidebar unread dot + read watermark. `lastMessageMap` merges history + backfill; the dot lights only on an incoming message whose timeuuid ts > my watermark (optimistic NaN ts never lights it). Exposes `markWatermark` for optimistic clear-on-open. |
| `useUserSearch.ts` | Debounced user search shared by all 3 modals (was inlined 3×). |

**New components (`src/components/`)**
| File | Role |
|---|---|
| `SidebarHeader.tsx` | Brand mark + identity + theme toggle + new-chat/new-group/logout actions (was inline in ChatPage). |
| `UserSearchField.tsx` | Search input + result list shared by the 3 modals; supports per-row loading (`loadingUserId`). |
| `PrimaryButton.tsx` | The accent + cartoon primary button (was restyled inline 3×). |
| `SelectedUserChips.tsx` | Read-only selected-user chips (CreateGroup + GroupSettings). |
| `AppDialog.tsx` | Shared modal shell (pre-existing, now the single wrapper for all 3 modals). |

**New lib (`src/lib/messages.ts`)** — pure `buildMessageRows<T>()`: day separators + 60s same-sender clusters, generic over the message type so the caller keeps every field. Replaces the inline `useMemo` in `ChatView` (testable + reusable). `ClusterMessage.senderId` is optional to match `WSMessageData`.

**Modal refactor:** `CreateGroupModal` 225 → 130, `GroupSettingsModal` 267 → 155, `NewDirectChatModal` 162 → 78 — all now compose the shared pieces.

**Dead code removed:** 4 unused icon exports (`ChatIcon`, `PlusIcon`, `CloseIcon`, `InboxIcon`) — `icons.tsx` 307 → 280 lines.

### Frozen / out of scope 🧊

| Item | Why |
|---|---|
| `public/favicon.svg` | Planned redraw **dropped** — image file, untouchable per the no-images hard law |
| `public/_seed*.html` | Untracked debug scratch (disposition TBD) |

---

## 3. Progress

**Snapshot (2026-08-02):** the minimalist dual-tone base layer, the Cartoon Duo layer, AND the restraint pass are all implemented in the working tree. Static verification passed; only the **visual pass (user-driven)** and committing remain.

**Commit status:** the entire pivot (passes 2–4) is **UNCOMMITTED**. `git HEAD` is still the refined-dark era. Commit the base before pushing further.

**Leftovers cleaned during the pass:** `public/_dark-probe.html` deleted; `src/index.css` deleted; old raster assets (`hero.png`, `vite.svg`, `public/icons.svg`) already removed in the base pass.

**Verification status (2026-08-02, post-refactor):**
- ✅ `npx tsc -b` — no type errors
- ✅ `npx oxlint src` — clean (the 2 pre-existing `exhaustive-deps` warnings moved into `useMessages.ts` and were resolved with latest-value refs, not suppression)
- ✅ `npm run build` — builds clean (single ~649 kB chunk; code-splitting is the known future work)
- ✅ **Contrast: 15/15 computed pairs pass WCAG AA** (bubble text both themes, muted meta, status labels, borders, links, badges, icons)
- ✅ No raster image references; no emoji in UI copy; no `pop-in`/`wiggle` leftovers; `public/` holds only `favicon.svg` (frozen) + `_seed*.html` (untracked scratch)
- ⏳ **Visual pass — done by the user in the browser** (no browser automation, per user rule). Checklist: login/register (card, BoltIcon mark, button press-down), sidebar (wordmark, active item, bold unread names + warm dots, hovers), chat (clustered bubbles — one label/time per group, 16px text, calm bubbles, arrival fade, date chips, empty-state art), all 3 modals (borders/shadows/press, warm Admin badge), **light + dark** via toggle (dark = inverted accent: light-blue bubbles with navy text), mobile <768px

---

## 4. Audit record (2026-08-02) — why the restraint pass exists

The user judged the cartoon layer "AI slop." Three research agents read ~45 expert sources (design blogs, pattern libraries, motion/typography craft docs) to diagnose it; the audit found the same root cause every source names: **the brief was right but every cartoon ingredient was applied at maximum dosage with no hierarchy** — plus real WCAG failures (dark-mode bubble text at 2.82:1). Fixes applied per cluster:

1. **Contrast floor** — inverted dark accent (light blue + navy ink), tuned `text.muted`/`success`/`danger`, full-strength `border.accent`; every pair computed ≥4.5:1
2. **Shadow tiers** — shadows only on cards/buttons/active row; bubbles and hover rows calm
3. **Display-type zoning** — Fredoka only for wordmark + auth headings
4. **60s clustering** — thread reads as conversation, not log
5. **Dry copy + abstract art** — no "party", no 🚀, no faces/sparkles, art shrunk to seasoning
6. **Motion budget** — fade 160ms arrival, no wiggle/pop-in overshoot, one hero moment
7. **Small tells** — bold unread names, neutral group icon, tilt only on small avatars, explicit button tokens

**Second audit (dark mode, 2026-08-02):** the user reported dark mode still broken. Three parallel audit agents (contrast matrix, surface hierarchy, interaction states) + computed ratios found the root cause: the cartoon *mechanics* were built on `#000` — the same color as dark surfaces — so the 2px ink line (18:1 → 1.09–1.24:1) and hard shadows both collapsed, plus 9/10 avatar tiles failing AA and the transparent-subtle rendering bug. Fixes applied by six parallel agents with disjoint file ownership (see §2): two-tone ink (`border.ink-light`), light backlight shadows, strengthened states/seams, darkened avatar tiles, palette `subtle`/`fg` tokens, dark-mode borders on inputs/tags/art. Verified: tsc, oxlint (pre-existing only), build, 17-point contrast matrix.

**Key sources:** [Neubrutalism guide](https://neubrutalism.com/) (shadow tiers, hierarchy collapse) · [NN/g on neobrutalism](https://www.nngroup.com/articles/neobrutalism/) · [Duolingo design language](https://blakecrosley.com/guides/design/duolingo) (display type ≥48px, semantic color) · [Brainy: font pairing](https://brainy.ink/paper/font-pairing-guide) + [empty states](https://brainy.ink/paper/the-empty-state-is-your-product) (copy-first, "no sad mascots") · [Ethora chat patterns](https://ethora.com/blog/chat-app-ui-ux-design/) (60s clustering, log-file threads) · [72Technologies motion ratios](https://www.72technologies.com/blog/motion-ratios-ui-feel-cheap) (duration budget) · [uxskill: what is AI slop](https://uxskill.laithjunaidy.com/what-is-ai-slop.html) (the markers) · [Taste Profile: why AI UI looks generic](https://tasteprofile.io/blog/why-ai-generated-ui-looks-generic) (typicality bias; countersignals = tokens + nevers) · [GetIllustrations flat-illustration guide](https://getillustrations.com/blog/flat-vector-illustration-guide/) (one style, no mixing)
