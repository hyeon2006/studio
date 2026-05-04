<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { ref, watch } from 'vue'
import { useParticlePreviewOptions } from '../../../composables/particle-preview'
import IconRotate from '../../../icons/rotate.svg?component'
import IconUndo from '../../../icons/undo-alt-solid.svg?component'
import MyButton from '../../ui/MyButton.vue'
import MyColorInput from '../../ui/MyColorInput.vue'
import MyField from '../../ui/MyField.vue'
import MyNumberInput from '../../ui/MyNumberInput.vue'
import MyToggle from '../../ui/MyToggle.vue'

defineProps<{
    elBack: HTMLCanvasElement | undefined
    elTop: HTMLCanvasElement | undefined
    randomize: number
    canvasWidth: number
    canvasHeight: number
    draggingIndex: number | undefined
}>()

const emit = defineEmits<{
    'update:elBack': [value: HTMLCanvasElement | undefined]
    'update:elTop': [value: HTMLCanvasElement | undefined]
    'update:randomize': [value: number]
    reset: []
}>()

const { backgroundColor, duration, loop } = useParticlePreviewOptions()
const isScaleMode = useLocalStorage('preview.scaleMode', false)

const elBackRef = ref<HTMLCanvasElement>()
const elTopRef = ref<HTMLCanvasElement>()

watch(elBackRef, () => {
    emit('update:elBack', elBackRef.value)
})
watch(elTopRef, () => {
    emit('update:elTop', elTopRef.value)
})
</script>

<template>
    <MyField title="Scale Mode (Mobile)">
        <MyToggle v-model="isScaleMode" :default-value="false" />
    </MyField>

    <MyField title="Background Color">
        <MyColorInput
            v-model="backgroundColor"
            default-value="#000"
            placeholder="Enter preview background color..."
            validate
        />
    </MyField>
    <MyField title="Duration">
        <MyNumberInput v-model="duration" placeholder="Enter duration..." validate />
    </MyField>
    <MyField title="Loop">
        <MyToggle v-model="loop" :default-value="true" />
    </MyField>

    <div class="border-sonolus-ui-text-normal mx-auto my-4 max-w-sm border-4">
        <div class="relative h-0 overflow-hidden pt-[100%]" :style="{ backgroundColor }">
            <canvas
                ref="elBackRef"
                class="absolute top-0 left-0 h-full w-full"
                :class="{ 'opacity-50': draggingIndex !== undefined }"
                :width="canvasWidth"
                :height="canvasHeight"
            />
            <canvas
                ref="elTopRef"
                class="absolute top-0 left-0 h-full w-full opacity-50 select-none hover:opacity-100"
                :style="{ touchAction: 'none' }"
                :width="canvasWidth"
                :height="canvasHeight"
            />
        </div>
    </div>

    <div class="mt-4 flex justify-center gap-4">
        <MyButton
            :icon="IconRotate"
            text="Randomize"
            @click="$emit('update:randomize', randomize + 1)"
        />
        <MyButton
            :icon="IconUndo"
            text="Reset"
            @click="$emit('reset')"
        />
    </div>
</template>
