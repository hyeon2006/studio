<script setup lang="ts">
import { type Component, computed, nextTick, onMounted, ref } from 'vue'
import IconCheck from '../../icons/check-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import MyButton from '../ui/MyButton.vue' //
import MyTextInput from '../ui/MyTextInput.vue'
import ModalBase from './ModalBase.vue'

const props = defineProps<{
    data: {
        icon: Component
        title: string
        sprites: string[]
    }
}>()

const emit = defineEmits<{
    close: [result?: string[]]
}>()

const search = ref('')
const selected = ref(new Set<string>())

const filteredSprites = computed(() => {
    if (!search.value) return props.data.sprites
    const lower = search.value.toLowerCase()
    return props.data.sprites.filter((s) => s.toLowerCase().includes(lower))
})

function toggle(name: string) {
    if (selected.value.has(name)) {
        selected.value.delete(name)
    } else {
        selected.value.add(name)
    }
}

function selectAll() {
    filteredSprites.value.forEach((s) => selected.value.add(s))
}

function deselectAll() {
    filteredSprites.value.forEach((s) => selected.value.delete(s))
}

function onSubmit() {
    emit('close', Array.from(selected.value))
}

function onCancel() {
    emit('close')
}

onMounted(async () => {
    await nextTick()
    document.getElementById('sprite-search-input')?.focus()
})
</script>

<template>
    <ModalBase :icon="props.data.icon" :title="props.data.title">
        <div class="flex flex-col gap-2 p-4 pb-0">
            <MyTextInput
                id="sprite-search-input"
                v-model="search"
                placeholder="Search sprites..."
            />
            
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap gap-2">
                    <MyButton
                        :icon="IconCheck"
                        text="Select All"
                        class="flex-shrink-0 whitespace-nowrap"
                        @click="selectAll"
                    />
                    <MyButton
                        :icon="IconTimes"
                        text="Deselect All"
                        class="flex-shrink-0 whitespace-nowrap"
                        @click="deselectAll"
                    />
                </div>
                <div class="text-sm text-sonolus-ui-text-normal whitespace-nowrap ml-auto">
                    {{ selected.size }} selected
                </div>
            </div>
        </div>

        <div class="scrollbar h-64 overflow-y-auto px-4 py-2">
            <div
                v-for="name in filteredSprites"
                :key="name"
                class="hover:bg-sonolus-ui-button-hover flex cursor-pointer items-center gap-2 p-2 transition-colors select-none"
                :class="{ 'bg-sonolus-ui-button-active': selected.has(name) }"
                @click="toggle(name)"
            >
                <div
                    class="border-sonolus-ui-text-normal flex h-4 w-4 flex-none items-center justify-center border"
                    :class="{
                        'border-sonolus-warning bg-sonolus-warning text-sonolus-main':
                            selected.has(name),
                    }"
                >
                    <IconCheck v-if="selected.has(name)" class="h-3 w-3" />
                </div>
                <div class="truncate">{{ name }}</div>
            </div>
            <div
                v-if="filteredSprites.length === 0"
                class="text-sonolus-ui-text-disabled py-4 text-center"
            >
                No sprites found
            </div>
        </div>

        <div class="flex justify-end gap-2 p-4 pt-0">
            <MyButton :icon="IconTimes" text="Cancel" @click="onCancel" />
            <MyButton
                :icon="IconCheck"
                text="Copy Selected"
                :disabled="selected.size === 0"
                type="submit"
                @click="onSubmit"
            />
        </div>
    </ModalBase>
</template>