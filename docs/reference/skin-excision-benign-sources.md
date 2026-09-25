# Skin excision — benign lesion list (Phase 40) — sources

Added 2026-09-25 at the user's request ("skin adnexal tumours, neurofibroma"). Skin excision (`skin_excision`) now offers 41 diagnoses in eight groups on the Diagnosis list (`optionGroups`), with two catch-alls after the groups: "Benign adnexal tumour, other" and "Benign, other". The printed paragraphs are in `generators/skinexcision.js` (`LESION_MICRO`, `MAIN`) and tested in `tests/skin_excision_benign.test.js`.

Every paragraph follows the report-register rule in `docs/new-template-brief.md`: it describes what is seen and closes with the house negative sentence. The sources below are for the text and do not appear in the report.

## Released wording (aggregate counts only)

Released diagnosis lines from the 2021–2026 biopsy export and the 2024–2026 LIS export, checked on 2026-09-25:

- Neurofibroma: 43 lines, 38 of them on a SKIN specimen line. Most skin neurofibromas, verrucae, fibroepithelial polyps, scars and keloids, and adnexal tumours on SKIN specimen lines are excisions, so these lesions go on Skin excision rather than Skin lesion (shave / punch).
- Adnexal tumours seen: poroma 8, trichoblastoma 5, pilomatrixoma / pilomatricoma 5, sebaceous hyperplasia 5, trichoepithelioma 4, sebaceoma 3, adnexal tumour not otherwise named 3, naevus sebaceus 1. Hidradenoma, spiradenoma, cylindroma, syringoma, trichilemmoma, syringocystadenoma papilliferum, trichofolliculoma and mixed tumour did not appear; they are on the list for completeness.
- Other benign lesions on SKIN specimen lines: verruca 46, scar or keloid 36, fibroepithelial polyp 35, haemangioma 27, lipoma 15, schwannoma 3, granular cell tumour 1.
- Name forms: PILOMATRIXOMA in 3 of 5 lines (PILOMATRICOMA 2). PathologyOutlines prefers "pilomatricoma", which also works as a search alias. FIBROEPITHELIAL POLYP in 33 of 35 skin lines (ACROCHORDON 2). VERRUCA VULGARIS in 46 of 46. The one naevus sebaceus line was spelt NEVUS; the app prints the British NAEVUS SEBACEUS.

## Routing

- Clinical words (history only, +2 capped, `match.clinical`): neurofibroma, adnexal tumour / tumor, pilomatrixoma, pilomatricoma, poroma, trichoepithelioma, trichoblastoma, trichilemmoma, hidradenoma, spiradenoma, cylindroma, syringoma, sebaceoma, sebaceous adenoma, sebaceous hyperplasia, verruca, keloid. A SKIN excision line with one of these words in the history now opens Skin excision instead of offering a choice of Skin cyst and Skin excision.
- Words left out on purpose: "sebaceous" (it would tie Skin cyst on "sebaceous cyst"), "lipoma", "schwannoma" and "haemangioma" (Soft tissue keeps them), and "scar", "wart" and "skin tag" (too general for a history-only cue; "wart" and "skin tag" also name anal and perianal lesions).
- Picker aliases: the lesion names find Skin excision first. "adnexal" still finds the ovary form first, "lipoma" finds Soft tissue and "sebaceous" finds Skin cyst.

## Sources by lesion

| Option | Printed features | Source |
|---|---|---|
| Pilomatrixoma | lobulated, circumscribed dermal tumour; basaloid islands with abrupt keratinisation to shadow cells; foreign body giant cells, calcification | [PathologyOutlines — pilomatricoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticpilomatrixoma.html) |
| Trichoepithelioma | superficial dermal basaloid nests with keratin horn cysts; cellular fibrous stroma; papillary mesenchymal bodies | [PathologyOutlines — trichoepithelioma / trichoblastoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocytictrichoepithelioma.html) |
| Trichoblastoma | well-circumscribed dermal basaloid nests with peripheral palisading; prominent cellular stroma, papillary mesenchymal bodies; minimal pleomorphism | [PathologyOutlines — trichoepithelioma / trichoblastoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocytictrichoepithelioma.html) |
| Trichilemmoma | lobular squamoproliferative lesion in continuity with the epidermis; pale to clear cells; peripheral palisade; distinct basement membrane; hyperkeratosis | [PathologyOutlines — trichilemmoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocytictrichilemmoma.html) |
| Trichofolliculoma | dilated central follicle opening onto the epidermis, with keratin; radiating secondary vellus follicles; cellular stroma | [PathologyOutlines — trichofolliculoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocytictrichofolliculoma.html) |
| Poroma | replaces the epidermis, broad anastomosing bands of small cuboidal cells; sharp demarcation from keratinocytes; ducts with an eosinophilic lining; delicate fibrovascular stroma | [PathologyOutlines — poroma](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticeccrineporoma.html) |
| Hidradenoma | circumscribed, unencapsulated, solid and cystic, no epidermal connection; polyhedral and clear cells; tubular lumina; hyalinised stroma | [PathologyOutlines — hidradenoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticeccrineacrospiroma.html) |
| Spiradenoma | circumscribed basophilic dermal nodules; small dark peripheral and large pale central cells; trabeculae; lymphocytes; ducts; basement membrane material | [PathologyOutlines — spiradenoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticeccrinespiradenoma.html) |
| Cylindroma | jigsaw nests of basaloid cells in thick basement membrane; peripheral small dark cells, central pale cells | [PathologyOutlines — cylindroma](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticeccrinecylindroma.html) |
| Syringoma | circumscribed ducts, nests and cords in the superficial dermis; two-layered comma-shaped ducts; sclerotic stroma; no atypia | [PathologyOutlines — syringoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticsyringoma.html) |
| Syringocystadenoma papilliferum | cystic invaginations with papillae; inner columnar cells with decapitation secretion, outer cuboidal cells; plasma cells in the stroma | [PathologyOutlines — syringocystadenoma papilliferum](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticpapillarysyringadenoma.html) |
| Mixed tumour (chondroid syringoma) | circumscribed multilobulated tumour; bland epithelial and myoepithelial cells, two-layered tubules; chondroid or myxoid stroma | [PathologyOutlines — cutaneous mixed tumour](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticchondroidsyringoma.html) |
| Sebaceous hyperplasia | enlarged mature lobules around a dilated central duct; germinative layer of 1–2 cells | [PathologyOutlines — sebaceous hyperplasia](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticsenilesebaceoushyperplasia.html) |
| Sebaceous adenoma | circumscribed lobules; peripheral basaloid cells, central sebocytes; basaloid cells under half (over half is sebaceoma) | [PathologyOutlines — sebaceous adenoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticsebaceousadenoma.html) |
| Sebaceoma | dermal nodules of basaloid cells with sebocytes and duct-like spaces; basaloid cells predominate; no atypical mitoses or necrosis | [PathologyOutlines — sebaceoma](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticsebaceoma.html), with the proportion rule from the sebaceous adenoma page |
| Naevus sebaceus | acanthosis and papillomatosis; immature follicles; sebaceous glands opening onto the surface | [PathologyOutlines — nevus sebaceus](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticnevussebaceus.html) |
| Neurofibroma | bland wavy spindle cells in a myxoid to collagenous stroma; mast cells (Skin lesion house sentence) | [PathologyOutlines — neurofibroma](https://www.pathologyoutlines.com/topic/softtissueneurofibroma.html) |
| Schwannoma | encapsulated; Antoni A with Verocay bodies, Antoni B; wavy tapered nuclei; hyalinised vessel walls | [PathologyOutlines — schwannoma](https://www.pathologyoutlines.com/topic/softtissueschwannoma.html) |
| Granular cell tumour | large polygonal cells with abundant eosinophilic granular cytoplasm and small central nuclei | [PathologyOutlines — granular cell tumour](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticgct.html) |
| Verruca vulgaris | hyperkeratosis, parakeratosis, papillomatosis, inward bending of rete ridges, koilocytes (Skin lesion house sentence) | [PathologyOutlines — warts](https://www.pathologyoutlines.com/topic/skinnontumorwarts.html) |
| Fibroepithelial polyp | polypoid skin with a loose fibrovascular core, adipose tissue in larger lesions (Skin lesion house sentence) | [PathologyOutlines — fibroepithelial polyp](https://www.pathologyoutlines.com/topic/skintumornonmelanocyticfibroepithelialpolyp.html) |
| Scar | collagen parallel to the surface; vertically orientated vessels | [StatPearls — hypertrophic scars and keloids](https://www.ncbi.nlm.nih.gov/books/NBK537058/) |
| Keloid | thick glassy keloidal collagen; increased fibroblasts; replaces adnexa (Skin lesion house sentence) | [PathologyOutlines — keloid](https://www.pathologyoutlines.com/topic/earkeloid.html), [DermNet — keloid and hypertrophic scar](https://dermnetnz.org/topics/keloid-and-hypertrophic-scar) |
| Haemangioma | vascular channels lined by flattened endothelium (Skin lesion house sentence) | [PathologyOutlines — haemangioma](https://www.pathologyoutlines.com/topic/softtissuehemangioma.html), [DermNet — cherry angioma](https://dermnetnz.org/topics/cherry-angioma-pathology) |
| Lipoma | lobulated mature adipocytes with thin fibrous septa (Soft tissue house sentence for lipoblasts) | [PathologyOutlines — lipoma](https://www.pathologyoutlines.com/topic/softtissueadiposelipoma.html) |
