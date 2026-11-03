# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

Started from `create-expo-app` (default template). The starter screens are gone and `src/` is app code; the theming helpers and the splash overlay (`animated-icon`) are kept from the template.

Stack: Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 (strict). Package manager is **npm** (`package-lock.json`), so use `npx`, not `bunx`.

## Commands

```bash
npm start            # expo start (also: npm run android | ios | web)
npm run lint         # expo lint
npx tsc --noEmit     # typecheck
npx expo export      # bundle every platform; catches Metro resolution errors tsc misses
npx firebase <cmd>   # Firebase CLI: the firebase-tools devDependency, not on the global PATH
```

There is no test runner configured. If tests are needed, follow the Expo "Unit Testing with Jest" guide rather than assuming a setup exists.

Secrets and config values live in EAS environment variables; pull them into the gitignored `.env.local` with `npx eas-cli@latest env:pull --environment development`. Variables prefixed `EXPO_PUBLIC_` are inlined into the app bundle, so never give a real secret that prefix (the Firebase web config is public by design). Never commit or print a value.

Firestore's production-mode Rules deny the client SDK, but the saved `firebase login` is a project owner, and owner tokens skip Rules on the Firestore REST API, so data can be checked from a Node script. The CLI has no command that reads a document; get the token from firebase-tools' own modules: `requireAuth(getGlobalDefaultAccount())` (`lib/requireAuth`, `lib/auth`), then `getAccessToken()` (`lib/apiv2`).

## Architecture

- **Routing**: Expo Router, entry is `expo-router/entry`. `src/app/_layout.tsx` is the root layout: it holds the splash screen (`preventAutoHideAsync` + `AnimatedSplashOverlay`), the navigation `ThemeProvider` and `MemberProvider`, and renders a `Stack` that sets each route's header title.
- **Routes**: `index` is the Order screen; it redirects to `/name` while no Member is remembered. `name` asks for the Member's name, remembers it, and returns with `router.dismissTo('/')`. The current Member comes from `useMember()` (`src/hooks/use-member.tsx`), persisted in AsyncStorage.
- **`.web.tsx` / `.web.ts` overrides**: Metro picks the platform-specific file automatically (used by `animated-icon` and `use-color-scheme`). When changing one variant, check whether its sibling needs the same change.
- **Theming**: colors, fonts, spacing scale and layout constants live in `src/constants/theme.ts` (light/dark `Colors`, `Spacing`, `MaxContentWidth`). Use `useTheme()` (`src/hooks/use-theme.ts`) or `ThemedText`/`ThemedView` rather than hard-coding colors. `theme.ts` also imports `src/global.css`, which defines the CSS font variables used on web.
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
- **One worktree per ticket**: `git worktree add .worktrees/<ticket-id> -b <type>/<ticket-id>-<short-slug> develop` (e.g. `.worktrees/OrderList-df2.1` on `feat/OrderList-df2.1-name-entry`; `.worktrees/` is gitignored). Then copy the gitignored `.env.local` and `expo-env.d.ts` in from the main checkout and run `npm install` in the worktree.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<optional scope>): <summary>`, with types such as `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- **Micro commits**: when a change is large or spans more than one ticket, split it into small commits, one logical change (and at most one ticket) each, so each can be reviewed and reverted on its own. Don't run the gates on each micro commit; run them on the branch tip and on the merge result before it lands on `develop`.
- **Gates**: `npm install`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npx expo export`, run in the worktree. `npm test` runs Jest inside the Firestore emulator, so it needs Java, and the emulator's port must be free (two test runs at once fail).
- **Landing**: when a ticket is done, the main conversation reads the worker's result and spawns the `closer` subagent (`.claude/agents/closer.md`) with the worktree path and the ticket id, one closer at a time so merges into `develop` stay serialised. The closer pushes the branch, merges it into `develop` through a PR once the `gater` (`.claude/agents/gater.md`) reports the gates pass, closes the bead, and spawns the `cleaner` (`.claude/agents/cleaner.md`) to remove the worktree.
- **Manual checks never block landing**: once a ticket's gates and automated tests pass, land it without waiting for the person's manual check, so dependent tickets unblock. Then give the person the manual check as an optional step with exact instructions. See `docs/common-practices.md`.
- **Recap**: after each closer finishes (landed or halted) and after any worker fails, the main conversation spawns the `recapper` (`.claude/agents/recapper.md`) with the session's ticket ids and a note of what happened, and shows its recap to the person.
- **Never delete branches**, locally or on the remote, including after a merge.
- **Parallel agents**: run at most 3 at once.
- **`npm install`, never `npm ci`**: `npm install` reuses the modules already installed instead of deleting them first. When a merged branch changed `package.json` or `package-lock.json`, the closer runs `npm install` in the main checkout right after updating `develop`, so its `node_modules` match.

## Documentation

- `docs/nonfunctional-decisions.md` logs non-functional decisions, newest first, as date, decision, and why: stack, libraries, tooling, AI skills/plugins. Add an entry whenever such a choice is made between alternatives. Decisions that shape the code (architecture, components, behaviour) go in `docs/adr/` instead. Create the file with its first entry, not before.

## Agent skills

### Issue tracker

Issues live in Beads (`bd` CLI, local Dolt DB in `.beads/`). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, applied as Beads labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
