"""Profile the benign-resection categories in the two anonymised exports.

    python3 tools/profile-benign-resections.py [--bx <biopsy.xlsx>] [--lis <export.csv>] [--route]

Reads the five-year biopsy file (xlsx; columns Diag, Micro, Gross) and the 2024-2026 LIS export
(csv; columns Diagnosis, Test), splits each diagnosis into lettered parts and classifies every
part into the benign-resection categories below, first rule wins. Prints a markdown report of
aggregate counts, which is how docs/case-mix/benign-resections-2021-2026.md is produced.
--route also sends each part's specimen line through src/intake.js and counts the template the
app picks today (needs node).

Both files are PHI. Keep them in the sandbox; only aggregate counts leave this script. Nothing
it prints carries an accession number, a site description, case text or any patient field.
"""
import collections, csv, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP = os.path.join(os.path.dirname(ROOT), 'uploaded_attachments')
args = sys.argv[1:]
def flag(name, default):
    return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default
BX = flag('--bx', os.path.join(UP, '9d629c50a133405992d11e860b89750f', '210101-260914-BX-anonymised.xlsx'))
LIS = flag('--lis', os.path.join(UP, '05e3584d3b6246a4be21f1abeba0cf04', 'export-cases-2024-to-current.csv'))
ROUTE = '--route' in args
CYTO = {'YNP', 'YFC', 'YGP'}; MOLE = {'NGSLG', 'FISH0', 'ISH'}

def parts_of(dx):
    t = str(dx or '').replace('\r', '')
    pieces = re.split(r'(?:(?<=\s)|^)\(([A-Z])\)\s+', t)
    if len(pieces) == 1: return [t.strip()]
    out = [pieces[0].strip()] if pieces[0].strip() else []
    return out + [pieces[i + 1].strip() for i in range(1, len(pieces), 2)]
def split(text):
    m = re.search(r':\s*-|:\s*\n|\s-\s', text)
    if m: return text[:m.start()].strip(), text[m.end():].strip()
    return text.split('\n')[0].strip(), ''
QUAL = r'^(consistent with|in keeping with|compatible with|suggestive of|features (are )?(of|suggestive of)|favour(ing)?|highly suspicious (of|for)|suspicious (of|for)|showing|benign|inflamed|ruptured|involved by|residual|marked|focal|mild|moderate|severe)\s+'
def entity(rest):
    t = re.sub(r'^[-\u2022\s]+', '', rest)
    t = re.split(r'\s-\s|;|\.\s|\.$|\n|,', t)[0].strip()
    for _ in range(3): t = re.sub(QUAL, '', t, flags=re.I).strip()
    m = re.match(r"([A-Z][A-Z0-9'\-/ ]*[A-Z0-9)])", t)
    return (m.group(1) if m else t[:40]).strip().upper()
def head_of(spec):
    h = spec.split(',')[0].strip().upper()
    h = re.sub(r'^\(\d\)\s*', '', h)
    return re.sub(r'^(RIGHT|LEFT|BILATERAL)\s+', '', h)

# Heads that already have an organ template; parts under them are not benign-resection gaps.
ORGAN_TPL = r'^(STOMACH|GASTRIC|DUODEN|COLON|SIGMOID|RECT|CAEC|CEC|ILEUM|TERMINAL ILEUM|OESOPH|ESOPH|TONGUE|ORAL|BUCCAL|GINGIV|PALATE|LIP\b|TRANSVERSE|ASCENDING|DESCENDING|HEPATIC FLEXURE|SPLENIC FLEXURE|SMALL|LARGE|NASO|NASAL|LARYN|VOCAL|TONSIL|CERVI|ENDOMETR|VAGIN|VULV|BLADDER|URETHR|BREAST|LYMPH|GALLBLADDER|APPENDIX|LIVER|MANDIB|MAXILL|AMPULLA|BRAIN|LUNG|PLACENTA|THYROID|PROSTATE|UTER|OVAR|FALLOPIAN|OMENT|PANCREA|PAROTID|SUBMANDIBULAR|HEART|AORT|EYELID)'
POC = r'PRODUCTS OF (CONCEPTION|GESTATION)|CHORIONIC VILL|HYDATIDIFORM|MOLAR PREGNANCY|GESTATIONAL SAC'
TUBE = r'^(FALLOPIAN TUBES?|TUBES?|SALPINX)\b'
BONE_HEAD = r'^(BONE|FEMORAL HEAD|FEMUR|FEMORAL|HUMERAL HEAD|HUMERUS|TIBIA|FIBULA|RADIUS|ULNA|SPINE|SPINAL|VERTEBR|LUMBAR|THORACIC SPINE|CERVICAL SPINE|DISC|INTERVERTEBRAL|SYNOVI|KNEE|HIP|SHOULDER|ELBOW|WRIST|ANKLE|JOINT|MENISC|LIGAMENT|CARTILAGE|RIB|ACETABUL|PATELLA|ILIAC|SKULL|CRANI|STERN|CLAVIC|SCAPUL|SACRUM|COCCYX|LAMINA|CALCAN|METATARS|METACARP|PHALAN|OSTEO|REAM)'
SOFT_HEAD = r'^(SOFT TISSUE|SOFT TISUE|MUSCLE|SUBCUTANEOUS|CHEST WALL|ABDOMINAL WALL|RETROPERITON|MESENTER|TISSUE MASS|NECK MASS|NECK LUMP|GROIN MASS|THIGH|BACK|SHOULDER MASS|ARM MASS|LEG MASS|FOREARM|BUTTOCK|AXILLA|AXILLARY MASS|INGUINAL MASS|PERIANAL)'
ABSCESS = r'abscess|granulation|sinus tract|pilonidal|fistula|debrid|slough|necrotic tissue|wound|\bulcer|\bpus\b|gangren'

def category(spec, rest):
    s, h, ent, sr = spec, head_of(spec), entity(rest), spec + ' ' + rest
    if re.search(r'haemorrhoid|hemorrhoid', sr, re.I): return 'haemorrhoid'
    if (re.search(r'ectopic|tubal pregnancy', sr, re.I) and not re.search(r'heterotopic|ectopic (pancrea|gastric|decidua|prostat|thyroid|breast|spleen)', sr, re.I)) \
       or (re.search(r'fallopian|salping|\btube\b', s, re.I) and re.search(r'chorionic vill|products of (conception|gestation)|trophoblast|implantation site', rest, re.I)): return 'ectopic'
    if re.search(r'hernia', s, re.I) and not re.search(r'hiatus', s, re.I): return 'hernia'
    if re.search(POC, sr, re.I) and not h.startswith('PLACENTA'): return 'poc'
    if re.search(TUBE, h) and not re.search(r'ovary|ovaries', s, re.I): return 'tube'
    if re.search(ORGAN_TPL, h): return None
    if h == 'EAR' or re.search(r'cholesteatoma|middle ear|mastoid|tympan|ossic|malleus|\bincus\b|external auditory|aural|ear canal|temporal bone|\battic\b', s, re.I): return 'ear'
    if re.search(r'\btestis|\btestes\b|\btesticle|\bepididym|scrot|hydrocele|spermatocele|vas deferens|\bvas\b|vasectom|\borchi|spermatic cord|\bpenis|\bpenile|foreskin|prepuce|circumcis|\bglans\b', s, re.I): return 'testis'
    if re.search(r'\bkidney|\brenal\b|nephrectom', s, re.I) and not re.search(r'\bbiopsy\b|\bcore\b', s, re.I) and h != 'ADRENAL': return 'kidney'
    if re.search(r'\bnails?\b|nail (bed|plate|matrix|fold)|\btoes?\b|\bfingers?\b|\bdigit|hallux|thumb|paronych|onych|ingrown|subungual', s, re.I): return 'nail'
    if h == 'SKIN':
        return 'abscess' if re.search(r'abscess|granulation|sinus|pilonidal|fistula|debrid|slough|necro|wound|ulcer|\bpus\b|gangren', s + ' ' + ent, re.I) else None
    if re.search(BONE_HEAD, h) or (re.search(r'synovi|femoral head|\breaming|intervertebral|\bdisc\b|ligamentum flavum|\bjoint\b|bone chips|\bbone\b', s, re.I) and not h.startswith('SOFT TISSUE')): return 'bone'
    if re.search(ABSCESS, s + ' ' + ent, re.I): return 'abscess'
    if re.search(SOFT_HEAD, h) and not re.search(r'vagin|uter|cervi|products', s, re.I): return 'soft'
    return None

# Composition within each category: 'dx' matches the diagnosis only, 'both' the specimen line too.
GROUPS = {
 'soft': ('dx', [
  ('ALT / WDLPS', r'ATYPICAL LIPOMATOUS|WELL[- ]DIFFERENTIATED LIPOSARCOMA'),
  ('sarcoma', r'SARCOMA|MALIGNANT SPINDLE|MALIGNANT PERIPHERAL|MALIGNANT MESENCHYMAL|HIGH-GRADE MALIGNANT TUMOUR|SMALL ROUND CELL'),
  ('on the benign template today', r'\b(ANGIO|FIBRO|SPINDLE CELL |PLEOMORPHIC |MYXO|CHONDROID )?LIPOMA\b|HIBERNOMA|LIPOMATOUS LESION|SCHWANNOMA|NEUROFIBROMA|GANGLION|HAEMANGIOMA|HEMANGIOMA|(?<!ANGIO)LEIOMYOMA|NODULAR FASCIITIS|MYXOMA|\bFIBROMA\b|EPIDERMAL CYST|EPIDERMOID CYST'),
  ('desmoid / SFT / DFSP / IMT', r'FIBROMATOSIS|DESMOID|SOLITARY FIBROUS|INFLAMMATORY MYOFIBROBLASTIC|DERMATOFIBROSARCOMA'),
  ('benign tumour not on the list', r'ANGIOLEIOMYOMA|TENOSYNOVIAL|GIANT CELL TUMOU?R OF TENDON|GLOMUS|GRANULAR CELL|ELASTOFIBROMA|LYMPHANGIOMA|MYOPERICYTOMA|PERINEURIOMA|CALCIFYING FIBROUS|PILOMATRIX|NEUROMA|MUCOUS CYST|MESOTHELIAL CYST|TRICHILEMMAL'),
  ('reactive', r'MALFORMATION|ENDOMETRIOSIS|FAT NECROSIS|HAEMATOMA|HEMATOMA|ORGANIS|SCAR|FIBROSIS|KELOID|FOREIGN BODY|CALCIFICATION|CALCINOSIS|TOPHUS|GOUT|ISCHAEMIA|BLOOD CLOT|SYNOVIAL HYPERPLASIA|MUCOCELE|LOOSE BODY'),
  ('inflammatory', r'INFLAMMATION|GRANULOMA|ABSCESS|NECROSIS|INFLAMMATORY|HISTIOCYT'),
  ('metastasis / lymphoma / other malignancy', r'METASTA|DEPOSIT|CARCINOMA|LYMPHOMA|MELANOMA|TUMOU?R CELLS|SEROUS|MYELOMA|PLASMA CELL NEOPLASM|PLASMACYTOMA|GERM CELL|SEMINOMA|PAGET|GRANULOSA|ATYPICAL SQUAMOUS|MUCIN|CPS'),
  ('nodal tissue', r'NODAL|LYMPH NODE'),
  ('descriptive, no evidence of malignancy', r'NO EVIDENCE OF MALIGNANCY|NO MALIGNANCY|NON-?SPECIFIC|FIBROADIPOSE|FIBROFATTY|ADIPOSE|UNREMARKABLE|NO SIGNIFICANT|MORPHOLOGICAL DESCRIPTION|BENIGN|FIBROADENOMA')]),
 'abscess': ('dx', [
  ('malignant or premalignant', r'CARCINOMA|DYSPLASIA|MELANOMA|LYMPHOMA|MALIGNAN(T|CY) (IS )?(PRESENT|SEEN)'),
  ('ruptured / inflamed cyst', r'CYST'),
  ('stasis change / dermatitis', r'DERMATITIS'),
  ('fistula / sinus', r'FISTULA|SINUS'),
  ('abscess (wall)', r'ABSCESS'),
  ('ulcer', r'ULCER'),
  ('granulation tissue', r'GRANULATION'),
  ('necrotic tissue / debridement', r'NECRO|SLOUGH|GANGREN|DEBRI'),
  ('acute / chronic inflammation', r'INFLAMMATION|SUPPURAT|PURULENT'),
  ('descriptive, no evidence of malignancy', r'NO EVIDENCE OF MALIGNANCY|NO MALIGNANCY|NON-?SPECIFIC')]),
 'bone': ('both', [
  ('metastatic carcinoma', r'METASTA|CARCINOMA'),
  ('plasma cell neoplasm / lymphoma', r'PLASMA CELL|MYELOMA|PLASMACYTOMA|LYMPHOMA'),
  ('primary bone or cartilage tumour', r'SARCOMA|GIANT CELL TUMOU?R|FIBROUS DYSPLASIA|FIBRO-OSSEOUS|OSTEOCHONDROMA|CHONDRO(MA|ID)|ENCHONDROMA|OSTEOMA|OSTEOID|INTRAOSSEOUS|MENINGIOMA|SPINDLE CELL NEOPLASM|BONE CYST|ANEURYSMAL|SCHWANNOMA'),
  ('crystal arthropathy', r'GOUT|PSEUDOGOUT|CPPD|CRYSTAL|TOPH'),
  ('synovium: chondromatosis / TGCT / synovitis / wear debris', r'CHONDROMATOSIS|TENOSYNOVIAL|SYNOVITIS|METALLOSIS|WEAR|DEBRIS|SYNOVIAL HYPERPLASIA|PIGMENTED VILLONODULAR'),
  ('osteomyelitis / infection', r'OSTEOMYELITIS|ACTINOMYC|SUPPURAT|ABSCESS|GRANULATION|ACUTE INFLAMMATION|ACTIVE CHRONIC|TUBERCUL|GRANULOMA'),
  ('fracture / callus', r'FRACTURE|CALLUS'),
  ('necrosis / AVN', r'NECROSIS|AVASCULAR'),
  ('degenerative (OA / disc)', r'OSTEOARTHRIT|DEGENERAT|MYXOID DEGENERATION|DISC'),
  ('descriptive, no evidence of malignancy', r'NO EVIDENCE OF MALIGNANCY|NO MALIGNANCY|NON-?SPECIFIC|MORPHOLOGICAL DESCRIPTION|NO SIGNIFICANT|UNREMARKABLE|INADEQUATE|DYSTROPHIC|CALCIFICATION|PRESENCE')]),
 'poc': ('dx', [
  ('molar (hydatidiform mole)', r'HYDATIDIFORM|MOLAR|\bMOLE\b'),
  ('no villi identified', r'NO (CHORIONIC VILLI|PRODUCTS)|NOT (IDENTIFIED|SEEN)|ABSENT'),
  ('products of gestation confirmed', r'PRODUCTS OF (GESTATION|CONCEPTION)|CHORIONIC VILL|GESTATIONAL SAC|FETAL|EMBRYO')]),
 'haemorrhoid': ('dx', [
  ('with thrombosis', r'THROMB'),
  ('with ulceration', r'ULCER'),
  ('with another finding', r'CONDYLOMA|DYSPLASIA|\bAIN\b|CARCINOMA|CLOACOGENIC|;'),
  ('fibroepithelial polyp / skin tag', r'FIBROEPITHELIAL|SKIN TAG|\bTAG\b'),
  ('haemorrhoid', r'HA?EMORRHOID')]),
 'nail': ('both', [
  ('nail-unit melanocytic', r'MELANOMA|NAEVUS|NEVUS|LENTIG|MELANOCYT'),
  ('nail plate / fungal', r'FUNG|ONYCHOMYC|NAIL PLATE|\bPAS\b'),
  ('digital mucous / ganglion cyst', r'MUCOUS CYST|GANGLION'),
  ('TGCT / glomus / other tumour', r'TENOSYNOVIAL|GIANT CELL|GLOMUS|NEUROFIBROMA|DERMATOFIBROMA|HISTIOCYT|FIBROMA'),
  ('bone / cartilage', r'CHONDROMA|OSTEOMA|EXOSTOSIS|OSTEOMYELITIS|BONE'),
  ('gouty tophus', r'TOPH|GOUT'),
  ('inflammatory / pyogenic granuloma', r'PYOGENIC|GRANULOMA|INFLAMMATION|GRANULATION|SCAR'),
  ('metastasis', r'METASTA'),
  ('descriptive, no evidence of malignancy', r'NO EVIDENCE OF MALIGNANCY|NO MALIGNANCY')]),
 'testis': ('both', [
  ('testis tumour / lymphoma', r'SEMINOMA|GERM CELL|LYMPHOMA|LEYDIG|SERTOLI'),
  ('urothelial / other carcinoma', r'UROTHELIAL|CARCINOMA'),
  ('foreskin (phimosis / lichen sclerosus)', r'PREPUCE|FORESKIN|PHIMOSIS|LICHEN SCLEROSUS|BALANITIS|CIRCUMCIS'),
  ('penile / scrotal skin lesion', r'SKIN|VERRUCA|CONDYLOMA|FORDYCE|ANGIOLIPOMA|PENILE LESION|SCROTAL'),
  ('hydrocele / epididymal cyst / vas', r'HYDROCELE|EPIDIDYMAL CYST|SPERMATOCELE|CYST|VAS DEFER|VASECTOM'),
  ('torsion / infarction', r'TORSION|INFARCT'),
  ('testicular biopsy', r'SPERMATOGENESIS|BIOPSY'),
  ('orchidectomy, no tumour / atrophy', r'NO EVIDENCE OF MALIGNANCY|NO MALIGNANCY|ATROPHY|MORPHOLOGICAL|ORCHI')]),
 'kidney': ('both', [
  ('renal cell carcinoma / renal tumour', r'RENAL CELL|CLEAR CELL|PAPILLARY RENAL|CHROMOPHOBE|ONCOCYTOMA|FUMARATE|RENAL TUMOU?R'),
  ('urothelial carcinoma', r'UROTHELIAL'),
  ('other malignant', r'LYMPHOMA|SARCOMA|ADENOCARCINOMA|TUMOUR THROMBUS|METASTA'),
  ('angiomyolipoma', r'ANGIOMYOLIPOMA'),
  ('polycystic / end-stage / cyst', r'POLYCYSTIC|END STAGE|END-STAGE|CYST'),
  ('graft / vascular', r'GRAFT|REJECTION|THROMBOSIS|INFARCT'),
  ('descriptive, no evidence of malignancy', r'NO EVIDENCE OF MALIGNANCY|NO MALIGNANCY|INADEQUATE')]),
 'ear': ('dx', [
  ('cholesteatoma (incl. keratin only)', r'CHOLESTEATOMA|ANUCLEATE|KERATIN'),
  ('aural polyp / granulation / inflammation', r'INFLAMMATION|GRANULATION|POLYP'),
  ('canal skin lesion', r'NAEVUS|NEVUS|EPIDERMAL CYST|HAEMANGIOMA|KELOID|SEBORR|PAPILLOMA'),
  ('atypical / malignant', r'ATYPICAL|CARCINOMA'),
  ('descriptive, no evidence of malignancy', r'NO EVIDENCE|NO MALIGNANCY')]),
 'hernia': ('dx', [
  ('involved by carcinoma', r'CARCINOMA|METASTA'),
  ('hernia sac', r'HERNIA SAC|MESOTHELI|FIBROADIPOSE|NO EVIDENCE|NO MALIGNANCY')]),
 'ectopic': ('dx', [('tubal pregnancy', r'PREGNANCY|VILL|GESTATION')]),
 'tube': ('dx', [
  ('malignant / STIC / metastasis', r'CARCINOMA|STIC|SEROUS TUBAL INTRAEPITHELIAL|METASTA|LYMPHOMA|SARCOMA'),
  ('hydrosalpinx', r'HYDROSALPINX|PYOSALPINX|HA?EMATOSALPINX'),
  ('paratubal / fimbrial cyst', r'PARATUBAL|PARA-TUBAL|FIMBRIAL CYST|MORGAGNI|PARAOVARIAN|MESOTHELIAL CYST|SEROUS CYST|INCLUSION CYST'),
  ('salpingitis / tubo-ovarian abscess', r'SALPINGITIS|ABSCESS|INFLAMMATION'),
  ('endometriosis', r'ENDOMETRIOSIS'),
  ('unremarkable / sterilisation segment', r'UNREMARKABLE|NO (SIGNIFICANT|EVIDENCE)|NO PATHOLOG|BENIGN|NORMAL|FALLOPIAN TUBE|STERILI|LIGAT|SEGMENT')]),
}
SPECIMEN = {
 'bone': [('femoral / humeral head', r'FEMORAL HEAD|HUMERAL HEAD|HEAD OF FEMUR'), ('synovium / joint', r'SYNOVI|JOINT|KNEE|HIP|SHOULDER|ELBOW|WRIST|ANKLE|MENISC|LOOSE BODY'),
          ('spine / disc / ligamentum', r'SPINE|SPINAL|DISC|VERTEBR|LAMINA|LIGAMENTUM|LUMBAR|THORACIC|CERVICAL|SACR'), ('reamings', r'REAM'), ('amputation', r'AMPUTAT'),
          ('bone biopsy / core', r'BIOPSY|CORE|TREPHINE|NEEDLE'), ('curettage / excision / resection', r'CURET|EXCISION|RESECTION|DEBRID|SEQUESTR|FRAGMENT|CHIPS')],
 'abscess': [('skin', r'^SKIN'), ('perianal / anal / pilonidal', r'ANAL|ANUS|PERIANAL|PILONIDAL|FISTULA'), ('soft tissue', r'^SOFT TISSUE|MUSCLE|ABDOMINAL WALL|AXILLA|GROIN|NECK|BREAST')],
 'poc': [('headed tissue mass (passed per vaginam)', r'^TISSUE MASS'), ('uterine evacuation / curettage', r'^UTER|ENDOMETR|CERVI|CAVITY|EVACUAT|RETAINED')],
 'haemorrhoid': [('header ANUS', r'^ANUS'), ('header ANAL', r'^ANAL'), ('header RECTUM', r'^RECT')],
 'testis': [('orchidectomy / testis', r'ORCHI|TESTIS|TESTES|TESTICLE'), ('circumcision / prepuce', r'PREPUCE|FORESKIN|CIRCUMCIS'), ('hydrocele / epididymis / cord / vas', r'HYDROCELE|EPIDIDYM|CORD|\bVAS\b|VAS DEFERENS|SPERMATO'), ('penile / scrotal skin', r'PENI|SCROT|SKIN|GLANS')],
 'ear': [('middle ear / mastoid / cholesteatoma', r'CHOLESTEATOMA|MIDDLE EAR|MASTOID|ATTIC|TYMPAN|OSSIC'), ('external auditory canal', r'EXTERNAL AUDITORY|CANAL|MEATUS')],
 'nail': [('nail unit', r'NAIL'), ('toe', r'TOE|HALLUX'), ('finger / thumb', r'FINGER|THUMB|DIGIT')],
}
ORDER = [('soft', 'Soft tissue'), ('abscess', 'Abscess, ulcer and granulation tissue'), ('bone', 'Bone and joint'), ('poc', 'Products of gestation'),
         ('tube', 'Fallopian tube, benign (not ectopic)'), ('haemorrhoid', 'Haemorrhoid'), ('nail', 'Nail and digit'), ('kidney', 'Kidney'),
         ('testis', 'Testis, scrotum and foreskin'), ('ear', 'Ear and temporal bone'), ('hernia', 'Hernia sac'), ('ectopic', 'Ectopic pregnancy')]

def first(rules, text):
    return next((name for name, rx in rules if re.search(rx, text)), 'other')

for f in (BX, LIS):
    if not os.path.exists(f): sys.exit(f'no such export: {f}')
import openpyxl
rows, N = [], {}
ws = openpyxl.load_workbook(BX, read_only=True).worksheets[0]
it = ws.iter_rows(values_only=True); hdr = next(it); ix = {h: i for i, h in enumerate(hdr)}
n = 0
for ci, r in enumerate(it):
    if not str(r[ix['Diag']] or '').strip(): continue
    n += 1
    for t in parts_of(r[ix['Diag']]):
        if t: rows.append(('BX', ci, t))
N['BX'] = n
with open(LIS, newline='', encoding='utf-8-sig', errors='replace') as fh:
    lis = list(csv.DictReader(fh))
N['LIS'] = len(lis); N['LIS histology'] = 0
for ci, r in enumerate(lis):
    if (r.get('Test') or '') in CYTO | MOLE: continue
    N['LIS histology'] += 1
    for t in parts_of(r.get('Diagnosis')):
        if t: rows.append(('LIS', ci, t))

tagged = []
for src, ci, t in rows:
    spec, rest = split(t)
    c = category(spec, rest)
    if c: tagged.append({'src': src, 'case': ci, 'cat': c, 'spec': spec, 'rest': rest})

routes = {}
if ROUTE:
    probe = ("import fs from 'node:fs'; import { pathToFileURL } from 'node:url';"
             "const root = process.env.ROOT; const { parseIntake, matchParts } = await import(pathToFileURL(root + '/src/intake.js').href);"
             "const m = JSON.parse(fs.readFileSync(root + '/templates/manifest.json', 'utf8'));"
             "const specs = JSON.parse(fs.readFileSync(process.env.SPECS, 'utf8'));"
             "process.stdout.write(JSON.stringify(specs.map((s) => { try { const r = matchParts(parseIntake(s), '', m.templates); return (r[0] && r[0].templateId) || 'none'; } catch { return 'error'; } })));")
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as tf:
        json.dump([r['spec'] for r in tagged], tf); tmp = tf.name
    try:
        out = subprocess.run(['node', '--input-type=module', '-e', probe], env={**os.environ, 'ROOT': ROOT, 'SPECS': tmp}, capture_output=True, text=True, check=True).stdout
        for r, tid in zip(tagged, json.loads(out)): r['route'] = tid
    finally:
        os.unlink(tmp)

def of(cat, src): return [r for r in tagged if r['cat'] == cat and r['src'] == src]
def cases(rs): return len({r['case'] for r in rs})
def pct(k, d): return f'{100 * k / d:.1f}%'

print('# Benign resections — case mix, 2021 to 2026\n')
print(f"Source: the anonymised five-year biopsy file (January 2021 to 14 September 2026; {N['BX']:,} cases with a diagnosis) and the "
      f"2024–2026 LIS export ({N['LIS']:,} cases, of which {N['LIS histology']:,} histology — cytology YNP, YFC, YGP and molecular NGSLG, FISH0, ISH rows "
      "are left out). Produced by `python3 tools/profile-benign-resections.py --route`. Both files are PHI and stay in the sandbox; only the counts "
      "below leave them — no accession number, site text, case text or patient field appears here.\n")
print('Unit: diagnosis parts (a case can carry several), classified from each part\'s specimen line and diagnosis, first rule wins. Shares are '
      'cases over all cases in that file. This is not the site-based table in `docs/case-mix-2026-09.md`, which buckets whole cases by the '
      'LIS Site column; soft tissue, for example, is 129 cases there. Heads that already have an organ template (stomach, breast, uterus, '
      'placenta and so on) are not counted here, except products of gestation and standalone fallopian tubes.\n')
print('## Summary\n')
cols = '| Category | Five-year parts | Cases | Share | Export parts | Cases | Share |' + (' Generic today |' if ROUTE else '')
print(cols); print('|' + '---|' + '---:|' * (6 + (1 if ROUTE else 0)))
for key, name in ORDER:
    b, l = of(key, 'BX'), of(key, 'LIS')
    line = f'| {name} | {len(b)} | {cases(b)} | {pct(cases(b), N["BX"])} | {len(l)} | {cases(l)} | {pct(cases(l), N["LIS"])} |'
    if ROUTE:
        allr = b + l; g = sum(1 for r in allr if r.get('route') == 'generic')
        line += f' {g} / {len(allr)} |'
    print(line)
b, l = [r for r in tagged if r['src'] == 'BX'], [r for r in tagged if r['src'] == 'LIS']
line = f'| **All of the above** | {len(b)} | {cases(b)} | {pct(cases(b), N["BX"])} | {len(l)} | {cases(l)} | {pct(cases(l), N["LIS"])} |'
if ROUTE: line += f' {sum(1 for r in tagged if r.get("route") == "generic")} / {len(tagged)} |'
print(line)
print('\n## Composition\n')
for key, name in ORDER:
    field, rules = GROUPS[key]
    cb, cl = collections.Counter(), collections.Counter()
    for src, ctr in (('BX', cb), ('LIS', cl)):
        for r in of(key, src):
            ctr[first(rules, (r['spec'] + ' || ' + r['rest']).upper() if field == 'both' else re.sub(r'^[-\u2022\s]+', '', r['rest']).upper())] += 1
    print(f'### {name}\n\n| Group | Five-year | Export |\n|---|---:|---:|')
    for g in sorted(set(cb) | set(cl), key=lambda g: (-(cb[g] + cl[g]), g)): print(f'| {g} | {cb[g]} | {cl[g]} |')
    if key in SPECIMEN:
        sb, sl = collections.Counter(), collections.Counter()
        for src, ctr in (('BX', sb), ('LIS', sl)):
            for r in of(key, src): ctr[first(SPECIMEN[key], r['spec'].upper())] += 1
        print('\n| Specimen line | Five-year | Export |\n|---|---:|---:|')
        for g in sorted(set(sb) | set(sl), key=lambda g: (-(sb[g] + sl[g]), g)): print(f'| {g} | {sb[g]} | {sl[g]} |')
    if ROUTE:
        rt = collections.Counter(r.get('route', 'not probed') for r in of(key, 'BX') + of(key, 'LIS'))
        print('\nIntake top-1 today: ' + ', '.join(f'`{t}` {k}' for t, k in rt.most_common()) + '.')
    print()
hb = of('haemorrhoid', 'BX') + of('haemorrhoid', 'LIS')
sp = collections.Counter('HAEMORRHOID' if 'HAEMORRHOID' in r['rest'].upper() else 'HEMORRHOID' if 'HEMORRHOID' in r['rest'].upper() else 'neither' for r in hb)
pl = sum(1 for r in hb if re.search(r'HA?EMORRHOIDS', r['rest'].upper()))
print(f"Haemorrhoid diagnosis spelling (both files): HAEMORRHOID {sp['HAEMORRHOID']}, HEMORRHOID {sp['HEMORRHOID']}, neither {sp['neither']}; plural {pl} of {len(hb)}.")
pb = of('poc', 'BX') + of('poc', 'LIS')
pw = collections.Counter('PRODUCTS OF GESTATION' if 'PRODUCTS OF GESTATION' in r['rest'].upper() else 'PRODUCTS OF CONCEPTION' if 'PRODUCTS OF CONCEPTION' in r['rest'].upper() else 'neither' for r in pb)
print(f"\nProducts-of-gestation diagnosis wording (both files): PRODUCTS OF GESTATION {pw['PRODUCTS OF GESTATION']}, PRODUCTS OF CONCEPTION {pw['PRODUCTS OF CONCEPTION']}, neither {pw['neither']} of {len(pb)}.")
