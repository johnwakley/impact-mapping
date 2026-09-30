import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { controlOwnsKey, isControl, trapTab } from './keys.ts'
import type { FocusTarget } from './keys.ts'

const el = (tag: string, extra: Partial<FocusTarget> = {}): FocusTarget => ({
  tag,
  role: null,
  inputType: null,
  editable: false,
  href: false,
  ...extra,
})

const body = el('BODY')
const button = el('BUTTON')

describe('which keys a focused control keeps', () => {
  it('leaves every key to the canvas while focus is on the page', () => {
    for (const key of [' ', 'Enter', 'Tab', 'ArrowUp', 'Delete', 'F2']) {
      assert.equal(controlOwnsKey(key, body), false, key)
    }
    assert.equal(controlOwnsKey(' ', el('DIV')), false)
  })

  it('gives a button its activation keys and Tab', () => {
    assert.equal(controlOwnsKey(' ', button), true)
    assert.equal(controlOwnsKey('Enter', button), true)
    assert.equal(controlOwnsKey('Tab', button), true)
  })

  it('keeps canvas shortcuts a button has no use for', () => {
    // After clicking Undo, the arrows should still move the selection.
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'F2']) {
      assert.equal(controlOwnsKey(key, button), false, key)
    }
  })

  it('gives composite widgets their arrow keys too', () => {
    const item = el('DIV', { role: 'menuitem' })
    assert.equal(controlOwnsKey('ArrowDown', item), true)
    assert.equal(controlOwnsKey('Home', item), true)
    assert.equal(controlOwnsKey(' ', item), true)
    assert.equal(controlOwnsKey('Delete', item), false)
  })

  it('gives text entry every key', () => {
    for (const t of [el('INPUT', { inputType: 'text' }), el('TEXTAREA'), el('SELECT'), el('DIV', { editable: true })]) {
      for (const key of [' ', 'Enter', 'Tab', 'ArrowUp', 'Delete', 'Backspace']) {
        assert.equal(controlOwnsKey(key, t), true, `${t.tag} ${key}`)
      }
    }
  })

  it('treats button-like inputs as buttons, not text', () => {
    const box = el('INPUT', { inputType: 'checkbox' })
    assert.equal(controlOwnsKey(' ', box), true)
    assert.equal(controlOwnsKey('Delete', box), false)
  })

  it('counts a link only if it goes somewhere', () => {
    assert.equal(isControl(el('A', { href: true })), true)
    assert.equal(isControl(el('A')), false)
    assert.equal(controlOwnsKey('Enter', el('A', { href: true })), true)
  })
})

describe('Tab inside a dialog', () => {
  it('lets the browser move focus between the ends', () => {
    assert.equal(trapTab(1, 4, false), null)
    assert.equal(trapTab(2, 4, true), null)
  })

  it('wraps from the last control to the first, and back', () => {
    assert.equal(trapTab(3, 4, false), 0)
    assert.equal(trapTab(0, 4, true), 3)
  })

  it('pulls focus in from outside the list', () => {
    // The dialog container takes focus on open and is not in the list.
    assert.equal(trapTab(-1, 4, false), 0)
    assert.equal(trapTab(-1, 4, true), 3)
  })

  it('keeps a single control focused', () => {
    assert.equal(trapTab(0, 1, false), 0)
    assert.equal(trapTab(0, 1, true), 0)
  })
})
