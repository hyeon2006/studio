<script setup lang="ts">
import { useVirtualList } from '@vueuse/core'
import { type Component, computed, toRef, watch } from 'vue'
import { useSpriteSelection } from '../../composables/sprite-selection'
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
        submitText?: string
        itemType?: string
    }
}>()

const emit = defineEmits<{
    close: [result?: string[]]
}>()

const { search, selected, filteredSprites, toggle, selectAll, deselectAll, selectSearchTerms } =
    useSpriteSelection(toRef(() => props.data.sprites))
const itemType = computed(() => props.data.itemType ?? 'sprite')
const { list, containerProps, wrapperProps, scrollTo } = useVirtualList(filteredSprites, {
    itemHeight: 40,
    overscan: 8,
})
watch(filteredSprites, () => scrollTo(0), { flush: 'post' })

function onPaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text')
    if (!pasted || !/[,\r\n]/.test(pasted)) return

    event.preventDefault()
    selectSearchTerms(pasted)
}

function onSubmit() {
    emit('close', Array.from(selected.value))
}

function onCancel() {
    emit('close')
}
</script>

<template>
    <ModalBase
        class="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        :icon="props.data.icon"
        :title="props.data.title"
    >
        <div class="flex flex-col gap-2 p-4 pb-0">
            <MyTextInput
                v-model="search"
                auto-focus
                commit-on-comma
                :placeholder="`Search or paste ${itemType} names...`"
                @comma="selectSearchTerms(search)"
                @enter="selectSearchTerms(search)"
                @paste="onPaste"
            />

            <div class="text-xs text-sonolus-ui-text-disabled">
                Paste comma- or line-separated names to select them. Unknown names are ignored.
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap gap-2">
                    <MyButton
                        :icon="IconCheck"
                        text="Select All"
                        class="shrink-0 whitespace-nowrap"
                        @click="selectAll"
                    />
                    <MyButton
                        :icon="IconTimes"
                        text="Deselect All"
                        class="shrink-0 whitespace-nowrap"
                        @click="deselectAll"
                    />
                </div>
                <div class="ml-auto text-sm whitespace-nowrap text-sonolus-ui-text-normal">
                    {{ selected.size }} selected
                </div>
            </div>
        </div>

        <div v-bind="containerProps" class="scrollbar h-64 px-4">
            <div v-bind="wrapperProps">
                <button
                    v-for="{ data: name } in list"
                    :key="name"
                    type="button"
                    class="hover:bg-sonolus-ui-button-hover flex h-10 w-full items-center gap-2 p-2 text-left transition-colors select-none"
                    :class="{ 'bg-sonolus-ui-button-active': selected.has(name) }"
                    role="checkbox"
                    :aria-checked="selected.has(name)"
                    @click="toggle(name)"
                >
                    <div
                        class="flex h-4 w-4 flex-none items-center justify-center border border-sonolus-ui-text-normal"
                        :class="{
                            'border-sonolus-warning bg-sonolus-warning text-sonolus-main':
                                selected.has(name),
                        }"
                    >
                        <IconCheck v-if="selected.has(name)" class="h-3 w-3" />
                    </div>
                    <div class="truncate">{{ name }}</div>
                </button>
            </div>
            <div
                v-if="filteredSprites.length === 0"
                class="py-4 text-center text-sonolus-ui-text-disabled"
            >
                No {{ itemType }}s found
            </div>
        </div>

        <div class="flex justify-end gap-2 p-4 pt-0">
            <MyButton :icon="IconTimes" text="Cancel" @click="onCancel" />
            <MyButton
                :icon="IconCheck"
                :text="props.data.submitText ?? 'Copy Selected'"
                :disabled="selected.size === 0"
                type="submit"
                @click="onSubmit"
            />
        </div>
    </ModalBase>
</template>
