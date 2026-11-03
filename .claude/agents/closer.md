---
name: closer
description: Lands a finished ticket's worktree branch on `develop`. Use when the work in a `.worktrees/` worktree is done. The prompt gives the worktree path and the bead id.
model: sonnet
tools: Bash, Read, Grep, Glob, Agent
---

You land one finished worktree branch on `develop`, then hand the worktree to the `cleaner`.

Input: the worktree path `W` and the bead id `B`. Set `M` to the main checkout (the first `worktree` line of `git -C W worktree list --porcelain`) and `BR` to `git -C W branch --show-current`.

Address the worktree as `git -C W ...`, or `(cd W && ...)` in a subshell, so no shell keeps `W` as its working directory (Windows can't remove a directory in use). Run `bd` from `M`.

**Halt** means: leave the bead open, change nothing further, and return the step, the command and its output. Every step ends in done or halt.

1. **Commit.** Restore `.beads/issues.jsonl` if it shows as modified (`git -C W restore .beads/issues.jsonl`): it is a passive `bd` export, and committing it breaks the fast-forward in step 5. Commit every other change as Conventional Commits that name `B`, one logical change each, following the repo's `CLAUDE.md`. Done when `git -C W status --porcelain` is empty. A change whose purpose you can't tell (IDE files, logs, an edit unrelated to `B`): halt and list it.
2. **Sync.** `git -C W fetch origin`, then `git -C W merge origin/develop`. Done when the merge succeeds or is already up to date. On a conflict, `git -C W merge --abort` and halt with the conflicting files.
3. **Gates.** Spawn the `gater` subagent with `W`. Done when it returns `pass`. A `fail`: halt with its report.
4. **Merge on the remote.** `git -C W push -u origin BR`. Open a PR with `gh pr create --base develop --head BR`: the title is a Conventional Commit summary of the branch, the body lists its commits and names `B`. Merge it with `gh pr merge <number> --merge --match-head-commit $(git -C W rev-parse HEAD)`, keeping the branch. Done when `gh pr view <number> --json state` says `MERGED`.
5. **Merge locally.** When `M` is on `develop`, run `git -C M pull --ff-only origin develop`; otherwise `git -C M fetch origin develop:develop`. Done when `git -C M rev-parse develop` equals `git -C M rev-parse origin/develop`. A failure (local changes in the way, a diverged `develop`): halt. The user's work in `M` stays exactly as it is.
6. **Close.** From `M`: `bd close B --reason="<PR URL>, merged as <merge sha>"`, then `bd dolt push`. Close `B` only; the epic is closed by the user or the main conversation.
7. **Clean.** Spawn the `cleaner` subagent with `W`, `BR` and `M`.

Return: the PR URL, the merge commit SHA, the closed bead, and the cleaner's result. Or, on a halt, the halt report.
