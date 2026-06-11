<script setup lang="ts">
import { useMounted } from '@vueuse/core'
import { computed, nextTick, ref, watch, watchEffect } from 'vue'
import { localizeText } from '../../core/localization'
import { suggestTextKeys } from '../../core/text-suggestions'
import { type Validator, validateInput } from '../../core/validation'
import IconQuestion from '../../icons/question-circle-solid.svg?component'
import MyLocalizationHint from './MyLocalizationHint.vue'

const props = defineProps<{
    modelValue: string
    placeholder: string
    validate?: boolean
    validator?: Validator<string>
    autoFocus?: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const el = ref<HTMLTextAreaElement>()
const mounted = useMounted()
watchEffect(() => {
    if (!props.autoFocus) return
    if (!el.value) return
    if (!mounted.value) return

    el.value.focus()
})

const value = computed({
    get: () => props.modelValue,
    set: (value) => {
        isDismissed.value = false
        emit('update:modelValue', value)
    },
})

const isError = computed(() => !validateInput(props, (value) => !!value.length))

const isHelpOpened = ref(false)

// localized preview shown when any line uses Sonolus text keys
const previewText = computed(() =>
    props.modelValue.split('\n').some((line) => line.startsWith('#'))
        ? localizeText(props.modelValue) || '(empty)'
        : '',
)

const listEl = ref<HTMLDivElement>()
const isFocused = ref(false)
const isDismissed = ref(false)
const highlighted = ref(-1)
const caret = ref(0)

function updateCaret() {
    caret.value = el.value?.selectionStart ?? 0
}

// the segment of the current line between the last ':' and the caret
const tail = computed(() => {
    const before = props.modelValue.slice(0, caret.value)
    const line = before.slice(before.lastIndexOf('\n') + 1)
    return line.slice(line.lastIndexOf(':') + 1)
})

const suggestions = computed(() => (tail.value.startsWith('#') ? suggestTextKeys(tail.value) : []))

const showSuggestions = computed(
    () => isFocused.value && !isDismissed.value && !!suggestions.value.length,
)

watch(suggestions, () => {
    highlighted.value = -1
})

function onFocus() {
    isFocused.value = true
    isDismissed.value = false
    updateCaret()
}

function onBlur() {
    isFocused.value = false
    highlighted.value = -1
}

function applySuggestion(candidate: string) {
    const start = caret.value - tail.value.length
    const newValue =
        props.modelValue.slice(0, start) + candidate + props.modelValue.slice(caret.value)
    const position = start + candidate.length

    value.value = newValue
    highlighted.value = -1

    void nextTick(() => {
        if (!el.value) return

        el.value.focus()
        el.value.setSelectionRange(position, position)
        caret.value = position
    })
}

function moveHighlight(e: KeyboardEvent, offset: number) {
    if (!showSuggestions.value) return

    e.preventDefault()
    const count = suggestions.value.length
    highlighted.value = (highlighted.value + offset + count) % count

    void nextTick(() => {
        listEl.value?.children[highlighted.value]?.scrollIntoView({ block: 'nearest' })
    })
}

function onEnter(e: KeyboardEvent) {
    if (!showSuggestions.value || highlighted.value < 0) return

    const suggestion = suggestions.value[highlighted.value]
    if (suggestion === undefined) return

    e.preventDefault()
    applySuggestion(suggestion.value)
}

function onEscape() {
    if (!showSuggestions.value) return

    isDismissed.value = true
}
</script>

<template>
    <div>
        <div class="relative">
            <textarea
                ref="el"
                v-model="value"
                class="clickable scrollbar w-full resize-none overflow-y-scroll rounded-md border-none p-2"
                :class="{ 'ring-sonolus-warning ring-1': isError }"
                :placeholder="placeholder"
                rows="4"
                @focus="onFocus()"
                @blur="onBlur()"
                @click="updateCaret()"
                @input="updateCaret()"
                @keyup="updateCaret()"
                @keydown.enter="onEnter($event)"
                @keydown.escape="onEscape()"
                @keydown.down="moveHighlight($event, 1)"
                @keydown.up="moveHighlight($event, -1)"
            />
            <div
                v-if="showSuggestions"
                ref="listEl"
                class="scrollbar bg-sonolus-main absolute top-full left-0 z-50 max-h-48 w-full overflow-y-auto rounded-md border border-white/10 shadow-lg"
            >
                <button
                    v-for="(suggestion, i) in suggestions"
                    :key="suggestion.value"
                    class="transparent-clickable flex w-full items-baseline justify-center gap-2 px-2 py-1"
                    :class="{ 'bg-sonolus-ui-button-normal': i === highlighted }"
                    tabindex="-1"
                    @mousedown.prevent="applySuggestion(suggestion.value)"
                >
                    <span class="truncate">{{ suggestion.value }}</span>
                    <span
                        v-if="suggestion.hint"
                        class="text-sonolus-ui-text-disabled truncate text-xs"
                    >
                        {{ suggestion.hint }}
                    </span>
                </button>
            </div>
        </div>
        <div class="flex items-start gap-1">
            <div
                v-if="previewText"
                class="text-sonolus-ui-text-soften flex min-w-0 flex-1 gap-1 text-left text-xs"
            >
                <div class="flex-none">Preview:</div>
                <div class="min-w-0 whitespace-pre-line">{{ previewText }}</div>
            </div>
            <div v-else class="flex-1" />
            <button
                class="transparent-clickable flex-none rounded-md p-1"
                :class="{ 'bg-sonolus-ui-button-highlighted': isHelpOpened }"
                title="Localized text help"
                tabindex="-1"
                @click="isHelpOpened = !isHelpOpened"
            >
                <IconQuestion class="icon" />
            </button>
        </div>
        <MyLocalizationHint v-if="isHelpOpened" />
    </div>
</template>
