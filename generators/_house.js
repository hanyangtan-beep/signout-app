// House helpers shared by the generators.
//
// Every generator used to carry its own copy of these. That was fine until the copies drifted:
// `stripDot` existed in 27 generators in four different forms, so the same typed text was
// trimmed differently depending on which template you were in. The house form lives here now.
//
// KNOWN DIVERGENCES, deliberately left in place because changing them would move released
// wording and that is your call, not a refactor's:
//   - appendix_carcinoma, gallbladder_carcinoma, gastric_carcinoma, oesophageal_carcinoma
//     also strip a trailing colon: /[.;:\s]+$/
//   - turbt also strips a trailing comma: /[.;,\s]+$/
//   - cytology strips a trailing full stop only: /\.$/
// Each of those files keeps its local definition with a comment pointing here.

/** Trim trailing full stops, semicolons and whitespace. The house form. */
export const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');

/**
 * The lettered block key: one "(n) entry." per typed line, prefixed with the part letter
 * when the case has more than one letter. Returns '' when the macro block is switched off.
 *
 * `strip` is passed in rather than imported so the four generators with a divergent
 * `stripDot` keep their exact current behaviour while still sharing this body.
 */
export function letteredBlockKey(part, ctx, { lettered, strip = stripDot }) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const lines = String(part.values.blockKeyText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const m = l.match(/^\(?([\dA-Za-z]+(?:\s*[-–,]\s*[\dA-Za-z]+)*)\)?[\s.:)-]+(.*)$/);
    return m ? `(${lettered(part, ctx) ? part.label : ''}${m[1].replace(/\s+/g, '')}) ${strip(m[2])}.` : `${strip(l)}.`;
  }).join('\n');
}

/**
 * The checks collector every validator opens with.
 *
 * `err` / `warn` take the message and, optionally, the id of the field the check is about;
 * the Checks panel uses that id to jump to the field. Omit it when a check does not point at
 * one field. `out` is the array the validator returns.
 */
export function checks() {
  const out = [];
  const at = (level, message, field) => out.push(field ? { level, message, field } : { level, message });
  return { out, at, err: (m, f) => at('error', m, f), warn: (m, f) => at('warn', m, f) };
}
