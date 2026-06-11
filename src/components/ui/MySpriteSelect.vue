<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { computed, ref } from 'vue'
import IconAngleDown from '../../icons/angle-down-solid.svg?component'
import MyImageIcon from './MyImageIcon.vue'

const props = defineProps<{
    modelValue: string
    options: {
        value: string
        label: string
        image: string
    }[]
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const container = ref<HTMLElement>()

onClickOutside(container, () => (isOpen.value = false))

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))
</script>

<template>
    <div ref="container" class="relative h-8 w-full">
        <button
            class="clickable hover:bg-sonolus-ui-button-highlight flex h-full w-full items-center justify-center gap-2 rounded-md border-none px-8 py-0 text-center transition-colors"
            @click="isOpen = !isOpen"
        >
            <template v-if="selected">
                <MyImageIcon :src="selected.image" class="h-6 w-6 flex-shrink-0" fill />
                <span class="truncate">{{ selected.label }}</span>
            </template>
            <span v-else class="text-sonolus-ui-text-disabled">Select sprite...</span>
            
            <IconAngleDown class="icon pointer-events-none absolute top-2 right-2" />
        </button>

        <div
            v-if="isOpen"
            class="bg-sonolus-main absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-white/10 shadow-lg"
        >
            <button
                v-for="option in options"
                :key="option.value"
                class="clickable flex w-full items-center justify-center gap-2 px-8 py-1 text-center transition-colors hover:bg-sonolus-ui-button-highlight bg-sonolus-main"
                :class="{ 'bg-sonolus-ui-button-normal': option.value === modelValue }"
                @click="
                    emit('update:modelValue', option.value);
                    isOpen = false
                "
            >
                <MyImageIcon :src="option.image" class="h-6 w-6 flex-shrink-0" fill />
                <span class="truncate">{{ option.label }}</span>
            </button>
        </div>
    </div>
</template>