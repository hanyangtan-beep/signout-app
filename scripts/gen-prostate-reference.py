#!/usr/bin/env python3
"""Merges the Gleason reference galleries into schemas/prostate_biopsy.json.

Re-runnable and in place: only the `reference` key of the galleried fields is rewritten, so the
hand-maintained prostate schema is otherwise untouched. Criteria text comes from
prostate_reference_text.py; images and their credits come from the manifest
assets/reference/prostate/images.json ({field, group, src, caption, credit, license, url}),
written by the crop pipeline. Groups with no licensed image ship as criteria text only.
"""
import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from prostate_reference_text import REFERENCE_TEXT  # noqa: E402

schema_path = ROOT / "schemas" / "prostate_biopsy.json"
schema = json.loads(schema_path.read_text(encoding="utf-8"))
by_id = {f["id"]: f for f in schema["fields"]}

manifest_path = ROOT / "assets" / "reference" / "prostate" / "images.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []

ALLOWED = ("CC0", "CC BY")  # CC BY-SA is covered by the CC BY prefix; NC / ND are rejected below
n_images = 0
for fid, ref in REFERENCE_TEXT.items():
    f = by_id[fid]
    ref = copy.deepcopy(ref)
    headings = [g["heading"] for g in ref["groups"]]
    for im in [m for m in manifest if m["field"] == fid]:
        assert im["group"] in headings, f"{fid}: image group {im['group']!r} unknown"
        for k in ("src", "caption", "credit", "license", "url"):
            assert im.get(k), f"{fid}: image {im.get('src')} lacks {k}"
        assert im["license"].startswith(ALLOWED), f"{fid}: {im['src']} licence {im['license']!r}"
        assert "NC" not in im["license"] and "ND" not in im["license"], f"{fid}: {im['src']} is NC/ND"
        assert (ROOT / im["src"]).exists(), f"missing image file {im['src']}"
        g = next(g for g in ref["groups"] if g["heading"] == im["group"])
        g.setdefault("images", []).append({k: im[k] for k in ("src", "caption", "credit", "license", "url")})
        n_images += 1
    f["reference"] = ref

schema_path.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
illustrated = sum(1 for fid in REFERENCE_TEXT for g in by_id[fid]["reference"]["groups"] if g.get("images"))
print(f"wrote {schema_path.relative_to(ROOT)} ({len(REFERENCE_TEXT)} galleries, "
      f"{illustrated} illustrated groups, {n_images} images)")
