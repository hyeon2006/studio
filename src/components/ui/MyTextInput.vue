<script setup lang="ts">
import { useMounted } from '@vueuse/core'
import { computed, nextTick, ref, watch, watchEffect } from 'vue'
import { localizeText } from '../../core/localization'
import { suggestText } from '../../core/text-suggestions'
import { type Validator, validateInput } from '../../core/validation'
import IconKeyboard from '../../icons/keyboard-solid.svg?component'
import IconQuestion from '../../icons/question-circle-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import IconUndo from '../../icons/undo-alt-solid.svg?component'
import MyLocalizationHint from './MyLocalizationHint.vue'

const props = defineProps<{
    modelValue: string
    defaultValue?: string
    placeholder: string
    validate?: boolean
    validator?: Validator<string>
    errorMessage?: string
    autoFocus?: boolean
    commitOnComma?: boolean
    localized?: boolean
    hideHelp?: boolean
    ariaLabel?: string
    suggestions?: { value: string; label?: string; hint?: string }[]
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
    comma: []
    enter: []
    escape: []
    paste: [event: ClipboardEvent]
}>()

const el = ref<HTMLInputElement>()
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

const isError = computed(() => !validateInput(props, (value) => !!value?.length))
const resolvedErrorMessage = computed(() => {
    if (!isError.value) return ''
    if (props.errorMessage) return props.errorMessage

    return value.value.trim() ? 'Invalid value.' : 'This field is required.'
})

const listEl = ref<HTMLDivElement>()
const isFocused = ref(false)
const isDismissed = ref(false)
const highlighted = ref(-1)
const caret = ref(0)
const isHelpOpened = ref(false)
const previewText = computed(() =>
    props.localized && props.modelValue.startsWith('#')
        ? localizeText(props.modelValue) || '(empty)'
        : '',
)
const resolvedSuggestions = computed(
    () => props.suggestions ?? (props.localized ? suggestText(props.modelValue, caret.value) : []),
)

function updateCaret() {
    caret.value = el.value?.selectionStart ?? props.modelValue.length
}

const showSuggestions = computed(
    () => isFocused.value && !isDismissed.value && !!resolvedSuggestions.value.length,
)

watch(resolvedSuggestions, () => {
    highlighted.value = -1
})

function selectAll() {
    if (!el.value) return
    el.value.select()
}

function onFocus() {
    isFocused.value = true
    isDismissed.value = false
    selectAll()
    updateCaret()
}

function onBlur() {
    isFocused.value = false
    highlighted.value = -1
}

function applySuggestion(suggestion: string) {
    const position = props.localized
        ? suggestText(props.modelValue, caret.value).find(({ value }) => value === suggestion)
              ?.caret
        : undefined
    value.value = suggestion
    highlighted.value = -1
    void nextTick(() => {
        el.value?.focus()
        if (position !== undefined) el.value?.setSelectionRange(position, position)
        updateCaret()
    })
}

function moveHighlight(offset: number) {
    if (!showSuggestions.value) return

    const count = resolvedSuggestions.value.length
    highlighted.value = (highlighted.value + offset + count) % count

    void nextTick(() => {
        listEl.value?.children[highlighted.value]?.scrollIntoView({ block: 'nearest' })
    })
}

function onEnter() {
    if (showSuggestions.value && highlighted.value >= 0) {
        const suggestion = resolvedSuggestions.value[highlighted.value]
        if (suggestion !== undefined) {
            applySuggestion(suggestion.value)
            return
        }
    }

    emit('enter')
}

function onKeyDown(event: KeyboardEvent) {
    if (!props.commitOnComma || event.key !== ',') return

    event.preventDefault()
    emit('comma')
}

function onEscape() {
    if (showSuggestions.value) {
        isDismissed.value = true
        return
    }

    emit('escape')
}

function reset() {
    if (props.defaultValue === undefined) return
    value.value = props.defaultValue
}

async function clear() {
    value.value = ''

    await nextTick()
    if (!el.value) return
    el.value.focus()
}
</script>

<template>
    <div>
        <div class="relative">
            <div
                class="flex h-8 items-center overflow-hidden rounded-md"
                :class="{ 'ring-1 ring-sonolus-warning': isError }"
            >
                <input
                    ref="el"
                    v-model="value"
                    type="text"
                    class="clickable h-full w-full flex-grow border-none pr-2 pl-8 text-center"
                    :placeholder="placeholder"
                    :aria-invalid="isError"
                    :aria-label="ariaLabel"
                    :title="resolvedErrorMessage"
                    @focus="onFocus()"
                    @blur="onBlur()"
                    @click="updateCaret()"
                    @input="updateCaret()"
                    @keyup="updateCaret()"
                    @keydown="onKeyDown($event)"
                    @keydown.enter="onEnter()"
                    @keydown.escape="onEscape()"
                    @keydown.down.prevent="moveHighlight(1)"
                    @keydown.up.prevent="moveHighlight(-1)"
                    @paste="emit('paste', $event)"
                />
                <IconKeyboard class="icon pointer-events-none absolute top-2 left-2" />
                <button
                    v-if="defaultValue !== undefined"
                    class="clickable h-full flex-none px-2"
                    tabindex="-1"
                    title="Reset"
                    aria-label="Reset"
                    @click="reset()"
                >
                    <IconUndo class="icon" />
                </button>
                <button
                    class="clickable h-full flex-none px-2"
                    tabindex="-1"
                    title="Clear"
                    aria-label="Clear"
                    @click="clear()"
                >
                    <IconTimes class="icon" />
                </button>
            </div>

            <div
                v-if="showSuggestions"
                ref="listEl"
                class="scrollbar absolute top-full left-0 z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-white/10 bg-sonolus-main shadow-lg"
            >
                <button
                    v-for="(suggestion, i) in resolvedSuggestions"
                    :key="suggestion.value"
                    class="transparent-clickable flex w-full items-baseline justify-center gap-2 px-2 py-1"
                    :class="{ 'bg-sonolus-ui-button-normal': i === highlighted }"
                    tabindex="-1"
                    @mousedown.prevent="applySuggestion(suggestion.value)"
                >
                    <span class="truncate">{{ suggestion.label ?? suggestion.value }}</span>
                    <span
                        v-if="suggestion.hint"
                        class="truncate text-xs text-sonolus-ui-text-disabled"
                    >
                        {{ suggestion.hint }}
                    </span>
                </button>
            </div>
        </div>
        <div v-if="isError" class="mt-1 text-left text-xs text-sonolus-warning" role="alert">
            {{ resolvedErrorMessage }}
        </div>
        <div v-if="localized && (previewText || !hideHelp)" class="flex items-start gap-1">
            <div
                v-if="previewText"
                class="min-w-0 flex-1 text-left text-xs whitespace-pre-line text-sonolus-ui-text-soften"
            >
                Preview: {{ previewText }}
            </div>
            <div v-else class="flex-1" />
            <button
                v-if="!hideHelp"
                class="transparent-clickable flex-none rounded-md p-1"
                :class="{ 'bg-sonolus-ui-button-highlighted': isHelpOpened }"
                title="Localized text help"
                aria-label="Localized text help"
                @click="isHelpOpened = !isHelpOpened"
            >
                <IconQuestion class="icon" />
            </button>
        </div>
        <MyLocalizationHint v-if="localized && isHelpOpened" />
    </div>
</template>
