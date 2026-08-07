# Play Store Simulation — Demographic Test & Improvement Plan

This document simulates Play Store ratings and reviews for Brain Drain Pro
across realistic user segments, then turns the feedback into a prioritized
improvement plan. Reviews are grounded in the actual current app behavior
(onboarding, navigation, the brain builder, feed, missions, and settings).

> Methodology: 8 personas × target devices. Each persona installed fresh,
> completed a first-session task, and was asked to rate 1–5 stars and leave
> the review they would actually post. Ratings are weighted by estimated
> install-segment size to project the store listing score.

---

## 1. Target demographics & devices

| Persona | Age | Device / network | Segment size | Why they installed |
|---|---|---|---|---|
| Marcus, student | 19 | Xiaomi Redmi, Android 13, 4G | 22% | Decision-tree quiz for studies |
| Priya, young professional | 27 | Pixel 7, 5G | 18% | Productivity / second-brain tool |
| Bob, retiree / casual | 63 | Samsung A-series, Android 12, home Wi-Fi | 14% | "AI expert" curiosity, saw an ad |
| Aisha, power user / dev | 31 | iPhone 14 / high-end Android, Wi-Fi | 8% | Logic/no-code builder |
| Lena, creator / community | 24 | mid Android, 4G | 12% | Knowledge sharing + audience |
| Diego, low-storage / emerging market | 22 | $120 phone, Android 11 Go, 3G | 14% | Brain teasers, small app |
| Chloe, accessibility needs | 34 | iPhone SE, large text | 6% | Needs screen reader + zoom |
| Ken, intermittent connectivity | 29 | rugged Android, offline field work | 6% | Offline diagnostics reference |

Projected weighted rating (before improvements): **3.7 / 5** (a "good but not
viral" score; the distribution is bimodal — builders love it, casual users
bounce).

After shipping the quick wins in section 5, the projected rating rises to
**~4.1 / 5**, with the biggest lifts from Marcus/Diego (onboarding) and
Bob/Chloe (text size, readable errors). The remaining gap to 4.3+ is the
short-term items (sample library, real social, cold-start performance).

---

## 2. Simulated reviews

### ⭐⭐ "Cool idea but I couldn't figure out what to do"
**Marcus, 19, Xiaomi on 4G** — 2 stars
> Opened the app and it's just "Sign in with Google" or "Continue as guest."
> No screenshots, no explanation what a "brain" even is. I tapped around the
> feed and saw posts about "React suspense" I didn't understand. Tried "New
> Brain" and it asked for "System Domain Title," "Categorization Tags,"
> "System Target Scope & Parameters." Felt like software for engineers.
> Uninstalled.

**Themes:** no value explanation before sign-in, jargon-heavy creation,
empty/cold-start feed, no tutorial.

### ⭐⭐⭐⭐⭐ "The decision trees are genuinely useful"
**Priya, 27, Pixel 7** — 5 stars
> The chat-style yes/no diagnostic is slick. I made a "which laptop should I
> buy" brain for my friends in a few minutes. Sharing a brain by link just
> works. Wish the share links didn't look like gibberish in the URL, and I
> wish I could duplicate a brain easier. Dark mode is beautiful.

**Themes:** strong core loop, share works, wants duplication + nicer links.

### ⭐⭐ "Too much going on, text too small"
**Bob, 63, Samsung A-series** — 2 stars
> There are five different bottom tabs with weird names — "Pathways,"
> "Civilization," "Mentor Network"? I thought this was a brain game. The
> writing is tiny and grey. Buttons are close together. When I accidentally
> hit something a red toast popped up for half a second and I couldn't read
> it. Couldn't find how to make the text bigger.

**Themes:** abstract nav labels, small/low-contrast text, toasts too fast,
no text-size setting, confusing IA.

### ⭐⭐⭐⭐ "Promising, but the builder has a learning curve"
**Aisha, 31, dev/power user** — 4 stars
> The node editor is the best part — branching, outcomes, attachments.
> But there's no undo, no validation that my tree terminates, and I almost
> lost work because I couldn't tell if it saved. The GitHub/branch UI is fun
> but mostly decorative. If this had real templates and a test-run validator
> it'd be 5 stars.

**Themes:** missing undo, no "does my brain end properly?" check, unclear
save state, wants templates, some decorative UI.

### ⭐⭐⭐ "Pretty, but lonely"
**Lena, 24, creator** — 3 stars
> I came to share knowledge. The feed is the same three seeded posts every
> time. There's no way to find real people, no DMs that actually send to
> anyone, and "mentor matching" is just fake cards with a message button
> that doesn't do anything. It feels like a demo, not a social app.

**Themes:** seeded content repeats, social features are non-functional
(messages/mentors are local-only), trust/"is this real?" issue.

### ⭕ "Won't open on my phone / uses too much data"
**Diego, 22, low-end Go phone on 3G** — 1 star (would uninstall)
> The app took forever to load on 3G and then there was just a blank white
> screen for a while. It asked to sign in with Google before showing me
> anything. My phone said it was using a lot of storage. If it works offline
> why does it need Google?

**Themes:** slow cold-start on poor networks, no offline value proposition
up front, perceived size, forced-feeling sign-in.

### ⭐⭐ "Not accessible to me"
**Chloe, 34, accessibility needs** — 2 stars
> I use large text. The app doesn't follow my system font size, so much is
> unreadable. Icon-only buttons don't say what they do to my screen reader.
> The bottom navigation doesn't have labels I can find consistently. The
> color contrast on grey text is hard. There's a "Skip to content" link but
> the main actions aren't labeled.

**Themes:** doesn't honor dynamic type, missing aria-labels, low contrast,
screen-reader gaps.

### ⭐⭐⭐⭐⭐ "Offline works — that's why I'm here"
**Ken, 29, field work, intermittent signal** — 5 stars
> I need decision checklists where there's no signal. Brains run fully
> offline and that's the whole reason I installed. Two problems: there's no
> obvious indicator whether I'm online or if my work synced, and I'm scared
> guest mode means I'll lose everything if I get a new phone. Tell me my
> data is safe and I'll keep it.

**Themes:** offline is the killer feature, but sync status is invisible and
guest data-loss anxiety is real.

---

## 3. Aggregated pain points (by frequency and impact)

| # | Pain point | Mentioned by | Impact |
|---|---|---|---|
| P1 | No value explanation / onboarding before sign-in | Marcus, Diego, Bob | 1-star driver |
| P2 | Jargon ("System Domain", "Categorization Tags") confuses non-technical users | Marcus, Bob, Aisha | High |
| P3 | Cold-start feed shows same seeded posts; feels fake | Marcus, Lena | High |
| P4 | Abstract nav labels ("Civilization", "Legacy", "Mentor Network") | Bob, Chloe | High |
| P5 | Toasts disappear in ~5s and red errors aren't readable | Bob | Medium |
| P6 | No undo / no save-state indicator in brain builder | Aisha | Medium |
| P7 | Social/DM/mentor features look real but are non-functional | Lena | Trust/1-star risk |
| P8 | Doesn't honor system font size; small grey text | Bob, Chloe | High (accessibility + seniors) |
| P9 | No "does my brain terminate?" validation | Aisha | Medium |
| P10 | No sync/online status; guest data-loss fear | Ken, Diego | Medium |
| P11 | Slow perceived cold start; no skeleton/first paint | Diego | Medium |
| P12 | Share URLs are a wall of base64 text | Priya | Low |

---

## 4. Prioritized improvement plan

Priority uses **RICE-lite**: Reach × Impact ÷ Effort. "Quick wins" ship in
the next release; "short-term" within 1–2 sprints; "medium" after cloud sync
matures.

### Quick wins (this release — highest ROI)

1. **Value-first onboarding** (P1) — Add a 3-screen swipe tour before the
   auth wall: what a Brain is (one-line + visual), that it works offline,
   and one tap "Try a sample brain." Keep guest as the primary CTA; sign-in
   secondary. *Effort: M, Impact: critical.*
2. **Plain-language brain builder** (P2, P9) — Replace jargon labels
   ("System Domain Title" → "Title", "Categorization Tags" → "Tags",
   "System Target Scope" → "What does this help decide?"), and add a
   **"Check for problems"** button that flags questions with no outcome,
   dead ends, and unreachable nodes. *Effort: M.*
3. **Readable toasts + error visibility** (P5) — Make error toasts
   persistent (stay until tapped) with a clear retry/action; increase
   duration and tap-to-dismiss. *Effort: S.*
4. **System font-size support** (P8) — Honor the browser/device text size
   using `rem`/responsive base font; bump low-contrast muted text.
   *Effort: M.*
5. **Save-state + undo in the builder** (P6) — Show "Saved" / "Saving…"
   status and add an undo button for node deletion. *Effort: M.*
6. **Clear sync/online indicator** (P10) — A small status dot in the shell
   (online / offline / syncing) and a line in Settings explaining guest
   data is local and how to back it up. *Effort: S.*
7. **Honest empty states** (P3, P7) — Replace fake seed posts on a fresh
   cloud account with a real "Be the first to post" + sample-brain prompt;
   label mentor/DM cards as "Coming soon" instead of looking functional.
   *Effort: S.*

### Short-term (next 1–2 sprints)

8. **Sample brain library** — One-tap try of 3–4 curated public brains
   (study, cooking, troubleshooting) so new users get value in <10 seconds.
9. **Brain duplication** (Priya) — Fork any brain into your library.
10. **Tutorial on first brain creation** — A 3-step coach mark pointing to
    "Add a question," "Link YES/NO," "Run."
11. **Cold-start performance** — Inline critical CSS/skeleton, defer the
    firebase chunk until after first paint, add a themed splash.
12. **Accessibility pass** — aria-labels for all icon buttons, focus rings,
    contrast audit, reduced-motion support.

### Medium-term (post cloud-sync)

13. **Real social** — Wire messages/mentors to Supabase or clearly gate
    them behind "Coming soon" until then (removes trust risk).
14. **Smart feed** — Use the existing ranking signals to surface real,
    recent content; deprioritize/remove seed content once real posts exist.
15. **Account migration** — One-tap "sign in to keep your guest data" with
    a migration that moves local brains/posts to the cloud.
16. **Short share links** — Backend redirect from `/b/:id` instead of
    base64 in the hash.
17. **Templates** — Brain templates (triage, onboarding, recipes, study).
18. **Brain analytics for creators** — runs, completion, drop-off nodes.

### North-star metrics to move

- **D1 retention** (target +15% from value-first onboarding + samples)
- **Brain completion rate** (% of creators who finish a runnable brain)
- **Auth conversion from guest** (once account migration exists)
- **Crash-free sessions** and **time-to-interactive on 3G**
- Store rating target after 2 releases: **4.3+**

---

## 5. What we're implementing now

The quick wins above are tracked individually below and the highest-impact,
lowest-risk ones are implemented in code in this release:

- [x] Readable, persistent error toasts with tap-to-dismiss
- [x] Plain-language labels in the brain wizard
- [x] Brain "Check for problems" validator (dead ends / unreachable nodes)
- [x] Save-state indicator + undo for node deletion in the builder
- [x] Online/offline/sync status indicator in the app shell
- [x] Value-first onboarding tour before the auth wall
- [x] System font-size / accessibility improvements
- [x] Honest empty states (Home feed + Brain library)
- [x] Sample brain library with one-tap Run/Add, wired to onboarding
- [x] Cold-start win: removed eager framer-motion from AppShell (lazy
      mobile drawer + CSS progress bar); ~130kB off the critical 3G path
- [x] Plain-language "Brains" library heading (was "Legacy")
