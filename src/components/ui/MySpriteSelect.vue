<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
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
const highlightedIndex = ref(-1)
const container = ref<HTMLElement>()
const listboxId = `sprite-select-${Math.random().toString(36).slice(2)}`

onClickOutside(container, close)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))
const selectedIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue))
const activeOptionId = computed(() =>
    isOpen.value && highlightedIndex.value >= 0 ? optionId(highlightedIndex.value) : undefined,
)

watch(isOpen, (isOpen) => {
    if (!isOpen) return

    highlightedIndex.value = Math.max(0, selectedIndex.value)
})

function optionId(index: number) {
    return `${listboxId}-option-${index}`
}

function open() {
    if (!props.options.length) return

    isOpen.value = true
}

function close() {
    isOpen.value = false
}

function toggle() {
    if (isOpen.value) {
        close()
    } else {
        open()
    }
}

function move(offset: number) {
    if (!props.options.length) return
    if (!isOpen.value) open()

    highlightedIndex.value =
        (Math.max(0, highlightedIndex.value) + offset + props.options.length) % props.options.length
}

function selectOption(index: number) {
    const option = props.options[index]
    if (!option) return

    emit('update:modelValue', option.value)
    close()
}

function selectHighlighted() {
    if (!isOpen.value) {
        open()
        return
    }

    selectOption(highlightedIndex.value)
}
</script>

<template>
    <div ref="container" class="relative h-8 w-full">
        <button
            class="clickable hover:bg-sonolus-ui-button-highlight flex h-full w-full items-center justify-center gap-2 rounded-md border-none px-8 py-0 text-center transition-colors"
            role="combobox"
            aria-haspopup="listbox"
            :aria-expanded="isOpen"
            :aria-controls="listboxId"
            :aria-activedescendant="activeOptionId"
            title="Select sprite"
            @click="toggle()"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.home.prevent="highlightedIndex = 0"
            @keydown.end.prevent="highlightedIndex = options.length - 1"
            @keydown.enter.prevent="selectHighlighted()"
            @keydown.space.prevent="selectHighlighted()"
            @keydown.escape.prevent="close()"
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
            :id="listboxId"
            role="listbox"
            class="bg-sonolus-main absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-white/10 shadow-lg"
        >
            <button
                v-for="(option, index) in options"
                :key="option.value"
                :id="optionId(index)"
                role="option"
                :aria-selected="option.value === modelValue"
                class="clickable flex w-full items-center justify-center gap-2 px-8 py-1 text-center transition-colors hover:bg-sonolus-ui-button-highlight bg-sonolus-main"
                :class="{
                    'bg-sonolus-ui-button-normal': option.value === modelValue,
                    'bg-sonolus-ui-button-highlighted': index === highlightedIndex,
                }"
                @mouseenter="highlightedIndex = index"
                @click="selectOption(index)"
            >
                <MyImageIcon :src="option.image" class="h-6 w-6 flex-shrink-0" fill />
                <span class="truncate">{{ option.label }}</span>
            </button>
        </div>
    </div>
</template>
