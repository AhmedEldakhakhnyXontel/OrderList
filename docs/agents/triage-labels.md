# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

Labels are Beads labels, applied with `bd label add <id> <label>`; Beads creates them on first use, so nothing needs pre-creating.

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table. A `wontfix` bead is also closed: `bd close <id> --reason=wontfix`.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use.
