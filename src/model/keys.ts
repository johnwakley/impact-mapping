/**
 * Which keys a focused control keeps for itself, so the canvas's shortcuts can
 * leave them alone.
 *
 * The canvas listens on window and drives the selected card with Space, Enter,
 * Tab and the arrows. That is right while focus is on the page body, and wrong
 * once focus is on a control: Space and Enter on a toolbar button toggled or
 * added a card instead of pressing the button, so nothing in the toolbar could
 * be activated from the keyboard while a card was selected.
 *
 * Only the keys a control actually uses are yielded. A plain button uses the
 * activation keys and Tab; arrows and Delete mean nothing to it, so after
 * clicking Undo the arrows still move the selection. Composite widgets (menu
 * items, tabs, options) also use the arrows, and text entry uses everything.
 *
 * Pure, so it can be tested without a DOM: the hook describes the focused
 * element and asks.
 */

export interface FocusTarget {
  /** Upper-case tag name, as Element.tagName reports it. */
  tag: string
  /** The ARIA role attribute, if any. */
  role: string | null
  /** For <input>, its type attribute (lower-case); otherwise null. */
  inputType: string | null
  /** Element.isContentEditable. */
  editable: boolean
  /** For <a>, whether it has an href — an anchor without one is not a link. */
  href: boolean
}

const BUTTONLIKE_INPUTS = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'image', 'color', 'file'])
const BUTTON_ROLES = new Set(['button', 'link', 'checkbox', 'switch', 'menuitemcheckbox', 'menuitemradio'])
const COMPOSITE_ROLES = new Set(['menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab', 'option', 'radio', 'treeitem', 'gridcell', 'slider', 'spinbutton'])
const ACTIVATION = new Set(['Enter', ' ', 'Tab'])
const NAVIGATION = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'])

/** Does the focused element take every key, as a text field does? */
export function isTextEntry(t: FocusTarget): boolean {
  if (t.editable || t.tag === 'TEXTAREA' || t.tag === 'SELECT') return true
  return t.tag === 'INPUT' && !BUTTONLIKE_INPUTS.has(t.inputType ?? 'text')
}

/** Is the focused element a control at all (anything but the page itself)? */
export function isControl(t: FocusTarget): boolean {
  if (isTextEntry(t)) return true
  if (t.tag === 'BUTTON' || t.tag === 'SUMMARY' || t.tag === 'INPUT') return true
  if (t.tag === 'A' && t.href) return true
  return t.role !== null && (BUTTON_ROLES.has(t.role) || COMPOSITE_ROLES.has(t.role))
}

/** Should the canvas leave this key to the focused element? */
export function controlOwnsKey(key: string, t: FocusTarget): boolean {
  if (isTextEntry(t)) return true
  if (!isControl(t)) return false
  if (ACTIVATION.has(key)) return true
  return t.role !== null && COMPOSITE_ROLES.has(t.role) && NAVIGATION.has(key)
}

/**
 * Where Tab should send focus inside a dialog, as an index into its focusable
 * elements — or null to let the browser move it. Wraps from the last to the
 * first and back, and pulls focus in from anywhere outside the list (the
 * dialog container itself, which takes focus on open, counts as outside).
 * With nothing focusable it returns null, and the caller must hold focus.
 */
export function trapTab(activeIndex: number, count: number, shift: boolean): number | null {
  if (count === 0) return null
  if (activeIndex < 0) return shift ? count - 1 : 0
  if (shift && activeIndex === 0) return count - 1
  if (!shift && activeIndex === count - 1) return 0
  return null
}
