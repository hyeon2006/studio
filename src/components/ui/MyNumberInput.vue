<script setup lang="ts">
import { useMounted } from '@vueuse/core'
import { computed, ref, watchEffect } from 'vue'
import { type Validator, validateInput } from '../../core/validation'
import IconKeyboard from '../../icons/keyboard-solid.svg?component'
import IconUndo from '../../icons/undo-alt-solid.svg?component'

const props = defineProps<{
    modelValue: number
    defaultValue?: number
    placeholder: string
    validate?: boolean
    validator?: Validator<number>
    errorMessage?: string
    autoFocus?: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: number]
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

const isFocused = ref(false)
const draft = ref('')

const value = computed({
    get: () => (isFocused.value ? draft.value : props.modelValue.toString()),
    set: (value) => {
        draft.value = value
        if (value === '') return

        emit('update:modelValue', +value || 0)
    },
})

const isError = computed(() => !validateInput(props, () => true))
const resolvedErrorMessage = computed(() => {
    if (!isError.value) return ''

    return props.errorMessage ?? 'Invalid number.'
})

function selectAll() {
    if (!el.value) return
    el.value.select()
}

function onFocus() {
    draft.value = props.modelValue.toString()
    isFocused.value = true
    selectAll()
}

function onBlur() {
    isFocused.value = false
    if (draft.value === '') emit('update:modelValue', 0)
}

function onEnter() {
    if (isFocused.value && draft.value === '') emit('update:modelValue', 0)
    emit('enter')
}

function reset() {
    if (props.defaultValue === undefined) return
    value.value = props.defaultValue.toFixed(4)
}
</script>

<template>
    <div>
        <div
            class="relative flex h-8 items-center overflow-hidden rounded-md"
            :class="{ 'ring-sonolus-warning ring-1': isError }"
        >
            <input
                ref="el"
                v-model="value"
                type="number"
                inputmode="decimal"
                class="clickable h-full w-full flex-grow border-none pr-2 pl-8 text-center"
                :placeholder="placeholder"
                :aria-invalid="isError"
                :title="resolvedErrorMessage"
                @focus="onFocus()"
                @blur="onBlur()"
                @keydown.enter="onEnter()"
                @keydown.escape="$emit('escape')"
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
        </div>
        <div v-if="isError" class="text-sonolus-warning mt-1 text-left text-xs" role="alert">
            {{ resolvedErrorMessage }}
        </div>
    </div>
</template>
