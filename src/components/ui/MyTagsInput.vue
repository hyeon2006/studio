<script setup lang="ts">
import { Icon } from '@sonolus/core'
import { computed, ref } from 'vue'
import { localizeText } from '../../core/localization'
import { formatNameKey } from '../../core/names'
import { type ProjectTag } from '../../core/tag'
import { suggestTextKeys } from '../../core/text-suggestions'
import IconPlus from '../../icons/plus-solid.svg?component'
import IconQuestion from '../../icons/question-circle-solid.svg?component'
import IconTrash from '../../icons/trash-alt-solid.svg?component'
import MyButton from './MyButton.vue'
import MyLocalizationHint from './MyLocalizationHint.vue'
import MyTextInput from './MyTextInput.vue'
import MyTextSelect from './MyTextSelect.vue'

const props = defineProps<{
    modelValue: ProjectTag[]
}>()

const emit = defineEmits<{
    'update:modelValue': [value: ProjectTag[]]
}>()

// completes the segment after the last ':' so interpolations like
// '#PUBLISHED:#SEPARATOR_COLON:#DAY_PAST:42' can be built up key by key
function titleSuggestions(title: string) {
    const lastColon = title.lastIndexOf(':')
    const prefix = title.slice(0, lastColon + 1)
    const tail = title.slice(lastColon + 1)

    if (tail && !tail.startsWith('#')) return []

    return suggestTextKeys(tail).map(({ value, hint }) => ({
        value: prefix + value,
        label: value,
        hint,
    }))
}

function preview(title: string) {
    return localizeText(title) || '(empty)'
}

const isHelpOpened = ref(false)

const iconOptions = computed(() => ({
    'No Icon': '',
    ...Object.fromEntries(Object.entries(Icon).map(([key, value]) => [formatNameKey(key), value])),
}))

function cloneTags(): ProjectTag[] {
    return props.modelValue.map((tag) => ({ title: tag.title, icon: tag.icon }))
}

function add() {
    emit('update:modelValue', [...cloneTags(), { title: '', icon: '' }])
}

function update(index: number, patch: Partial<ProjectTag>) {
    const tags = cloneTags()
    Object.assign(tags[index]!, patch)
    emit('update:modelValue', tags)
}

function remove(index: number) {
    emit(
        'update:modelValue',
        cloneTags().filter((_, i) => i !== index),
    )
}
</script>

<template>
    <div class="flex flex-col gap-2">
        <div v-for="(tag, i) in modelValue" :key="i" class="flex flex-col gap-1">
            <div class="flex items-center gap-1">
                <MyTextInput
                    class="min-w-0 flex-1"
                    :model-value="tag.title"
                    placeholder="Enter tag title or #..."
                    :suggestions="titleSuggestions(tag.title)"
                    @update:model-value="update(i, { title: $event })"
                />
                <MyTextSelect
                    class="w-36 flex-none"
                    :model-value="tag.icon"
                    :options="iconOptions"
                    @update:model-value="update(i, { icon: $event })"
                />
                <button class="clickable h-8 flex-none rounded-md px-2" @click="remove(i)">
                    <IconTrash class="icon" />
                </button>
            </div>
            <div
                v-if="tag.title.startsWith('#')"
                class="text-sonolus-ui-text-soften truncate text-left text-xs"
            >
                Preview: {{ preview(tag.title) }}
            </div>
        </div>
        <div class="flex items-center gap-1">
            <MyButton class="flex-1" :icon="IconPlus" text="Add Tag" @click="add()" />
            <button
                class="clickable h-8 flex-none rounded-md px-2"
                :class="{ 'bg-sonolus-ui-button-highlighted': isHelpOpened }"
                title="Localized text help"
                @click="isHelpOpened = !isHelpOpened"
            >
                <IconQuestion class="icon" />
            </button>
        </div>
        <MyLocalizationHint v-if="isHelpOpened" />
    </div>
</template>
