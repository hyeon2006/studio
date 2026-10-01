<script setup lang="ts">
import { ref } from 'vue'
import IconCheck from '../../icons/check-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import IconVectorSquare from '../../icons/vector-square-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import MyField from '../ui/MyField.vue'
import MyTextSelect from '../ui/MyTextSelect.vue'
import ModalBase from './ModalBase.vue'

defineProps<{
    data: {
        count: number
    }
}>()

const emit = defineEmits<{
    close: [result?: HorizontalAnchor]
}>()

type HorizontalAnchor = 'left' | 'center' | 'right'

const anchor = ref<HorizontalAnchor>('center')

const options: Record<string, HorizontalAnchor> = {
    Left: 'left',
    Center: 'center',
    Right: 'right',
}
</script>

<template>
    <ModalBase :icon="IconVectorSquare" title="Reduce Sprite Widths">
        <div class="p-4">
            <p class="mb-4 text-sm text-sonolus-ui-text-normal">
                Keep one vertical pixel column from each of the {{ data.count }} selected sprites.
            </p>
            <MyField title="Horizontal Anchor">
                <MyTextSelect v-model="anchor" :options="options" auto-focus />
            </MyField>
        </div>

        <template #actions>
            <MyButton class="w-24" :icon="IconTimes" text="Cancel" @click="emit('close')" />
            <MyButton
                class="ml-4 w-24"
                :icon="IconCheck"
                text="Apply"
                @click="emit('close', anchor)"
            />
        </template>
    </ModalBase>
</template>
