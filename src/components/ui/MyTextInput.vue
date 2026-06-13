<script setup lang="ts">
import { useMounted } from '@vueuse/core'
import { computed, nextTick, ref, watch, watchEffect } from 'vue'
import { type Validator, validateInput } from '../../core/validation'
import IconKeyboard from '../../icons/keyboard-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import IconUndo from '../../icons/undo-alt-solid.svg?component'

const props = defineProps<{
    modelValue: string
    defaultValue?: string
    placeholder: string
    validate?: boolean
    validator?: Validator<string>
    errorMessage?: string
    autoFocus?: boolean
    suggestions?: { value: string; label?: string; hint?: string }[]
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
    enter: []
    escape: []
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

const showSuggestions = computed(
    () => isFocused.value && !isDismissed.value && !!props.suggestions?.length,
)

watch(
    () => props.suggestions,
    () => {
        highlighted.value = -1
    },
)

function selectAll() {
    if (!el.value) return
    el.value.select()
}

function onFocus() {
    isFocused.value = true
    isDismissed.value = false
    selectAll()
}

function onBlur() {
    isFocused.value = false
    highlighted.value = -1
}

function applySuggestion(suggestion: string) {
    value.value = suggestion
    highlighted.value = -1
    el.value?.focus()
}

function moveHighlight(offset: number) {
    if (!showSuggestions.value || !props.suggestions?.length) return

    const count = props.suggestions.length
    highlighted.value = (highlighted.value + offset + count) % count

    void nextTick(() => {
        listEl.value?.children[highlighted.value]?.scrollIntoView({ block: 'nearest' })
    })
}

function onEnter() {
    if (showSuggestions.value && highlighted.value >= 0) {
        const suggestion = props.suggestions?.[highlighted.value]
        if (suggestion !== undefined) {
            applySuggestion(suggestion.value)
            return
        }
    }

    emit('enter')
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
                :class="{ 'ring-sonolus-warning ring-1': isError }"
            >
                <input
                    ref="el"
                    v-model="value"
                    type="text"
                    class="clickable h-full w-full flex-grow border-none pr-2 pl-8 text-center"
                    :placeholder="placeholder"
                    :aria-invalid="isError"
                    :title="resolvedErrorMessage"
                    @focus="onFocus()"
                    @blur="onBlur()"
                    @keydown.enter="onEnter()"
                    @keydown.escape="onEscape()"
                    @keydown.down.prevent="moveHighlight(1)"
                    @keydown.up.prevent="moveHighlight(-1)"
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
                class="scrollbar bg-sonolus-main absolute top-full left-0 z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-white/10 shadow-lg"
            >
                <button
                    v-for="(suggestion, i) in suggestions"
                    :key="suggestion.value"
                    class="transparent-clickable flex w-full items-baseline justify-center gap-2 px-2 py-1"
                    :class="{ 'bg-sonolus-ui-button-normal': i === highlighted }"
                    tabindex="-1"
                    @mousedown.prevent="applySuggestion(suggestion.value)"
                >
                    <span class="truncate">{{ suggestion.label ?? suggestion.value }}</span>
                    <span
                        v-if="suggestion.hint"
                        class="text-sonolus-ui-text-disabled truncate text-xs"
                    >
                        {{ suggestion.hint }}
                    </span>
                </button>
            </div>
        </div>
        <div v-if="isError" class="text-sonolus-warning mt-1 text-left text-xs" role="alert">
            {{ resolvedErrorMessage }}
        </div>
    </div>
</template>
