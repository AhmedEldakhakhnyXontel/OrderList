# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

Freshly generated from `create-expo-app` (default template). Everything under `src/` is starter/demo code (Home/Explore tabs, "Expo Starter" branding) — expect it to be replaced. `npm run reset-project` moves the starter code to `example/` and leaves a blank `src/app/`.

Stack: Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 (strict). Package manager is **npm** (`package-lock.json`), so use `npx`, not `bunx`.

## Commands

```bash
npm start            # expo start (also: npm run android | ios | web)
npm run lint         # expo lint
npx tsc --noEmit     # typecheck
npx expo export      # bundle every platform; catches Metro resolution errors tsc misses
```

There is no test runner configured. If tests are needed, follow the Expo "Unit Testing with Jest" guide rather than assuming a setup exists.

Secrets and config values live in EAS environment variables; pull them into the gitignored `.env.local` with `npx eas-cli@latest env:pull --environment development`. Variables prefixed `EXPO_PUBLIC_` are inlined into the app bundle, so never give a real secret that prefix (the Firebase web config is public by design). Never commit or print a value.

## Architecture

- **Routing**: Expo Router, entry is `expo-router/entry`. `src/app/_layout.tsx` is the root layout: it holds the splash screen (`preventAutoHideAsync` + `AnimatedSplashOverlay`), the navigation `ThemeProvider`, and renders `AppTabs`.
- **Platform-split tabs**: tab navigation is defined in `src/components/app-tabs.tsx` (native, `NativeTabs` from `expo-router/native-tabs`) and `src/components/app-tabs.web.tsx` (web, headless `expo-router/ui` `Tabs`). Adding/removing a tab means editing **both** files. Note the trigger names differ: native uses the route name (`index`), web uses an arbitrary name plus `href` (`home` → `/`).
- **`.web.tsx` / `.web.ts` overrides**: Metro picks the platform-specific file automatically (also used by `animated-icon` and `use-color-scheme`). When changing one variant, check whether its sibling needs the same change.
- **Theming**: colors, fonts, spacing scale and layout constants live in `src/constants/theme.ts` (light/dark `Colors`, `Spacing`, `MaxContentWidth`, `BottomTabInset`). Use `useTheme()` (`src/hooks/use-theme.ts`) or `ThemedText`/`ThemedView` rather than hard-coding colors. `theme.ts` also imports `src/global.css`, which defines the CSS font variables used on web.
- **Path aliases** (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.

## Config notes (`app.json`)

- `experiments.reactCompiler: true` — the React Compiler auto-memoizes; don't add `useMemo`/`useCallback`/`React.memo` by reflex.
- `experiments.typedRoutes: true` — route hrefs are type-checked; generated types live in `.expo/types` (created by `expo start`).
- `web.output: "server"` — web is server-rendered, so API routes (`+api.ts`) are available and code must not touch browser-only globals at module scope.
- URL scheme is `orderlist`.

## Git workflow

These rules grant the authority to commit, push and merge that the Beads "Conservative" profile in `AGENTS.md` otherwise withholds.

- **`main` is protected and human-only**: never commit to, push to, merge into, or open a PR against `main`.
- **`develop` is the base branch**: all ticket work branches off it and lands on it through a merged PR. The main checkout stays on `develop` and holds no ticket work.
- **One worktree per ticket**: `git worktree add .worktrees/<ticket-id> -b <type>/<ticket-id>-<short-slug> develop` (e.g. `.worktrees/OrderList-df2.1` on `feat/OrderList-df2.1-name-entry`; `.worktrees/` is gitignored). Then copy the gitignored `.env.local` and `expo-env.d.ts` in from the main checkout and run `npm ci` in the worktree.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<optional scope>): <summary>`, with types such as `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- **Micro commits**: when a change is large or spans more than one ticket, split it into small commits, one logical change (and at most one ticket) each, so each can be reviewed and reverted on its own. Don't run the gates on each micro commit; run them on the branch tip and on the merge result before it lands on `develop`.
- **Gates**: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npx expo export`, run in the worktree.
- **Landing**: when a ticket is done, the main conversation reads the worker's result and spawns the `closer` subagent (`.claude/agents/closer.md`) with the worktree path and the ticket id, one closer at a time so merges into `develop` stay serialised. The closer pushes the branch, merges it into `develop` through a PR once the gates pass, closes the bead, and spawns the `cleaner` (`.claude/agents/cleaner.md`) to remove the worktree.
- **Never delete branches**, locally or on the remote, including after a merge.
- **Parallel agents**: run at most 3 at once.

## Documentation

- `docs/nonfunctional-decisions.md` logs non-functional decisions, newest first, as date, decision, and why: stack, libraries, tooling, AI skills/plugins. Add an entry whenever such a choice is made between alternatives. Decisions that shape the code (architecture, components, behaviour) go in `docs/adr/` instead. Create the file with its first entry, not before.

## Agent skills

### Issue tracker

Issues live in Beads (`bd` CLI, local Dolt DB in `.beads/`). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, applied as Beads labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
