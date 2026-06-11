<script setup lang="ts">
import { dismiss, type ToastType, useToasts } from '../composables/toast'
import IconCheck from '../icons/check-solid.svg?component'
import IconExclamation from '../icons/exclamation-circle-solid.svg?component'
import IconQuestion from '../icons/question-circle-solid.svg?component'

const { toasts } = useToasts()

const icons: Record<ToastType, unknown> = {
    success: IconCheck,
    error: IconExclamation,
    info: IconQuestion,
}
</script>

<template>
    <div
        class="pointer-events-none fixed top-10 right-2 z-[60] flex w-full max-w-xs flex-col items-end gap-2"
    >
        <TransitionGroup
            enter-from-class="opacity-0 translate-x-4"
            enter-to-class="opacity-100 translate-x-0"
            enter-active-class="transition-all duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            leave-active-class="transition-all duration-200"
        >
            <button
                v-for="toast in toasts"
                :key="toast.id"
                class="pointer-events-auto flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-left text-sm shadow-lg shadow-black/40 backdrop-blur-md"
                @click="dismiss(toast.id)"
            >
                <component
                    :is="icons[toast.type]"
                    class="icon flex-none"
                    :class="{
                        'text-sonolus-success': toast.type === 'success',
                        'text-sonolus-warning': toast.type === 'error',
                    }"
                />
                <div class="min-w-0 whitespace-pre-line">{{ toast.message }}</div>
            </button>
        </TransitionGroup>
    </div>
</template>
