// Skin SCC — one descriptive sentence per histologic type, printed after the opening sentence of the
// "- Tumour histology:" paragraph when the paragraph is not typed. Register (docs/new-template-brief.md):
// the sentence says only what is seen; no WHO citation, no definition, no differential and no
// prognosis. The pathologist overrides the paragraph whenever the case differs.
//
// Sources (full notes and links in docs/reference/skin_scc-morphology.md):
//   Conventional SCC and grade: CAP Cutaneous Carcinoma of the Head and Neck v1.2.0.0 and the RCPath
//     cutaneous SCC dataset v4 (grade by the worst area); Patholines, squamous cell carcinoma of the
//     skin (https://patholines.org/Squamous-cell_carcinoma_of_the_skin/).
//   Keratoacanthoma type: Pathology Outlines
//     (https://www.pathologyoutlines.com/topic/skintumornonmelanocytickeratoacanthoma.html) — crater,
//     lips, glassy cytoplasm, neutrophilic microabscesses, atypia confined to the periphery; the
//     "keratoacanthoma type" wording for a fully excised lesion.
//   Acantholytic and pseudovascular: PMC5319832 (acantholytic SCC review), PMC6421930 (pseudovascular).
//   Spindle cell and sarcomatoid: the CAP type list keeps them apart; the literature uses them
//     largely as synonyms (report §4 and §8).
//   Verrucous, adenosquamous, clear cell, osteoclast-like giant cells, lymphoepithelioma-like: report
//     §5, §6, §7, §9 and §11.
// The WHO 5th edition skin update (Histopathology 2025, https://onlinelibrary.wiley.com/doi/full/10.1111/his.15562)
// no longer lists pseudovascular SCC or adenosquamous carcinoma as SCC subtypes; the QMH page keeps
// both, and so does the list here.

const NOS_BY_GRADE = {
  G1: 'It is composed of nests and sheets of keratinocytes with abundant eosinophilic cytoplasm, keratin pearls and readily seen intercellular bridges.',
  G2: 'It is composed of irregular nests of keratinocytes with moderate nuclear pleomorphism and frequent mitoses, keratinisation being limited to scattered keratin pearls and individually keratinised cells.',
  G3: 'It is composed of cords and sheets of pleomorphic cells with frequent mitoses, squamous differentiation being evident only as rare intercellular bridges or small foci of keratinisation.',
  G4: 'It is composed of sheets of pleomorphic cells with no recognisable squamous differentiation on morphology.'
};
const NOS_DEFAULT = 'It is composed of infiltrating nests and sheets of atypical keratinocytes with eosinophilic cytoplasm and keratinisation.';

export const MORPHOLOGY = {
  Keratoacanthoma: 'A crateriform, keratin-filled invagination is lined by squamous epithelium with abundant glassy eosinophilic cytoplasm and flanked by lips of the adjacent epidermis, with intraepithelial neutrophilic microabscesses; atypia and mitoses are confined to the periphery of the lobules.',
  'Acantholytic squamous cell carcinoma': 'Loss of cohesion between the tumour cells forms suprabasal clefts and pseudoglandular spaces containing rounded acantholytic keratinocytes with eosinophilic cytoplasm.',
  'Spindle cell squamous cell carcinoma': 'It is composed of fascicles and sheets of pleomorphic spindle cells with little or no keratinisation.',
  'Verrucous squamous cell carcinoma': 'An exophytic and endophytic proliferation of squamous epithelium with papillomatosis and marked hyperkeratosis pushes into the dermis as broad bulbous rete, with minimal cytological atypia and an inflamed stroma at the advancing edge.',
  'Adenosquamous carcinoma': 'Infiltrating islands of squamous cells in a desmoplastic stroma are admixed with gland-like structures lined by cuboidal to low columnar cells.',
  'Clear cell squamous cell carcinoma': 'Nests of squamous tumour cells with abundant clear cytoplasm predominate.',
  'Squamous cell carcinoma with sarcomatoid differentiation': 'Sarcomatoid areas of pleomorphic spindle and epithelioid cells lie alongside the squamous component.',
  'Squamous cell carcinoma with osteoclast-like giant cells': 'Bland multinucleated osteoclast-like giant cells are scattered among the atypical squamous tumour cells.',
  'Pseudovascular squamous cell carcinoma': 'Acantholysis forms anastomosing slit-like spaces lined by atypical squamous cells, resembling vascular channels.',
  'Lymphoepithelioma-like carcinoma': 'Syncytial nests of large epithelioid cells with vesicular nuclei and prominent nucleoli lie within a dense lymphoplasmacytic infiltrate.'
};

/** The descriptive sentence for a type (grade-dependent for SCC NOS); '' for a type not listed. */
export function typeMorphology(type, grade) {
  if (type === 'Squamous cell carcinoma, not otherwise specified') {
    const g = /^(G[1-4]),/.exec(grade || '');
    return g ? NOS_BY_GRADE[g[1]] : NOS_DEFAULT;
  }
  return MORPHOLOGY[type] || '';
}

// Pick-list phrases: "p40 positive" -> "p40"; a negative keeps its " negative" suffix, which
// ihcPhrase() turns into "are negative for ...". Squamous lineage (p40, p63, CK5/6, AE1/AE3, EMA);
// melanoma (SOX10, S100, Melan-A) for the spindle and epithelioid types; CD34 and desmin for the
// pseudovascular and spindle cell differentials; EBER for lymphoepithelioma-like carcinoma.
export const IHC_PHRASE = {
  'p40 positive': 'p40',
  'p63 positive': 'p63',
  'CK5/6 positive': 'CK5/6',
  'AE1/AE3 positive': 'AE1/AE3',
  'EMA positive': 'EMA',
  'SOX10 negative': 'SOX10 negative',
  'S100 negative': 'S100 negative',
  'Melan-A negative': 'Melan-A negative',
  'CD34 negative': 'CD34 negative',
  'Desmin negative': 'desmin negative',
  'EBER ISH negative': 'EBER (in situ hybridisation) negative'
};
