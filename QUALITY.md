# Quality

Maintained by [ever-better](https://github.com/isamu/ever-better). Numbers are rendered from
`.ever-better/state.json`; edits outside the notes block are overwritten on the next run.

- Phase: **drain**
- Frozen: 2026-08-16T16:06:54.139Z
- Open violations: **0**
- Rules improved since the ceiling: **0**
- Everything is at or below its ceiling.

## Worklist

Top to bottom. An unattended run works this list and nothing else.

- [x] **P0 diagnose** — taken 2026-08-16T16:06:21.186Z
- [ ] **P1 bootstrap** — 1 gap(s) still open
- [x] **P2 freeze** — frozen 2026-08-16T16:06:54.139Z
- [x] **P3 drain** — backlog empty
- [ ] **P4 tighten** — add the next rule tier, then freeze and drain again
- [ ] **P5 duplication and dead code** — report-only scans; extraction is judgment, not a threshold

## Ratchet

Ceiling is the count at the last freeze. It may fall and must never rise.

No rule violations recorded yet. Run `ever-better freeze`.

## Other counters

| Counter | Ceiling | Now |
| --- | ---: | ---: |
| eslint:warnings | 0 | 0 |

## Outstanding

### bootstrap

- [ ] **Missing package scripts: build** — CI runs scripts, not commands. A gate with no script behind it cannot be enforced.

### drain

- [ ] **No CLAUDE.md / AGENTS.md** — Draining is done by agents. Rules that live only in your head produce a different fix every session.

### tighten

- [ ] **2 strictness flags `strict` does not include are off** — Measured with `tsc --showConfig`, after every extends: exactOptionalPropertyTypes, noPropertyAccessFromIndexSignature. Type errors have no suppression mechanism, so enable them one at a time and measure the cost first.

## Notes

<!-- ever-better:notes:start -->
_Anything written between these markers survives a re-render._
<!-- ever-better:notes:end -->
