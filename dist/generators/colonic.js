// Colonic polyp generator. Ported from legacy/colonic-polyp-signout.html.
// Pure functions: (part, ctx) -> string. Wording protected by tests/fixtures/colonic.

export const templates = {
  tubularAdenoma: {
    label: 'Tubular adenoma',
    micro: {
      'Low grade dysplasia': 'Sections show a polypoid piece of large intestinal mucosa featuring tubular crypts with low grade dysplasia. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a polypoid piece of large intestinal mucosa featuring tubular crypts with high grade dysplasia. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'Low grade dysplasia': 'TUBULAR ADENOMA WITH LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'TUBULAR ADENOMA WITH HIGH GRADE DYSPLASIA'
    }
  },
  tubulovillousAdenoma: {
    label: 'Tubulovillous adenoma',
    micro: {
      'Low grade dysplasia': 'Sections show a polypoid fragment of large intestinal mucosa with tubulovillous architecture and low grade dysplasia. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a polypoid fragment of large intestinal mucosa with tubulovillous architecture and high grade dysplasia. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'Low grade dysplasia': 'TUBULOVILLOUS ADENOMA WITH LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'TUBULOVILLOUS ADENOMA WITH HIGH GRADE DYSPLASIA'
    }
  },
  villousAdenoma: {
    label: 'Villous adenoma',
    micro: {
      'Low grade dysplasia': 'Sections show a polypoid fragment of large intestinal mucosa with predominant villous architecture and low grade dysplasia. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a polypoid fragment of large intestinal mucosa with predominant villous architecture and high grade dysplasia. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'Low grade dysplasia': 'VILLOUS ADENOMA WITH LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'VILLOUS ADENOMA WITH HIGH GRADE DYSPLASIA'
    }
  },
  sessileSerrated: {
    label: 'Sessile serrated lesion / adenoma',
    micro: {
      'No dysplasia': 'Sections show a serrated polyp with architectural features in keeping with a sessile serrated lesion / adenoma. No cytological dysplasia is identified. There is no evidence of invasive malignancy.',
      'Low grade dysplasia': 'Sections show a sessile serrated lesion / adenoma with superimposed low grade dysplasia. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a sessile serrated lesion / adenoma with superimposed high grade dysplasia. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'No dysplasia': 'SESSILE SERRATED LESION / ADENOMA',
      'Low grade dysplasia': 'SESSILE SERRATED LESION / ADENOMA WITH LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'SESSILE SERRATED LESION / ADENOMA WITH HIGH GRADE DYSPLASIA'
    }
  },
  hyperplasticPolyp: {
    label: 'Hyperplastic polyp',
    micro: {
      'Not applicable': 'Sections show a polypoid piece of large intestinal mucosa featuring hyperplastic crypts with stellate-shaped lumina, in keeping with hyperplastic polyp. There is no evidence of dysplasia or malignancy.'
    },
    diagnosis: {
      'Not applicable': 'HYPERPLASTIC POLYP'
    }
  },
  traditionalSerrated: {
    label: 'Traditional serrated adenoma',
    micro: {
      'Low grade dysplasia': 'Sections show a serrated polyp with ectopic crypt formation and conventional low grade dysplasia, in keeping with a traditional serrated adenoma. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a serrated polyp with ectopic crypt formation and high grade dysplasia, in keeping with a traditional serrated adenoma. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'Low grade dysplasia': 'TRADITIONAL SERRATED ADENOMA WITH LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'TRADITIONAL SERRATED ADENOMA WITH HIGH GRADE DYSPLASIA'
    }
  }
};

const UNSPECIFIED = 'Colon, site not specified';
const titleCaseSite = (site) => (site === UNSPECIFIED ? 'Colon' : site);
const sentenceCase = (text) => text.charAt(0) + text.slice(1).toLowerCase();

/** Resolve a (type, dysplasia) pair, falling back to the first valid grade for that type. */
function resolve(values) {
  const t = templates[values.type] || templates.tubularAdenoma;
  const grade = t.micro[values.dysplasia] ? values.dysplasia : Object.keys(t.micro)[0];
  return { t, grade };
}

export function specimenName(part) {
  const s = part.values;
  return (s.customSpecimen || '').trim() || `${titleCaseSite(s.site)} polyp`;
}

export function microscopy(part) {
  const { t, grade } = resolve(part.values);
  let text = t.micro[grade];
  const c = (part.values.comment || '').trim();
  if (c) text += ` ${c}`;
  return `(${part.label})  ${text}`;
}

export function diagnosis(part, ctx) {
  const s = part.values;
  const upper = !!ctx.options.uppercaseDx;
  const { t, grade } = resolve(s);
  const siteText = upper ? (s.site === UNSPECIFIED ? 'COLON' : s.site.toUpperCase()) : titleCaseSite(s.site);
  const dx = upper ? t.diagnosis[grade] : sentenceCase(t.diagnosis[grade]);
  return `(${part.label}) ${siteText}, ${specimenName(part)}, ${ctx.schema.specimenNoun} - ${dx}.`;
}

export default { specimenName, microscopy, diagnosis };
