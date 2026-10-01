<script setup lang="ts">
import { computed } from 'vue'
import { parseTranslations, serializeTranslations, type Translation } from '../../core/localization'
import IconTrash from '../../icons/trash-alt-solid.svg?component'
import MyTextArea from './MyTextArea.vue'
import MyTextInput from './MyTextInput.vue'

const props = defineProps<{
    modelValue: string
    placeholder: string
    validate?: boolean
    multiline?: boolean
    hideHelp?: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const translations = computed(() => {
    const rows = parseTranslations(props.modelValue)
    if (!rows) return undefined

    const english = rows.find(({ locale }) => locale === 'en') ?? { locale: 'en', text: '' }
    return [english, ...rows.filter(({ locale }) => locale !== 'en')]
})
const editor = computed(() => (props.multiline ? MyTextArea : MyTextInput))

const locales = [
    'en',
    'ko',
    'ja',
    'zh',
    'zh-Hans',
    'zh-Hant',
    'de',
    'es',
    'fr',
    'id',
    'it',
    'pl',
    'pt',
    'pt-BR',
    'ru',
    'th',
    'tr',
    'vi',
]

const availableLocales = computed(() => [
    ...new Set([...locales, ...(translations.value ?? []).map(({ locale }) => locale)]),
])
const nextLocale = computed(() =>
    locales.find(
        (locale) => !translations.value?.some((translation) => translation.locale === locale),
    ),
)

function addLanguage() {
    if (!translations.value) {
        emit('update:modelValue', serializeTranslations([{ locale: 'en', text: props.modelValue }]))
    } else if (nextLocale.value) {
        emit(
            'update:modelValue',
            serializeTranslations([...translations.value, { locale: nextLocale.value, text: '' }]),
        )
    }
}

function update(index: number, patch: Partial<Translation>) {
    const rows = translations.value?.map((translation) => ({ ...translation }))
    if (!rows?.[index]) return

    Object.assign(rows[index], patch)
    emit('update:modelValue', serializeTranslations(rows))
}

function remove(index: number) {
    if (!translations.value) return

    const rows = translations.value.filter((_, i) => i !== index)
    emit(
        'update:modelValue',
        rows.length ? serializeTranslations(rows) : translations.value[index]!.text,
    )
}
</script>

<template>
    <div class="min-w-0">
        <div v-if="!translations" class="flex items-start gap-1">
            <component
                :is="editor"
                class="min-w-0 flex-1"
                :model-value="modelValue"
                :placeholder="placeholder"
                :validate="validate"
                v-bind="multiline ? {} : { localized: true, hideHelp }"
                @update:model-value="emit('update:modelValue', $event)"
            />
            <button
                type="button"
                class="clickable h-8 flex-none rounded-md px-2 text-sm font-semibold"
                title="Add localization (en)"
                aria-label="Add localization"
                @click="addLanguage()"
            >
                lo
            </button>
        </div>
        <div v-else class="flex flex-col gap-2">
            <div v-for="(translation, i) in translations" :key="i" class="flex items-start gap-1">
                <span
                    v-if="translation.locale === 'en'"
                    class="flex h-8 w-20 flex-none items-center rounded-md bg-sonolus-ui-button-normal px-2 text-sm"
                    title="English is required and is the fallback language"
                >
                    en *
                </span>
                <select
                    v-else
                    class="clickable h-8 w-20 flex-none rounded-md border-none py-0 pr-5 pl-2 text-sm"
                    :value="translation.locale"
                    :aria-label="`Language for translation ${i + 1}`"
                    @change="update(i, { locale: ($event.target as HTMLSelectElement).value })"
                >
                    <option
                        v-for="locale in availableLocales"
                        :key="locale"
                        class="bg-sonolus-ui-surface"
                        :value="locale"
                        :disabled="
                            locale !== translation.locale &&
                            translations.some((row) => row.locale === locale)
                        "
                    >
                        {{ locale }}
                    </option>
                </select>
                <component
                    :is="editor"
                    class="min-w-0 flex-1"
                    :model-value="translation.text"
                    :placeholder="placeholder"
                    :validate="translation.locale === 'en'"
                    :validator="(text: string) => !!text.trim()"
                    error-message="English (en) text is required to export."
                    :aria-label="`${translation.locale} text`"
                    @update:model-value="update(i, { text: $event })"
                />
                <button
                    v-if="translation.locale !== 'en' || translations.length === 1"
                    type="button"
                    class="clickable flex h-8 w-8 flex-none items-center justify-center rounded-md"
                    :title="translations.length === 1 ? 'Use plain text' : 'Remove language'"
                    :aria-label="
                        translations.length === 1
                            ? 'Use plain text'
                            : `Remove ${translation.locale} translation`
                    "
                    @click="remove(i)"
                >
                    <IconTrash class="icon" />
                </button>
                <div v-else class="w-8 flex-none" />
                <button
                    v-if="i === 0"
                    type="button"
                    class="clickable h-8 flex-none rounded-md px-2 text-sm font-semibold"
                    title="Add language"
                    aria-label="Add language"
                    :disabled="!nextLocale"
                    @click="addLanguage()"
                >
                    lo
                </button>
            </div>
        </div>
    </div>
</template>
