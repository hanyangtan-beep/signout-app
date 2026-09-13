// Packed-form helpers. Kept out of app.js so they can be unit-tested without a DOM.
//
// A template opts in with `"layout": { "pack": true }` in its schema. Its fields then render in an
// auto-fitting grid (see .part-panel.pack in styles.css) instead of one field per row, which is where
// most of the vertical space on a wide screen was going. docs/specs/layout-3col.md

/**
 * Should this field take the whole row of a packed grid?
 *
 * Full-width by default when the control needs the width: free text over several lines, a
 * tick-all-that-apply chip set, or a dropdown whose option labels are long enough to truncate in a
 * half cell. An explicit `span` on the schema field always wins.
 *
 * @param {{type?: string, span?: 'full'|'half'}} field
 * @param {number} optionCount number of options currently offered (0 for non-choice fields)
 */
export function spanFull(field, optionCount = 0) {
  if (!field) return false;
  if (field.span === 'full') return true;
  if (field.span === 'half') return false;
  if (field.type === 'textarea' || field.type === 'multiselect') return true;
  if (field.type === 'select' && optionCount > 12) return true;
  return false;
}

/**
 * How much of a group is answered, counting only the fields the current entries actually show.
 * A finished group collapses itself and its pill in the section rail turns to a tick.
 *
 * @param {Array} fields fields belonging to one group
 * @param {object} values the part's values
 * @param {(field: object, values: object) => boolean} isVisible visibility predicate from the engine
 */
export function groupProgress(fields, values, isVisible) {
  let shown = 0;
  let filled = 0;
  for (const f of fields) {
    if (isVisible && !isVisible(f, values)) continue;
    shown += 1;
    const v = values?.[f.id];
    if (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '') filled += 1;
  }
  return { shown, filled, complete: shown > 0 && filled === shown };
}
