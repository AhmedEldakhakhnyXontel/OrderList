# Issue tracker: Beads

Issues and specs for this repo live in Beads (`bd` CLI, local Dolt DB in `.beads/`). Run `bd prime` for the full command reference. There is no git remote: never push, pull or run remote sync.

## Conventions

- A spec is an epic: `bd create --type=epic --title="..." --description="<spec body>"`
- Implementation tickets are one child issue per ticket: `bd create --type=task --parent=<epic-id> ...`
- Triage state is a label (see `triage-labels.md`): `bd label add <id> <label>` / `bd label remove <id> <label>`
- Comments: `bd comments add <id> "..."`; read with `bd comments <id>`
- Never use `bd edit` (it opens an interactive editor)

## When a skill says "publish to the issue tracker"

`bd create --title="..." --description="..." --type=<task|bug|feature|epic> --priority=<0-4>`, adding `--parent=<id>` / `--labels=<label>` as needed. Report the returned ID.

## When a skill says "fetch the relevant ticket"

`bd show <id>`, plus `bd comments <id>` for discussion. The user normally passes the ID directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is an epic with one **child** issue per ticket.

- **Map**: an epic whose description holds the Notes / Decisions-so-far / Fog body; update with `bd update <epic-id> --description="..."`.
- **Child ticket**: `bd create --parent=<epic-id> --labels=<research|prototype|grilling|task>` with the question in the description.
- **Blocking**: `bd dep add <ticket> <blocker>` (or `--deps=blocked-by:<id>` at create).
- **Frontier**: `bd ready --parent=<epic-id> --unassigned`; first result wins.
- **Claim**: `bd update <id> --claim` before any work.
- **Resolve**: `bd comments add <id> "## Answer ..."`, `bd close <id>`, then append a gist + ID to the map's Decisions-so-far.
