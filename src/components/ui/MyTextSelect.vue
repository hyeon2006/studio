<script setup lang="ts">
import { useMounted } from '@vueuse/core'
import { computed, ref, watchEffect } from 'vue'
import { type Validator, validateInput } from '../../core/validation'
import IconStream from '../../icons/stream-solid.svg?component'
import IconUndo from '../../icons/undo-alt-solid.svg?component'

const props = defineProps<{
    modelValue: string
    defaultValue?: string
    options: Record<string, string>
    validate?: boolean
    validator?: Validator<string>
    errorMessage?: string
    autoFocus?: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const el = ref<HTMLSelectElement>()
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
        emit('update:modelValue', value)
    },
})

const isError = computed(() => !validateInput(props, (value) => !!value))
const resolvedErrorMessage = computed(() => {
    if (!isError.value) return ''

    return props.errorMessage ?? 'Invalid selection.'
})

function reset() {
    if (props.defaultValue === undefined) return
    value.value = props.defaultValue
}
</script>

<template>
    <div>
        <div
            class="flex h-8 items-center overflow-hidden rounded-md"
            :class="{ 'ring-sonolus-warning ring-1': isError }"
        >
            <div class="relative h-full w-full flex-grow">
                <select
                    ref="el"
                    v-model="value"
                    class="clickable h-full w-full border-none px-8 py-0 text-center"
                    :aria-invalid="isError"
                    :title="resolvedErrorMessage"
                >
                    <option
                        v-for="(option, description) in options"
                        :key="option"
                        class="bg-sonolus-ui-surface text-center"
                        :value="option"
                    >
                        {{ description }}
                    </option>
                </select>
                <IconStream class="icon pointer-events-none absolute top-2 left-2" />
            </div>
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
