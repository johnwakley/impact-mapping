import type { ReactElement } from 'react'
import { useToasts } from '../toast.ts'

export function Toasts(): ReactElement | null {
  const toasts = useToasts((s) => s.toasts)
  if (!toasts.length) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone === 'error' ? 'toast--error' : ''}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
