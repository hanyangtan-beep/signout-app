# Thyroid carcinoma resection synoptic

Built on 25 November 2026 (Phase 88) at the user's request. Replaces the `thyroid_carcinoma` menu placeholder (`templates/planned.json`) for QMH `Endocrine-Thyroid` (`docs/reference/Endocrine-Thyroid.html`; plain-text dump in `docs/reference/qmh/thyroid.txt`).

## Scope

- One form, `thyroid_carcinoma` (Endocrine, cancer resection, menu "Thyroid Ca"), for total thyroidectomy, hemithyroidectomy (lobectomy with isthmusectomy), lobectomy, subtotal/near-total thyroidectomy, isthmusectomy, completion thyroidectomy and partial excision for thyroid carcinoma.
- Incorporates **CAP Thyroid 4.4.0.0 (March 2023)** and **WHO 5th edition (2022)** classification updates:
  - Papillary thyroid carcinoma subtypes (subcentimetre PTCs subtyped like larger tumours; "tall cell subtype" in WHO 5th terminology).
  - Invasive encapsulated follicular variant papillary thyroid carcinoma (IEFVPTC) as a distinct entity (minimally invasive, encapsulated angioinvasive, widely invasive).
  - Follicular thyroid carcinoma and oncocytic carcinoma of the thyroid (replacing Hurthle cell carcinoma).
  - High-grade follicular cell-derived non-anaplastic thyroid carcinomas: differentiated high-grade thyroid carcinoma (DHGTC, defined by >= 5 mitoses/2 mm² and/or tumour necrosis) and poorly differentiated thyroid carcinoma (PDTC).
  - Anaplastic thyroid carcinoma (including squamous cell carcinoma pattern per WHO 5th edition).
  - Medullary thyroid carcinoma with **International Medullary Thyroid Carcinoma Grading System (IMTCGS)** two-tier grading (high grade if >= 5 mitoses/2 mm², tumour necrosis, or Ki-67 >= 5%) and required Ki-67 labelling index.
  - Cribriform-morular thyroid carcinoma as a distinct entity, salivary-type and thymic-like thyroid carcinomas, and low-risk follicular cell-derived neoplasms (NIFTP, FT-UMP, WDT-UMP, hyalinising trabecular tumour; unstaged).
- Not covered: benign thyroid resections (`thyroid_benign`, which now offers "Upgrade this part" when a carcinoma is selected) and thyroid FNA cytology (`thyroid_fna`).

## Staging

`src/staging/thyroid.js` implements **AJCC 8th edition** (Chapters 73 & 74: Differentiated/Anaplastic and Medullary thyroid carcinoma).

- **pT:** pT1a <= 10 mm, pT1b > 10 to 20 mm, pT2 > 20 to 40 mm, pT3a > 40 mm (limited to thyroid); pT3b gross extrathyroidal extension into strap muscles only; pT4a gross ETE into subcutaneous soft tissues, larynx, trachea, oesophagus or recurrent laryngeal nerve; pT4b gross ETE into prevertebral fascia or encasing carotid artery or mediastinal vessels. Microscopic extrathyroidal extension does **not** upstage to pT3b in AJCC 8th edition.
- **pN:** pN0a (>= 1 benign node, none involved), pN1a (central compartment: level VI or VII), pN1b (lateral neck levels I–V or retropharyngeal), pN1 (other/unspecified compartment). Omitted from printed pTNM when no nodes are examined (`none: true`).
- **pM:** pM1 for recorded distant sites (non-regional lymph nodes, lung, bone, other).
- **Stage groups:** Shown in **Checks only** (never printed). Differentiated carcinoma uses the age 55 cut-off (shows both `< 55` and `>= 55` when age group is not specified); anaplastic (IVA/IVB/IVC) and medullary (I–IVC) follow their respective AJCC 8th tables. Low-risk neoplasms are not staged.

## Checks

- Errors: missing procedure or histologic type; involved lymph nodes exceeding examined count in any compartment.
- Warnings: missing tumour size; high-grade feature (>= 5 mitoses/2 mm² or tumour necrosis) in a differentiated carcinoma prompting consideration of DHGTC; missing Ki-67 in medullary carcinoma; IMTCGS grade inconsistent with mitoses/necrosis/Ki-67; angioinvasion discordant with minimally invasive vs encapsulated angioinvasive type; involved margin without location; pTNM override without reason.
- Infos: microscopic ETE reminder; multifocal tumour without `(m)` descriptor; positive nodes without ENE; AJCC 8th stage group reference line.

## Upgrade from `thyroid_benign`

`generators/thyroid.js` exports `UPGRADE_TO` targeting `thyroid_carcinoma` when `Papillary thyroid carcinoma - see comment` or `Follicular carcinoma - see comment` is selected, carrying over procedure, lobe/site, weight, dimensions, capsule, background, blocks, dominant nodule size (converted cm -> mm), thyroiditis, parathyroid, C-cell hyperplasia and notes.

## Intake

Thyroid resection lines naming a carcinoma (`PTC`, `FTC`, `MTC`, `ATC`, `PDTC`, `DHGTC`, `papillary carcinoma`, `follicular carcinoma`, `medullary carcinoma`, `anaplastic carcinoma`, `oncocytic carcinoma`, `thyroid carcinoma` / `thyroid cancer`) route to `thyroid_carcinoma` and pre-fill procedure and tumour site. Benign thyroid resections (`MNG`, `goitre`, `nodule`, `Graves`, `Hashimoto`, `NIFTP`) stay on `thyroid_benign`, and FNA / cytology / parathyroid / neck dissection / frozen lines keep their forms.
