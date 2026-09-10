# Perplexity report review — brief

Later card "Perplexity report review with readiness score". Carded early at the user's request (2026-09-10); build near the end, once most templates are populated and the Doc / Sheet layout has stopped changing.

## Goal

After a case is drafted and saved, Perplexity reads it from Drive and returns a review: every expected element present, macro / micro / synoptic / diagnosis mutually consistent, staging appropriate, house style respected, with concrete redrafts where wording can be improved — and a readiness score that says whether the report is fit to sign.

## Inputs (already saved by the app)

- `Sign-out cases` Sheet row: `accession, updated, status, template, parts, doc_url, doc_id, case_json`. `case_json` holds the structured field values per part, case options, LIS override text and per-block edits — the ground truth for consistency checks.
- Case Doc: the final text as it will be pasted into the LIS (generated blocks, with LIS-pasted macro / block key and edited blocks substituted).
- Template schema and generator from the app (which fields are required, showIf, staging protocol, snippet rules), and the QMH / CAP element list for synoptic templates.

## Checks (each yields findings with a severity and a suggested fix)

1. **Completeness** — every required element for the template present in the text; synoptic elements in protocol order; none left as `…`, `[ ]`, "describe", "see comment" without a comment; part letters continuous; block key covers every block referenced in microscopy.
2. **Macro ↔ micro ↔ synoptic reconciliation** — tumour size, number of lesions / polyps / cores, laterality, site, margin distances, node counts (examined / positive), specimen dimensions and pieces, "all embedded" vs blocks stated; LIS-pasted macro compared with the fields the app used.
3. **Staging** — recompute pT / pN / pM and stage group from the stated facts using the app's staging module and compare with the printed stage and the diagnosis line; descriptors (y, m, r) justified by the treatment / multiplicity fields; risk categories (GIST) and grades (Gleason arithmetic, Nottingham score, WHO grade) re-derived.
4. **Diagnosis line ↔ body** — every claim in the DIAGNOSIS block (type, grade, size, margins, stage, IHC summary, "molecular to follow") supported in microscopy / synoptic; nothing in the body missing from the diagnosis that house convention expects.
5. **Ancillary and follow-through** — IHC / molecular requested but no result or "to follow"; MMR / HER2 / PD-L1 hooks unfilled where the template expects them; snippet-worthy situations without the comment (e.g. fewer than 12 nodes, SDHB-deficient).
6. **House style** — British spelling (fetal kept), "Sections show…", microscopy + IHC in one paragraph, "no evidence of malignancy", no filler, uppercase organ lead in diagnosis lines, single-part case without "(A)", `x frozen section -` joiner for frozen lines.
7. **Redrafts** — for any paragraph flagged for wording, offer a rewrite that changes structure and flow (not word substitution), preserving facts.

## Readiness score

0–100 with bands: **Ready to sign** ≥ 90 and no blocking finding; **Minor edits** 75–89; **Reconcile before signing** 50–74; **Not ready** < 50 or any blocking finding. Blocking findings (score capped at 49): stage inconsistent with stated facts, contradictory measurements or counts between blocks, required synoptic element missing, diagnosis line contradicting the body, unresolved placeholder text. Weights (initial): completeness 25, reconciliation 25, staging 20, diagnosis ↔ body 15, ancillary 5, style 10. The rubric lives in this file and is versioned; the review output states the rubric version.

## Output

- A review Doc (`<accession> — review`) in the same folder: score and band at the top, findings grouped by check with the exact sentence quoted, the fix, and redrafts; a "Reconciliation table" (value, macro, micro, synoptic, diagnosis, status).
- Sheet columns appended: `review_score`, `review_band`, `review_at`, `review_url` (the app tolerates extra trailing columns; the Open dialog and Open Doc button can show the badge).
- Nothing is written into the case Doc itself; the pathologist applies changes in the app so the edits are saved with the case.

## Triggers

- On demand: "review S26-01234" in a Perplexity thread (or a **Review with Perplexity** button in the app that copies the accession and opens a prefilled thread; the app has no server, so the review runs in Perplexity, not in the browser).
- Optional scheduled sweep: every evening, review cases whose `status` is `ready` and not yet reviewed, so the morning sign-out list carries scores.

## Prerequisites and risks

- Most templates populated and their required-element lists stable; staging modules exposed as a small Node script the review can call (`node tools/restage.js case.json`) so the check uses the app's own rules rather than re-deriving them by hand.
- Case text passes through Perplexity — agree the scope (accessions only, no patient identifiers in Docs; the PHI guard already blocks names / HKID in free text).
- Score calibration: run the rubric over 20 signed cases first and adjust weights before showing bands in the app.
