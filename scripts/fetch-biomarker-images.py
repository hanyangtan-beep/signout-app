#!/usr/bin/env python3
"""Download and resize curated Wikimedia Commons biomarker reference gallery JPEGs (<= 900px, <= 150 kB).

Resumable: skips files already present and <= 150 kB.
Run locally from the repository root:
    python3 scripts/fetch-biomarker-images.py
"""
import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "SignoutAppBiomarkerGalleryFetcher/1.0 (https://github.com/hanyangtan; non-commercial pathology app)"

# Each unique Wikimedia Commons File: page -> list of destination paths under assets/reference/
SOURCES = {
    "File:HER2_FISH.jpg": [
        "assets/reference/breast_biomarkers/her2_fish_amp.jpg",
        "assets/reference/fish_tests/her2_fish_amp.jpg",
    ],
    "File:Hibridación_in_situ_fluorescente_del_gen_Her2_(FISH_del_gen_Her2;_5_señales).jpg": [
        "assets/reference/breast_biomarkers/her2_fish_equivocal.jpg",
    ],
    "File:Positive_immunohistochemistry_of_HER2_in_invasive_breast_cancer.jpg": [
        "assets/reference/breast_biomarkers/her2_ihc_3plus.jpg",
        "assets/reference/colon_her2/her2_ihc_3plus.jpg",
        "assets/reference/stomach_biomarkers/her2_ihc_3plus.jpg",
    ],
    "File:HER2_immunohistochemistry_with_2_plus_pattern.png": [
        "assets/reference/colon_her2/her2_ihc_2plus.jpg",
    ],
    "File:Patterns_of_p53_expression,_original.png": [
        "assets/reference/gyn_biomarkers/p53_patterns.jpg",
    ],
    "File:Stomach_Metastatic_Breast_Carcinoma,_IHC_for_Estrogen_Receptor_(5610737866).jpg": [
        "assets/reference/gyn_biomarkers/er_ihc_positive.jpg",
    ],
    "File:Colorectal_adenocarcinoma_with_MMR_-_MLH1_--_high_mag.jpg": [
        "assets/reference/mmr_msi/mlh1_loss.jpg",
    ],
    "File:Immunohistochemistry_of_indeterminate_expression_of_MSH-6.jpg": [
        "assets/reference/mmr_msi/msh6_indeterminate.jpg",
    ],
    "File:Negative,_low_and_high_PD-L1_expression_by_immunohistochemistry.png": [
        "assets/reference/pdl1_ihc/pdl1_levels.jpg",
        "assets/reference/stomach_biomarkers/pdl1_levels.jpg",
    ],
    "File:Responsive,_non-responsive_and_ambiguous_real-time_PCR_curves..png": [
        "assets/reference/dna_pcr_tests/qpcr_curves.jpg",
    ],
    "File:Qpcr-melting.png": [
        "assets/reference/dna_pcr_tests/qpcr_melting.jpg",
    ],
    "File:QPCR_results_-_amplification_plot_and_melting_curves.png": [
        "assets/reference/rna_rtpcr_tests/rtpcr_curves.jpg",
    ],
    "File:Hibridación_in_situ_fluorescente_con_reordenamiento_para_ALK_(FISH_del_gen_ALK).jpg": [
        "assets/reference/fish_tests/alk_breakapart.jpg",
    ],
    "File:Sequence_By_Synthesis.png": [
        "assets/reference/ngs_tests/sbs_sequencing.jpg",
    ],
    "File:RAGE-Seq_Workflow.jpg": [
        "assets/reference/ngs_tests/ngs_workflow.jpg",
    ],
}


def fetch_with_retry(url: str, timeout: int = 45) -> bytes:
    for attempt in range(5):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 4:
                wait = 3 * (attempt + 1)
                print(f"  HTTP {e.code} — retrying in {wait}s...")
                time.sleep(wait)
                continue
            raise


def commons_image_url(title: str) -> str:
    params = urllib.parse.urlencode({
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": "900",
        "format": "json",
    })
    data = json.loads(fetch_with_retry(f"https://commons.wikimedia.org/w/api.php?{params}", timeout=30).decode("utf-8"))
    pages = data["query"]["pages"]
    page = next(iter(pages.values()))
    info = page["imageinfo"][0]
    return info.get("thumburl") or info["url"]


def download_and_resize(url: str, out_jpg: str) -> None:
    os.makedirs(os.path.dirname(out_jpg), exist_ok=True)
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        raw_path = tmp.name
        tmp.write(fetch_with_retry(url, timeout=45))
    try:
        for dim in (900, 760, 640, 540):
            for q in (82, 70, 58, 46):
                subprocess.run(
                    ["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(q), "-Z", str(dim), raw_path, "--out", out_jpg],
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                if os.path.getsize(out_jpg) <= 150 * 1024:
                    return
        raise RuntimeError(f"{out_jpg} still exceeds 150 kB ({os.path.getsize(out_jpg)} bytes)")
    finally:
        if os.path.exists(raw_path):
            os.unlink(raw_path)


def main() -> None:
    total = 0
    for title, dests in SOURCES.items():
        primary = os.path.join(ROOT, dests[0])
        if os.path.exists(primary) and 1000 < os.path.getsize(primary) <= 150 * 1024:
            print(f"SKIP {dests[0]} (already {os.path.getsize(primary) // 1024} kB)")
        else:
            url = commons_image_url(title)
            download_and_resize(url, primary)
            print(f"OK   {dests[0]} ({os.path.getsize(primary) // 1024} kB)")
            time.sleep(1.2)
        total += 1
        for extra in dests[1:]:
            extra_path = os.path.join(ROOT, extra)
            os.makedirs(os.path.dirname(extra_path), exist_ok=True)
            shutil.copyfile(primary, extra_path)
            print(f"OK   {extra} (copied)")
            total += 1
    print(f"\nDone: {total} biomarker reference gallery JPEGs ready.")


if __name__ == "__main__":
    main()
