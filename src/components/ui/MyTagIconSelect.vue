<script setup lang="ts">
import { type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { Icon } from '@sonolus/core'
import { onClickOutside } from '@vueuse/core'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { formatNameKey } from '../../core/names'
import IconAngleDown from '../../icons/angle-down-solid.svg?component'

const props = defineProps<{
    modelValue: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

interface TagIconOption {
    value: string
    label: string
    icon?: IconDefinition
}

const tagIconDefinitions = shallowRef<Record<string, IconDefinition>>({})

const options = computed<TagIconOption[]>(() => [
    { value: '', label: 'No Icon' },
    ...Object.entries(Icon).map(([key, value]) => ({
        value,
        label: formatNameKey(key),
        icon: tagIconDefinitions.value[key],
    })),
])

const isOpen = ref(false)
const highlightedIndex = ref(0)
const container = ref<HTMLElement>()
const listboxId = `tag-icon-select-${Math.random().toString(36).slice(2)}`

onClickOutside(container, close)

const selectedIndex = computed(() => options.value.findIndex((option) => option.value === props.modelValue))
const selected = computed<TagIconOption>(
    () =>
        options.value.find((option) => option.value === props.modelValue) ?? {
            value: props.modelValue,
            label: props.modelValue || 'No Icon',
            icon: tagIconDefinitions.value[props.modelValue],
        },
)
const activeOptionId = computed(() =>
    isOpen.value && highlightedIndex.value >= 0 ? optionId(highlightedIndex.value) : undefined,
)

watch(isOpen, (isOpen) => {
    if (!isOpen) return

    highlightedIndex.value = Math.max(0, selectedIndex.value)
})

onMounted(async () => {
    const { resolveTagIcon } = await import('../../core/tag-icons')

    tagIconDefinitions.value = Object.fromEntries(
        Object.keys(Icon)
            .map((key) => [key, resolveTagIcon(key)] as const)
            .filter((entry): entry is readonly [string, IconDefinition] => !!entry[1]),
    )
})

function iconViewBox(icon: IconDefinition) {
    const [width, height] = icon.icon

    return `0 0 ${width} ${height}`
}

function iconPath(icon: IconDefinition) {
    const path = icon.icon[4]

    return Array.isArray(path) ? path.join(' ') : path
}

function optionId(index: number) {
    return `${listboxId}-option-${index}`
}

function open() {
    if (!options.value.length) return

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
    if (!options.value.length) return
    if (!isOpen.value) open()

    highlightedIndex.value =
        (Math.max(0, highlightedIndex.value) + offset + options.value.length) % options.value.length
}

function selectOption(index: number) {
    const option = options.value[index]
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

function initials(label: string) {
    return label
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
}
</script>

<template>
    <div ref="container" class="relative h-8 w-full">
        <button
            class="clickable flex h-full w-full items-center gap-2 rounded-md border-none px-2 pr-8 text-left transition-colors"
            role="combobox"
            aria-haspopup="listbox"
            :aria-expanded="isOpen"
            :aria-controls="listboxId"
            :aria-activedescendant="activeOptionId"
            title="Select tag icon"
            @click="toggle()"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.home.prevent="highlightedIndex = 0"
            @keydown.end.prevent="highlightedIndex = options.length - 1"
            @keydown.enter.prevent="selectHighlighted()"
            @keydown.space.prevent="selectHighlighted()"
            @keydown.escape.prevent="close()"
        >
            <span
                class="bg-sonolus-ui-button-normal flex h-5 w-5 flex-none items-center justify-center rounded text-[10px] font-semibold"
                aria-hidden="true"
            >
                <svg
                    v-if="selected.icon"
                    class="icon"
                    :viewBox="iconViewBox(selected.icon)"
                    aria-hidden="true"
                >
                    <path :d="iconPath(selected.icon)" />
                </svg>
                <span v-else-if="selected.value">{{ initials(selected.label) }}</span>
                <span v-else>-</span>
            </span>
            <span class="min-w-0 flex-1 truncate">{{ selected.label }}</span>
            <IconAngleDown class="icon pointer-events-none absolute top-2 right-2" />
        </button>

        <div
            v-if="isOpen"
            :id="listboxId"
            role="listbox"
            class="scrollbar bg-sonolus-main absolute top-full left-0 z-50 mt-1 max-h-64 w-64 min-w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-white/10 shadow-lg"
        >
            <button
                v-for="(option, index) in options"
                :key="option.value"
                :id="optionId(index)"
                role="option"
                :aria-selected="option.value === modelValue"
                class="clickable bg-sonolus-main flex w-full items-center gap-2 px-2 py-1 text-left transition-colors"
                :class="{
                    'bg-sonolus-ui-button-normal': option.value === modelValue,
                    'bg-sonolus-ui-button-highlighted': index === highlightedIndex,
                }"
                @mouseenter="highlightedIndex = index"
                @click="selectOption(index)"
            >
                <span
                    class="bg-sonolus-ui-button-normal flex h-5 w-5 flex-none items-center justify-center rounded text-[10px] font-semibold"
                    aria-hidden="true"
                >
                    <svg
                        v-if="option.icon"
                        class="icon"
                        :viewBox="iconViewBox(option.icon)"
                        aria-hidden="true"
                    >
                        <path :d="iconPath(option.icon)" />
                    </svg>
                    <span v-else-if="option.value">{{ initials(option.label) }}</span>
                    <span v-else>-</span>
                </span>
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
                <span class="text-sonolus-ui-text-disabled truncate text-xs">{{ option.value }}</span>
            </button>
        </div>
    </div>
</template>
