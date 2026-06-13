<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { show } from '../../composables/modal'
import { load } from '../../core/storage'
import { getImageInfo } from '../../core/utils'
import { validateInput } from '../../core/validation'
import IconImage from '../../icons/image-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import ModalImage from '../modals/ModalImage.vue'
import MyImageIcon from './MyImageIcon.vue'

const props = defineProps<{
    modelValue: string
    fill?: boolean
    validate?: boolean
    errorMessage?: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const el = ref<HTMLInputElement>()

const imageInfo = ref<string | false>()
watchEffect(async () => {
    imageInfo.value = undefined
    try {
        const { width, height } = await getImageInfo(props.modelValue)
        imageInfo.value = `${width} x ${height}`
    } catch {
        imageInfo.value = false
    }
})

const isError = computed(() => !validateInput(props, () => imageInfo.value !== false))
const resolvedErrorMessage = computed(() => {
    if (!isError.value) return ''

    return props.errorMessage ?? 'Select a valid image.'
})

function select() {
    if (!el.value) return

    el.value.click()
}

function onFileInput() {
    if (!el.value) return

    const file = el.value.files?.[0]
    if (!file) return

    el.value.value = ''

    emit('update:modelValue', load(file))
}

function open() {
    void show(ModalImage, { src: props.modelValue })
}

function clear() {
    emit('update:modelValue', '')
}
</script>

<template>
    <div>
        <div
            class="relative flex h-8 items-center overflow-hidden rounded-md"
            :class="{ 'ring-sonolus-warning ring-1': isError }"
        >
            <template v-if="modelValue">
                <button
                    class="clickable flex h-full w-full flex-grow items-center px-2"
                    :aria-invalid="isError"
                    :title="isError ? resolvedErrorMessage : 'Preview image'"
                    @click="open()"
                >
                    <MyImageIcon class="icon" :src="modelValue" :fill="fill" />
                    <div class="ml-2 flex-grow text-center">
                        {{
                            imageInfo === undefined
                                ? 'Loading...'
                                : imageInfo === false
                                  ? 'Error'
                                  : imageInfo
                        }}
                    </div>
                </button>
                <button
                    class="clickable h-full flex-none px-2"
                    tabindex="-1"
                    title="Clear image"
                    aria-label="Clear image"
                    @click="clear()"
                >
                    <IconTimes class="icon" />
                </button>
            </template>
            <template v-else>
                <button
                    class="clickable flex h-full w-full flex-grow items-center px-2"
                    :aria-invalid="isError"
                    :title="isError ? resolvedErrorMessage : 'Select image'"
                    @click="select()"
                >
                    <IconImage class="icon flex-none" />
                    <div class="ml-2 flex-grow text-center">Select Image...</div>
                </button>
            </template>

            <input
                ref="el"
                class="hidden"
                type="file"
                accept="image/png, image/jpeg"
                @input="onFileInput()"
            />
        </div>
        <div v-if="isError" class="text-sonolus-warning mt-1 text-left text-xs" role="alert">
            {{ resolvedErrorMessage }}
        </div>
    </div>
</template>
