import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
    id: number
    type: ToastType
    message: string
}

const toasts = reactive<Toast[]>([])

let nextId = 0

export function useToasts() {
    return {
        toasts,
    }
}

export function toast(message: string, type: ToastType = 'info', duration = 2500) {
    const id = nextId++

    toasts.push({ id, type, message })

    setTimeout(() => {
        dismiss(id)
    }, duration)
}

export function dismiss(id: number) {
    const index = toasts.findIndex((toast) => toast.id === id)
    if (index === -1) return

    toasts.splice(index, 1)
}
