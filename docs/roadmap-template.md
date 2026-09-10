# Parsimonious App-Roadmap Template

A reusable skeleton for planning and running app work (Sign-out app or any successor) so that each request costs the minimum number of turns, tool calls and rebuilds. Copy the blocks below into a new roadmap or use them to reshape an existing one.

## Principles

1. One request, one increment. Every roadmap item must be finishable in a single build–test–ship cycle. If it cannot, split it before starting.
2. Ship in batches, verify per item. Tests run per item; deploy + publish + share run once per batch, not once per item.
3. Verify what changed, nothing else. Engine change → unit tests. UI change → tests + one browser pass. Docs change → nothing but a commit.
4. Roadmap first, code second. Any idea that is not being built in this turn goes into the roadmap as a card (below). Adding a card costs one small edit; building costs a cycle.
5. Golden outputs are frozen. Legacy fixtures must stay byte-identical unless an item explicitly says they change and why.

## Roadmap skeleton

```
# <App> roadmap

## Done            (collapsed; one line per shipped item with date + test count)
## Now             (at most 3 cards; the current batch)
## Next            (ordered; cards ready to build, acceptance written)
## Later           (ideas; one line each, no acceptance yet)
## Parked          (rejected or blocked; one-line reason)
```

Movement rule: an idea enters Later with one line. It only moves to Next when it has a card with acceptance criteria. Only Next items can be built. Now holds the current batch; when the batch ships, cards move to Done as single lines.

## Item card

```
### <Short name>                                  Size: S | M | L
Why:        one sentence (the clinical or workflow gap).
Change:     what the user sees or the engine does differently.
Untouched:  what must not change (fixtures, existing templates, Doc layout).
Accept:     2–4 checks that prove it works (a test name, a browser action, an output string).
Verify:     tests | tests + browser (light only) | tests + browser (light + dark)
Ship:       with batch | alone (only if blocking)
Depends on: <card> or none
```

Sizes and their budget:

| Size | Meaning | Budget | Verify tier |
|---|---|---|---|
| S | Text, wording, roadmap card, single field, one test | 1 turn, no browser | tests only |
| M | One template, one UI control, one engine hook | 1 turn, one browser pass | tests + browser (light) |
| L | New module (staging, Drive, importer), cross-cutting UI | split into 2–3 M cards first | per card |

An L card is never built as L. Split it, then build the M cards, ideally in one batch.

## Modular task-splitting rules

- Split by layer: engine (pure functions, tests) → UI (bindings, styles) → docs. Each layer is a card only if it can ship alone; otherwise they are one M card.
- Split by template, not by organ system: "prostate biopsy: inadequate core" is one card; "all prostate variants" is a Later line until each is carded.
- Split by data flow: a feature that touches engine output, preview, Copy and Google Doc is one card if the engine change carries all four (as with `out.source` / `edits`); it is two cards if the Doc needs its own logic.
- Reuse the existing seam. Before adding a mechanism, check whether an existing one (per-block override map, `mergeLis`, snippets, Checks) can carry the change. Extending a seam is S–M; adding a seam is L.
- Fixtures decide the split: if a change would alter a golden fixture, isolate that change in its own card with the reason in "Untouched".
- Independent cards batch; dependent cards chain. Batch size is capped at three cards per turn so a failure is easy to localise.

## Cost-capping rules

Per turn:
- Read only the files the card names. Grep for the seam; do not re-read whole files already understood.
- One build (`npm run build`) per batch, after all cards pass tests.
- One browser QA session per batch: start server once, run all card checks in one script, capture at most two screenshots (one light, one dark if styles changed), close the browser.
- One deploy + one publish per batch. Never redeploy for docs-only changes.
- One zip + one roadmap share per batch, both reusing the existing asset names.
- No subagents for bounded work on a known codebase; they cost more than a direct edit.
- Bash calls are batched: test + fixture check + build in one call; docs edit + commit in one call.

Per card:
- A test is written before the browser is opened. Browser QA confirms wiring, not logic.
- Screenshots are read only when a layout or theme change is involved; for behaviour checks print JSON from the page instead.
- Keep console output small: print counts, tags and the last 60 characters of a block, not whole reports.

Per session:
- Skip re-verifying what the previous batch already verified unless the card touches it.
- Skip re-stating known context (URLs, IDs, credentials) in chat; they live in the roadmap's Deployment section.

## Stop conditions

Stop and ship when:
- All Accept checks pass, tests pass, `git status --short tests/fixtures` is empty. Do not polish beyond the card.

Stop and report (no more attempts) when:
- The same fix fails twice. Write the failure and the two attempts into the card, move it to Parked, ship the rest of the batch.
- Deploy or publish fails twice. Report; do not loop.
- A browser check times out on an element that is disabled by design (record the expected state instead).

Stop and ask (one question, then wait) when:
- Two reasonable behaviours exist and the card does not choose (for example "replace" versus "append"). Ask before coding, never after.
- The card would change a golden fixture or house wording not covered by an explicit instruction.

Stop and re-card when:
- Scope grows mid-build. Finish the original card, write the growth as a new Later line, do not fold it in.
- A "quick" S card turns out to need a new seam. Promote it to L, split it, ship nothing from it this turn.

Never:
- Retry an identical failing command a third time.
- Rebuild, redeploy or republish because of a wording change in chat or docs.
- Open a browser to confirm an engine-only change that tests already cover.

## Batch flow (the whole cycle in one line each)

1. Pick ≤ 3 Next cards → move to Now.
2. Engine + tests for each card → `npm test`, fixture check.
3. UI for each card → one build → one browser script → read screenshots only if layout changed.
4. Docs: tick roadmap cards with date + test count; one README bullet per card.
5. One commit, one deploy, one publish, one zip share, one roadmap share.
6. Cards → Done as single lines. Report in five to eight lines: what shipped, how to use it, test count, what is still queued.

## Request phrasing that keeps cost low

| You say | What happens | Cost |
|---|---|---|
| "add X to the roadmap" | One Later line or one card; no code | lowest |
| "card X" | Writes acceptance criteria so X is buildable | low |
| "build X" | One card, tests, browser if UI, commit; no publish | medium |
| "build X, Y, Z and publish" | One batch, one cycle | medium (three cards for the price of one ship) |
| "publish" | Deploy + publish what is committed | low |
| "show the roadmap" | Shares the file; no rebuild | lowest |

Avoid "build X" followed by "publish" in separate turns when they can be one message; avoid asking for a screenshot of something a test already proves.

## Example (from this project)

```
### Editable final report                          Size: M
Why:        generated text is not always sufficient before authorising.
Change:     Edit / Done / Cancel / Revert per block; edits print in copy + Doc; saved with the case.
Untouched:  golden fixtures; LIS override behaviour; Checks driven by fields.
Accept:     edits.test.js passes; browser: Edit → type → Done shows "edited" tag; Revert restores; Copy diagnosis returns edited text.
Verify:     tests + browser (light + dark, styles changed)
Ship:       with batch
Depends on: LIS override seam (out.source)
```

Shipped in one cycle: 8 tests, one build, one browser script, two screenshots, one deploy, one publish.
