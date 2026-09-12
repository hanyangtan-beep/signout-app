# LIS specimen lists — house samples (supplied 2026-09-12, anonymised by the user)

Six pastes exactly as the LIS shows them. These seed `tests/fixtures/intake/cases.json`; the expected template per part (right-hand column) is against the template set of 2026-09-12 and is revisited when the lung, gastric and ovarian synoptics ship.

## 1 — Endometrial carcinoma staging

```
History
CA corpus

specimen
(A) Uterus and appendages, resection, (B) Left sentinel pelvic lymph node, (C) Right sentinel pelvic lymph node and (D) Para aortic sentinel lymph node
```

| Part | Expected | Tier |
| --- | --- | --- |
| A Uterus and appendages, resection | `endometrial_carcinoma` ("CA corpus" = carcinoma of the corpus) | confident |
| B–D sentinel lymph nodes | `lymph_node` | confident |

## 2 — Breast excision with margins

```
History
Left breast mass (fibroepithelial lesion, ?phyllodes)
Left 2-3H breast mass size ~4cm, another ~1cm lesion over medial-inferior aspect of the index lesion. En-bloc resection done. (superior -short; inferior-loop; lateral -long). Further Anterior, medial and inferior margin taken (stitch over tumor side)
Time of specimen taken out of body (hh:mm): 0945
Date of specimen taken out of body (dd/mm), if not today: 07/07/2026
Time of specimen immersed in formalin (hh:mm): 0945
Date of specimen immersed in formalin (dd/mm), if not today: 07/07/2026

Breast, excision: (A) Left 2-3H breast mass, (B) Anterior margin, (C) Medial margin and (D) Inferior margin
```

| Part | Expected | Tier |
| --- | --- | --- |
| A Left 2-3H breast mass | `breast_excision` (partType main, side Left) | confident |
| B–D margins | `breast_excision` (partType margin, margin Anterior / Medial / Inferior) | confident |

Notes: case-level prefix `Breast, excision:` applies to every part; the fixation time / date lines belong to the history block and are ignored by the matcher.

## 3 — Serous carcinoma debulking (13 parts)

```
History
Serous carcinoma
There was no ascites.
A 1 cm thickening was noted at the right subdiaphragmatic surface but no gross tumors were seen.
No gross tumor was noted in the omentum.
A few miliary whitish lesions were seen on the splenic capsule but not gross tumors were seen.
A 0.5 x 0.5 x 1 cm lymph node was noted around the common bile duct and hepatic artery.
A few miliary deposits were noted at bilateral paracolic gutters and pelvic peritoneum.
A 0.5 x 0.5 x 1 cm thickening was seen at the right posterior abdominal peritoneum.
A 2 cm tumor was seen attaching between the appendix and the proximal sigmoid colon.
A few miliary deposits were seen on the rectal surface.
The bladder flap was thickened of around 0.5 x 0.5 x 1.5 cm.
The left ovary was slightly enlarged and the right looked normal.
Three 0.2 cm necrotic tumors were noted at the right ovarian fossa and one 0.5 x 0.5 x 1 cm necrotic
tumor was seen over the right uterosacral ligament.
A 0.5 x 0.5 x 1 cm elongated LN was noted at right external iliac artery.

(A) Omentum, (B) Spleen, (C) Lymph node at bile duct, (D) Mesenteric nodule, (E) Nodule near bile duct, (F) Nodule at diaphragm, (G) Left para-aortic gutter, (H) Left pelvic peritoneum, (I) Sigmoid, (J) Tumour on sigmoid, (K) Uterus and bilateral appendages, (L) Right pelvic lymph node and (M) Proximal margin of sigmoid
```

| Part | Expected | Tier |
| --- | --- | --- |
| C, L lymph nodes | `lymph_node` | confident |
| K Uterus and bilateral appendages | choose (`endometrial_carcinoma` / `uterus_benign` / `ovarian_cyst`; "serous carcinoma" does not fix the primary) | choose |
| A, B, D–J, M | `generic` (no ovarian / peritoneal carcinoma synoptic yet; Later) | none |

Notes: no `specimen` heading; the list follows a blank line. A wrapped history line (`necrotic\ntumor`) must not start a new part.

## 4 — Lung carcinoma resection with stations

```
History:
Lung Ca

Specimen
(A) Lung, right upper lobe, resection, (B) Lymph node, right paratracheal LN, resection, (C) Lymph node, right parabronchial LN, resection, (D) Lymph node, right subcarinal LN, resection, (E) Lymph node, right lobar LN, resection and (F) Lymph node, right inferior pulmonary ligament LN, resection
```

| Part | Expected | Tier |
| --- | --- | --- |
| A Lung, right upper lobe, resection | `generic` today; `lung_carcinoma` once the lung pair ships. `lung_biopsy` must not match (procedure is resection) | none |
| B–F lymph node stations | `lymph_node` (specimen name keeps the station text) | confident |

Notes: structured triples `Site, detail, procedure` with commas inside each part — split on `(X)` markers first, never on commas.

## 5 — Fibroids

```
history:
Fibroids

specimen
(A) Right fallopian tube, resection, (B) Left fallopian tube, resection and (C) Uterus, resection
```

| Part | Expected | Tier |
| --- | --- | --- |
| A, B fallopian tubes | `uterus_benign` (tubes are adnexal parts of the benign uterus template) or `generic` — decide when building; not `ovarian_cyst` | choose |
| C Uterus, resection | `uterus_benign` ("Fibroids" is the clinical term) | confident |

## 6 — Gastric carcinoma with numbered stations (15 parts)

```
history:
Gastric Ca

Specimen:
(A) Stomach, stomach, Resection
(B) omentum, omentum, Resection
(C) Lymph node, Right paracardial LN (1), Resection
(D) Lymph node, Left paracardial LN (2), Resection
(E) Lymph node, Lesser curve LN (3), Resection
(F) Lymph node, Greater curve LN (4), Resection
(G) Lymph node, Suprapyloric LN (5), Resection
(H) Lymph node, Infrapyloric LN (6), Resection
(I) Lymph node, Left gastric art LN (7), Resection
(J) Lymph node, Com. Hepatic A LN (8a), Resection
(K) Lymph node, Celiac LN (9), Resection
(L) Lymph node, Splenic hilar LN (10), Resection
(M) Lymph node, Proximal splenic A LN (11p), Resection
(N) Lymph node, Distal splenic A LN (11d), Resection
(O) Lymph node, Hepatoduodenal LN (12a), Resection
```

| Part | Expected | Tier |
| --- | --- | --- |
| A Stomach, stomach, Resection | `generic` today; `gastric_carcinoma` once that card ships. `gastric_biopsy` must not match | none |
| B omentum | `generic` | none |
| C–O stations | `lymph_node`; station number `(1)`, `(8a)`, `(11p)` kept in the specimen name | confident |

Notes: one part per line; parenthesised station numbers must not be read as part markers (the LIS uses letters only); duplicated site (`Stomach, stomach`) collapses to one word; 15 parts exceeds today's cap.
