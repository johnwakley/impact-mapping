import { useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

interface MenuProps {
  label: ReactNode
  title?: string
  align?: 'left' | 'right'
  /** Filters stay open while you tick things; one-shot actions do not. */
  closeOnSelect?: boolean
  children: ReactNode
}

export function Menu({
  label,
  title,
  align = 'right',
  closeOnSelect = true,
  children,
}: MenuProps): ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent): void => {
      if (!ref.current?.contains(e.target as globalThis.Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="btn"
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div
          className={`menu__list menu__list--${align}`}
          role="menu"
          onClick={closeOnSelect ? () => setOpen(false) : undefined}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  onClick: () => void
  children: ReactNode
  hint?: string
}

export function MenuItem({ onClick, children, hint }: MenuItemProps): ReactElement {
  return (
    <button type="button" className="menu__item" role="menuitem" onClick={onClick}>
      <span>{children}</span>
      {hint && <small>{hint}</small>}
    </button>
  )
}

export function MenuSeparator(): ReactElement {
  return <div className="menu__sep" role="separator" />
}
