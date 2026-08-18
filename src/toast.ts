import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
}

interface ToastStore {
  toasts: Toast[]
  push: (message: string, tone?: Toast['tone']) => void
}

let sequence = 0

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = (sequence += 1)
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      tone === 'error' ? 5000 : 3000,
    )
  },
}))

export function toast(message: string, tone?: Toast['tone']): void {
  useToasts.getState().push(message, tone)
}
