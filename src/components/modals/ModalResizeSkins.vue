<script setup lang="ts">
import { computed, ref } from 'vue'
import { type Project } from '../../core/project'
import {
    resizeSkinTextures,
    type SkinResizeOptions,
    type SkinResizeResult,
    validateSkinResizeOptions,
} from '../../core/skin-resize'
import IconCheck from '../../icons/check-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import IconVectorSquare from '../../icons/vector-square-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import MyField from '../ui/MyField.vue'
import MyTextSelect from '../ui/MyTextSelect.vue'
import MyToggle from '../ui/MyToggle.vue'
import ModalBase from './ModalBase.vue'

const props = defineProps<{
    data: { project: Project; skinNames: string[]; spriteNames?: string[] }
}>()
const emit = defineEmits<{ close: [result?: SkinResizeResult] }>()

const mode = ref('percentage')
const percentage = ref<string | number>('50')
const width = ref<string | number>('')
const height = ref<string | number>('')
const keepAspectRatio = ref(true)
const busy = ref(false)
const completed = ref(0)
const total = ref(0)
const processingError = ref('')
const options = computed<SkinResizeOptions>(() =>
    mode.value === 'percentage'
        ? { mode: 'percentage', percentage: Number(percentage.value) }
        : {
              mode: 'pixels',
              keepAspectRatio: keepAspectRatio.value,
              width: String(width.value).trim() ? Number(width.value) : undefined,
              height: String(height.value).trim() ? Number(height.value) : undefined,
          },
)
const validationError = computed(() => validateSkinResizeOptions(options.value))

async function apply() {
    if (busy.value || validationError.value) return
    busy.value = true
    processingError.value = ''
    try {
        const result = await resizeSkinTextures(
            props.data.project.skins,
            props.data.skinNames,
            options.value,
            props.data.spriteNames,
            (done, count) => {
                completed.value = done
                total.value = count
            },
        )
        emit('close', result)
    } catch {
        processingError.value =
            'Could not resize the selected images. Check their textures and try again.'
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <ModalBase
        class="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        :icon="IconVectorSquare"
        title="Resize Skin Images"
    >
        <p class="text-sm text-sonolus-ui-text-soften">
            {{
                data.spriteNames
                    ? `${data.spriteNames.length} selected sprites`
                    : `${data.skinNames.length} selected skins: all sprite images`
            }}
        </p>
        <form @submit.prevent="apply">
            <fieldset :disabled="busy">
                <MyField title="Resize by">
                    <MyTextSelect
                        v-model="mode"
                        :options="{ 'Percentage (%)': 'percentage', 'Pixels (px)': 'pixels' }"
                        auto-focus
                    />
                </MyField>
                <MyField v-if="mode === 'percentage'" title="Scale (%)">
                    <input
                        v-model="percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        aria-label="Scale (%)"
                        class="clickable h-8 w-full rounded-md border-none px-2 text-center"
                    />
                </MyField>
                <template v-else>
                    <MyField title="Keep aspect ratio">
                        <MyToggle
                            v-model="keepAspectRatio"
                            :default-value="true"
                            aria-label="Keep aspect ratio"
                        />
                    </MyField>
                    <MyField title="Width (px)">
                        <input
                            v-model="width"
                            type="number"
                            min="1"
                            step="1"
                            aria-label="Width (px)"
                            placeholder="Enter width..."
                            class="clickable h-8 w-full rounded-md border-none px-2 text-center"
                        />
                    </MyField>
                    <MyField title="Height (px)">
                        <input
                            v-model="height"
                            type="number"
                            min="1"
                            step="1"
                            aria-label="Height (px)"
                            placeholder="Enter height..."
                            class="clickable h-8 w-full rounded-md border-none px-2 text-center"
                        />
                    </MyField>
                </template>
            </fieldset>
        </form>
        <p class="text-left text-xs text-sonolus-ui-text-disabled">
            <template v-if="mode === 'percentage'"
                >50% makes each image half its original width and height.</template
            >
            <template v-else-if="keepAspectRatio"
                >Enter either dimension, or both to fit within those bounds. Each image keeps its
                own aspect ratio.</template
            >
            <template v-else>Enter both dimensions. Each image will use that exact size.</template>
            Images smaller than any specified pixel dimension are skipped. Empty textures and
            unchanged sizes are also skipped.
        </p>
        <p
            v-if="validationError || processingError"
            class="mt-2 text-left text-xs text-sonolus-warning"
            role="alert"
        >
            {{ validationError || processingError }}
        </p>
        <p v-if="busy" class="mt-4 text-sm" role="status">
            Resizing images… {{ completed }} / {{ total }}
        </p>
        <template #actions>
            <MyButton
                class="w-24"
                :icon="IconTimes"
                text="Cancel"
                :disabled="busy"
                @click="emit('close')"
            />
            <MyButton
                class="ml-4 w-24"
                :icon="IconCheck"
                :text="busy ? 'Resizing…' : 'Apply'"
                :disabled="busy || !!validationError"
                @click="apply"
            />
        </template>
    </ModalBase>
</template>
