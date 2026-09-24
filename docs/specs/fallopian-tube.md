# Standalone fallopian tube on the benign uterus form

Status: **built 2026-09-24** (benign batch 2). The card in `docs/roadmap.md` is the spec; this note records what was built and where it departs from the card. Routing counts are in `docs/specs/specimen-intake.md` under "Benign batch 2 routing and pre-fill".

## As built

- `uterus_benign` gains three specimen options after "Fallopian tube(s), sterilisation": "Left fallopian tube, salpingectomy", "Right fallopian tube, salpingectomy" and "Paratubal cyst, excision". Hysterectomy, myomectomy, adnexa and sterilisation output is unchanged: the 8,781-combination output matrix (4,036 of them on this form) is identical.
- A salpingectomy part shows the tube and cyst sizes, the blocks, a new "Tube findings" list (Unremarkable, Hydrosalpinx, Paratubal cyst, Chronic salpingitis, Endometriosis) and the notes. A paratubal cyst part shows a new "Side" select (Not stated, Left, Right), the cyst size, the blocks and the notes. The uterus and ovary fields are hidden, and stale values in them do not print.
- Macroscopy: "Received in formalin is a left fallopian tube measuring 5 cm in length and 0.6 cm in diameter." A ticked paratubal cyst adds "A thin-walled paratubal cyst measuring 2 cm is attached."; a hydrosalpinx with a size adds "The fallopian tube is cystically dilated to 3 cm." Then "All embedded in N blocks." The block key is "(1) Fimbria. (2) Cross sections of the fallopian tube.", plus "(3) Paratubal cyst." when one is ticked. A paratubal cyst excision reads "Received in formalin is a thin-walled paratubal cyst measuring 3 cm. All embedded in 1 block.", with "(1) Cyst wall."
- Microscopy:
  - salpingectomy: "Sections show fimbrial tissue and cross sections of the left fallopian tube with unremarkable plicae.", or the hydrosalpinx sentence "Sections of the left fallopian tube show a dilated lumen lined by benign tubal epithelium, consistent with hydrosalpinx." Each ticked finding then adds its sentence, and the paragraph closes "There is no evidence of malignancy.";
  - paratubal cyst: "Sections show a fibrous cyst wall lined by a single layer of ciliated tubal-type epithelium. The features are consistent with paratubal cyst. There is no evidence of malignancy."
- Diagnosis:
  - salpingectomy: "Left FALLOPIAN TUBE, salpingectomy - NO EVIDENCE OF MALIGNANCY" when nothing is ticked. Otherwise one clause per finding: "Consistent with HYDROSALPINX", "PARATUBAL CYST", "CHRONIC SALPINGITIS" and "ENDOMETRIOSIS", with no closing clause;
  - paratubal cyst: "FALLOPIAN TUBE, right paratubal cyst, excision - PARATUBAL CYST". The specimen line is "Right paratubal cyst, excision" and loses the side when it is not stated.

## Departures from the card

- Routing uses a new intake rule, `match.alone`, not plain aliases. Its site words (fallopian tube, salpingectomy, paratubal, fimbrial cyst, hydrosalpinx, tubal ligation) and procedure words count only on a line that names none of the ovary, adnexa, uterus, cervix, a myoma or fibroid, TAH or BSO, or a pregnancy. Plain aliases would also have scored on the request lines that name the tube with the ovary or adnexa (95 in the exports) or with the uterus (46). Fill rules marked `alone` follow the same gate.
- Two fields are new. The paratubal side prints in the specimen line and the diagnosis head. The tube findings list is separate from the adnexal list, which still serves the sterilisation option unchanged.
- The leiomyoma detail fields (count, location, size, cut surface, degeneration) now also need a uterus or myomectomy specimen. Before, they showed on any part whose leiomyoma value was Present, adnexa parts included. Output is unchanged.
- The paratubal cyst and hydrosalpinx sentences follow the released tube reports ("fibrous cyst wall lined by … ciliated tubal-type epithelium", "The features are consistent with paratubal cyst."). The older adnexa sentence ("lined by flattened cuboidal epithelium") was left at first; since 2026-09-24 adnexa, bilateral adnexa and sterilisation parts print the same paratubal cyst sentence as the tube form (card "Uterus (benign) — adnexa paratubal cyst lining": none of the 42 released adnexa parts with a paratubal cyst describes a flattened cuboidal lining).
- House diagnosis lines, counted over the 83 tube-only parts:
  - an unremarkable tube: "NO EVIDENCE OF MALIGNANCY" 25, no significant pathology or abnormality 2;
  - a paratubal cyst: "PARATUBAL CYST" alone 39, with a closing clause 1;
  - a hydrosalpinx: "Consistent with HYDROSALPINX" 5 of 6.
- Pre-fill: salpingectomy with a side goes to that side's salpingectomy, and a paratubal, fimbrial or other cyst goes to the paratubal excision with its side. Ligation or sterilisation goes to the sterilisation option, and a side alone goes to that side's salpingectomy. A line with no side fills nothing rather than guessing one. All 99 tube-only request lines in the exports name a side.
- Four parts released as ectopic pregnancy have request lines that name only the tube and the procedure. They now reach the tube form instead of Generic. A line that names the pregnancy stays off the form and is left for the ectopic card.

## Grounding

RCPath, Tissue pathways for gynaecological pathology, V3, February 2023, section 10.3.1 (confirm the tube and a complete cross-sectional profile; report any abnormality) and section 10.3.4: https://www.rcpath.org/static/94763195-0982-40ed-bbc79ca92370e9ac/Tissue-pathways-for-gynaecological-pathology.pdf. House wording comes from the released reports, counted only in aggregate (`docs/case-mix/benign-resections-2021-2026.md`).

## Tests

`tests/fallopian_tube.test.js` and three golden fixtures in `tests/fixtures/fallopian_tube/`:

- a left salpingectomy with a paratubal cyst;
- a bilateral sterilisation (the existing option, byte-identical to the output before this card);
- a right paratubal cyst excision.

`tests/uterus.test.js` lists the three new options. In the intake fixture, the "fibroids" case now routes its two tube parts here (see `docs/specs/specimen-intake.md`).
