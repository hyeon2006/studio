<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
    modelValue: number
    placeholder: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: number]
    enter: []
    escape: []
}>()

const el = ref<HTMLInputElement>()

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
</script>

<template>
    <input
        ref="el"
        v-model="value"
        type="number"
        inputmode="decimal"
        class="clickable h-8 border-none px-2 text-center"
        :placeholder="placeholder"
        :aria-label="placeholder"
        :title="placeholder"
        @focus="onFocus()"
        @blur="onBlur()"
        @keydown.enter="onEnter()"
        @keydown.escape="$emit('escape')"
    />
</template>

<style scoped>
::-webkit-inner-spin-button,
::-webkit-outer-spin-button {
    @apply hidden;
}
</style>
