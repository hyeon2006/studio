import { computed, markRaw, reactive } from 'vue'

type ModalComponent<T, U> = new () => {
    $props: { data: T }
    $emit: (event: 'close', result: U) => void
}

interface ModalOptions {
    dismissible?: boolean
}

const modals = reactive<
    {
        component: unknown
        data: unknown
        dismissible: boolean
        resolve: (result?: unknown) => void
    }[]
>([])

export function useModal() {
    const modal = computed(() => modals[0])

    return {
        modal,
    }
}

export function show<T, U>(component: ModalComponent<T, U>, data: T, options: ModalOptions = {}) {
    return new Promise<U | undefined>((resolve) => {
        const modal = {
            component: markRaw(component),
            data,
            dismissible: options.dismissible ?? true,
            resolve(result?: unknown) {
                modals.splice(modals.indexOf(modal), 1)
                resolve(result as U)
            },
        }
        modals.push(modal)
    })
}
