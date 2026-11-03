# Common practices

How agents work in this repo, with the reason for each practice. `CLAUDE.md` holds the short rules; this file explains them.

## Manual checks never block landing

When a ticket's gates and automated tests pass, it lands right away: the closer merges it into `develop`, closes the bead and cleans the worktree. A check only the person can do, like trying a screen on web or on the Android device, comes afterwards as an optional step with exact instructions.

**Why:** waiting for the person holds every ticket that depends on this one. The person can try the change while the next tickets are built. If the check finds a problem, it becomes a new bug bead.
