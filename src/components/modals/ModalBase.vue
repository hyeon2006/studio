<script setup lang="ts">
import { type Component } from 'vue'

defineProps<{
    icon: Component
    title: string
}>()

const titleId = `modal-${Math.random().toString(36).slice(2)}`
</script>

<template>
    <div
        class="bg-sonolus-ui-surface overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
    >
        <div class="flex h-12 items-center bg-white/5 px-2">
            <component :is="icon" class="h-6 w-6 flex-none fill-current" />
            <div :id="titleId" class="mr-6 w-full flex-grow text-center text-xl font-semibold">
                {{ title }}
            </div>
        </div>

        <div class="my-8 px-4 text-center sm:px-8">
            <slot />
        </div>

        <div class="flex h-12 items-center justify-center px-2">
            <slot name="actions" />
        </div>
    </div>
</template>
