// Pure-function extraction of the report logic in legacy/colonic-polyp-signout.html.
// Template text and builder bodies are copied verbatim; DOM access (checkbox state)
// has been replaced by explicit options. Frozen reference for golden tests.

const letters = 'ABCDEFGHIJ'.split('');
const sites = ['Cecum', 'Ascending colon', 'Hepatic flexure', 'Transverse colon', 'Splenic flexure', 'Descending colon', 'Sigmoid', 'Rectosigmoid', 'Rectum', 'Colon, site not specified'];

const templates = {
  tubularAdenoma: {
    label: 'Tubular adenoma',
    dysplasia: ['Low grade dysplasia', 'High grade dysplasia'],
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
    dysplasia: ['Low grade dysplasia', 'High grade dysplasia'],
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
    dysplasia: ['Low grade dysplasia', 'High grade dysplasia'],
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
    dysplasia: ['No dysplasia', 'Low grade dysplasia', 'High grade dysplasia'],
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
    dysplasia: ['Not applicable'],
    micro: {
      'Not applicable': 'Sections show a polypoid piece of large intestinal mucosa featuring hyperplastic crypts with stellate-shaped lumina, in keeping with hyperplastic polyp. There is no evidence of dysplasia or malignancy.'
    },
    diagnosis: {
      'Not applicable': 'HYPERPLASTIC POLYP'
    }
  },
  traditionalSerrated: {
    label: 'Traditional serrated adenoma',
    dysplasia: ['Low grade dysplasia', 'High grade dysplasia'],
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

const defaultState = () => ({ site: 'Sigmoid', type: 'tubularAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' });

function titleCaseSite(site) { return site === 'Colon, site not specified' ? 'Colon' : site; }
function specimenName(s) { return s.customSpecimen.trim() || `${titleCaseSite(s.site)} polyp`; }
function sentenceCaseDiagnosis(text) { return text.charAt(0) + text.slice(1).toLowerCase(); }

function buildDxLine(s, idx, uppercaseDx) {
  const siteText = uppercaseDx ? (s.site === 'Colon, site not specified' ? 'COLON' : s.site.toUpperCase()) : titleCaseSite(s.site);
  const specimenText = specimenName(s);
  const diagnosisText = uppercaseDx ? templates[s.type].diagnosis[s.dysplasia] : sentenceCaseDiagnosis(templates[s.type].diagnosis[s.dysplasia]);
  return `(${letters[idx]}) ${siteText}, ${specimenText}, polypectomy - ${diagnosisText}.`;
}

/**
 * Equivalent of buildReport() in the HTML.
 * @param {{specimens: object[], includeHeader: boolean, uppercaseDx: boolean}} input
 * @returns {string}
 */
function buildReport(input) {
  const specimens = input.specimens;
  const includeHeader = !!input.includeHeader;
  const uppercaseDx = !!input.uppercaseDx;
  const specimenBlock = specimens.map((s, idx) => `(${letters[idx]}) ${specimenName(s)}`).join('\n');
  const microBlock = specimens.map((s, idx) => {
    let text = templates[s.type].micro[s.dysplasia];
    if (s.comment.trim()) text += ` ${s.comment.trim()}`;
    return `(${letters[idx]})  ${text}`;
  }).join('\n\n');
  const dxBlock = specimens.map((s, idx) => buildDxLine(s, idx, uppercaseDx)).join('\n');
  if (!includeHeader) return `${specimenBlock}\n\n${microBlock}\n\n${dxBlock}`;
  return `SPECIMEN:\n${specimenBlock}\n\nMICROSCOPIC EXAMINATION:\n${microBlock}\n\nDIAGNOSIS:\n${dxBlock}`;
}

module.exports = { letters, sites, templates, defaultState, specimenName, buildDxLine, buildReport };
