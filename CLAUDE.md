# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

Freshly generated from `create-expo-app` (default template). Everything under `src/` is starter/demo code (Home/Explore tabs, "Expo Starter" branding) — expect it to be replaced. `npm run reset-project` moves the starter code to `example/` and leaves a blank `src/app/`.

Stack: Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 (strict). Package manager is **npm** (`package-lock.json`), so use `npx`, not `bunx`.

## Commands

```bash
npm start            # expo start (also: npm run android | ios | web)
npm run lint         # expo lint — no ESLint config is committed yet; first run scaffolds one
npx tsc --noEmit     # typecheck
```

There is no test runner configured. If tests are needed, follow the Expo "Unit Testing with Jest" guide rather than assuming a setup exists.

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
- **`develop` is the base branch** for all feature work.
- **One worktree per ticket**: for each Beads ticket, create a branch from `develop` in its own git worktree, named `<type>/<ticket-id>-<short-slug>` (e.g. `feat/OrderList-df2.1-name-entry`).
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<optional scope>): <summary>`, with types such as `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- **Push** the ticket branch to the remote. **Never delete branches**, locally or on the remote, including after a merge.
- **Always open a PR** from the ticket branch into `develop` (`gh pr create --base develop`). You may merge it yourself once lint, typecheck and tests pass, using `gh pr merge` without `--delete-branch`.

## Agent skills

### Issue tracker

Issues live in Beads (`bd` CLI, local Dolt DB in `.beads/`). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, applied as Beads labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
