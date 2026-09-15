import csv,collections,re,json
F='uploaded_attachments/05e3584d3b6246a4be21f1abeba0cf04/export-cases-2024-to-current.csv'
rows=[r for r in csv.DictReader(open(F,encoding='utf-8-sig'))]

CYTO={'YNP','YFC','YGP'}
MOLE={'NGSLG','FISH0','ISH'}

# ordered rules: (category, regex). First match wins.
R=[
 ('Cervical smear',            r'\b(cervix and endocervix|cervix|endocervix|vault|vagina|vulva)\b'),   # only applied for YGP
 ('Urine cytology',            r'\burine\b|\bbladder washing'),
 ('Respiratory cytology',      r'\bsputum\b|bronchial|\bbal\b|lavage of bronch'),
 ('Serous effusion cytology',  r'pleural fluid|peritoneal fluid|ascit|pericardial fluid|peritoneal washing|pleural washing'),
 ('CSF cytology',              r'\bcsf\b|cerebrospinal'),
 ('Joint fluid cytology',      r'joint fluid|synovial fluid'),
 ('Thyroid FNA',               r'thyroid|thyroglossal'),
 ('Lymph node FNA',            r'lymph node|\bln\b|level i|level ii|level iii|level iv|\bnode\b'),
 ('Salivary FNA',              r'salivary|parotid|submandibular'),
 ('Other FNA / non-gynae',     r'.'),
]
HIST=[
 ('Endometrium / curettings', r'\bea\b|\bthbso\b|products? of gestation|suction evacuat'),
 ('Serous effusion cytology', r'peritoneal fluid|pleural fluid|ascit'),
 ('Ovary / fallopian tube',  r'paratubal|para-?ovarian'),
 ('Duodenal / small bowel biopsy', r'small bowel|ileostom|\bstoma\b'),
 ('Colorectal polyp / biopsy', r'hemicolectom|\bpolyp at \d|\d+ ?cm polyp|colectom'),
 ('Lung / pleura',           r'ebus|\btbna\b|\blll\b|\brul\b|\brll\b|\blul\b|\brml\b|chest wall'),
 ('Ear / temporal bone',     r'cholesteatoma|malleus|\bear\b|mastoid|tympan'),
 ('Nail / digit',            r'nail plate|\btoe\b|\bfinger\b'),
 ('Gastric biopsy',            r'\bantrum\b|\bstomach\b|gastric|\bbody of stomach|\bcardia\b|\bgoj\b|gastro-?oesophageal junction|\bpylor'),
 ('Duodenal / small bowel biopsy', r'duoden|\bd1\b|\bd2\b|jejun|\bileum\b|ileal'),
 ('Colorectal polyp / biopsy', r'polyp.*(colon|caec|sigmoid|rect|hepatic flexure|splenic flexure|ascending|descending|transverse)|(colon|caec|sigmoid|rect|hepatic flexure|splenic flexure|ascending|descending|transverse).*polyp|\bcolon\b|\bcaecum\b|\bcaecal\b|\bsigmoid\b|\brectum\b|\brectal\b|\bileo-?caecal\b|anastomosis|\banal\b|\banus\b'),
 ('Haemorrhoid',              r'haemorrhoid|hemorrhoid'),
 ('Appendix',                 r'appendix|appendice'),
 ('Oesophageal biopsy',       r'oesophag|esophag'),
 ('Gallbladder',              r'gallbladder|gall bladder|cholecyst'),
 ('Liver',                    r'\bliver\b|hepatic segment|hepatectomy|\bhcc\b'),
 ('Bile duct / pancreas',     r'bile duct|\bcbd\b|ampulla|pancrea|whipple'),
 ('Endometrium / curettings', r'endometri|\buterine curettage\b|suction evacuat|\bpoc\b|product of conception|products of conception'),
 ('Cervix biopsy / LEEP',     r'cervi|\bleep\b|\blletz\b|\bcone\b|transformation zone'),
 ('Uterus resection',         r'\buterus\b|hysterectom|fibroid|leiomyom|myomectom|\bvault\b'),
 ('Ovary / fallopian tube',   r'ovar|fallopian|tubo-?ovarian|salping|\badnexa'),
 ('Vulva / vagina',           r'\bvulva|\bvagina|labi'),
 ('Placenta',                 r'placenta'),
 ('Breast',                   r'breast|nipple|axillary tail|mastectom'),
 ('Prostate',                 r'prostat|\bturp\b'),
 ('Bladder / urothelium',     r'bladder|urothel|\bturbt\b|ureter|urethra|renal pelvis'),
 ('Kidney',                   r'\bkidney\b|\brenal\b|nephrectom'),
 ('Testis / penis / scrotum', r'testi|epididym|\bpenis\b|foreskin|prepuce|scrot'),
 ('Lung / pleura',            r'\blung\b|\bbronch|\bpleura|\blobe\b|pulmonary|mediastin|\bthymus\b'),
 ('Lymph node (histology)',   r'lymph node|\blymph\b|\bnodal\b'),
 ('Skin',                     r'\bskin\b|sebaceous|seb keratosis|seborrhoeic|\bnaev|\bnevu|\bmole\b|\bcyst\b.*(back|face|scalp|neck|forehead|buttock|chest)|basal cell|\bbcc\b|\bscc\b.*skin'),
 ('Oral cavity / oropharynx', r'oral|tongue|buccal|gingiv|\bpalate\b|\blip\b|mandib|maxill|floor of mouth|retromolar|alveolar|\bjaw\b|tooth|teeth|\bcyst\b.*(jaw|mandib|maxill)'),
 ('Nasopharynx / sinonasal',  r'nasopharyn|\bnp\b|\bnose\b|nasal|sinus|antrochoanal|turbinate'),
 ('Tonsil / adenoid',         r'tonsil|adenoid'),
 ('Larynx / pharynx',         r'laryn|vocal|pharyn|epiglott'),
 ('Salivary gland',           r'salivary|parotid|submandibular|sublingual'),
 ('Thyroid / parathyroid',    r'thyroid|parathyroid'),
 ('Brain / CNS',              r'\bbrain\b|cerebr|\bdura\b|meningi|pituitar|sellar|\bcpa\b|glioma|ventricul|occipital|frontal lobe|temporal lobe|spinal|cord tumour|\bcns\b'),
 ('Bone / joint',             r'\bbone\b|femoral head|\bfemur\b|\bvertebr\b|\bdisc\b|ligamentum|\bjoint\b|synovi|cartilage|\brib\b|osteo'),
 ('Soft tissue',              r'soft tissue|lipoma|\bfat\b|muscle|fascia|\bmass\b|\btumour\b|\btumor\b|nodule|\bthigh\b|\bback\b|\barm\b|\bleg\b|\bshoulder\b'),
 ('Cardiovascular',           r'\bvalve\b|\baorta\b|\bartery\b|\bvein\b|vascular|\bclot\b|thromb|\bheart\b|myocard|temporal artery'),
 ('Hernia sac',               r'hernia'),
 ('Abscess / inflammatory',   r'abscess|sinus tract|granulation|\bulcer\b'),
]
def cat(site, test):
    s=re.sub(r'\s+',' ',(site or '').lower())
    if test=='YGP':
        return 'Cervical smear'
    if test in CYTO:
        for n,rx in R:
            if re.search(rx,s): return n
        return 'Other FNA / non-gynae'
    for n,rx in HIST:
        if re.search(rx,s): return n
    return 'UNCLASSIFIED'

out=collections.Counter(); unc=collections.Counter(); kind=collections.defaultdict(collections.Counter)
for r in rows:
    t=r['Test']; c=cat(r['Site'],t)
    out[c]+=1; kind[c][('cytology' if t in CYTO else 'molecular' if t in MOLE else 'histology')]+=1
    if c=='UNCLASSIFIED': unc[re.sub(r'\s+',' ',(r['Site'] or '').lower())[:60]]+=1
n=len(rows)
print(f'total {n}; unclassified {out["UNCLASSIFIED"]} ({100*out["UNCLASSIFIED"]/n:.1f}%)\n')
for c,v in out.most_common():
    if c=='UNCLASSIFIED': continue
    k=', '.join(f'{a} {b}' for a,b in kind[c].most_common())
    print(f'{v:5d}  {100*v/n:5.1f}%  {c:28s} [{k}]')
print('\n--- top unclassified ---')
for k,v in unc.most_common(30): print(f'{v:4d}  {k}')
json.dump({c:v for c,v in out.items()}, open('/home/user/workspace/case_tally.json','w'), indent=1)
