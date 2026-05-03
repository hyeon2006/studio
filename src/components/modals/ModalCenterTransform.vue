<script setup lang="ts">
import { ref } from 'vue'
import { getCenterTransform } from '../../core/simple-transform'
import { type Transform } from '../../core/skin'
import IconCheck from '../../icons/check-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import IconVectorSquare from '../../icons/vector-square-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import MyField from '../ui/MyField.vue'
import MyNumberInput from '../ui/MyNumberInput.vue'
import ModalBase from './ModalBase.vue'

defineProps<{
    data: null
}>()

const emit = defineEmits<{
    close: [result?: Transform]
}>()

const left = ref(1)
const right = ref(1)
const top = ref(1)
const bottom = ref(1)

function close(isSuccess?: boolean) {
    emit(
        'close',
        isSuccess
            ? getCenterTransform(left.value, right.value, top.value, bottom.value)
            : undefined,
    )
}
</script>

<template>
    <ModalBase :icon="IconVectorSquare" title="Center Transform">
        <MyField title="Left">
            <MyNumberInput
                v-model="left"
                :default-value="1"
                placeholder="Enter left scale..."
                auto-focus
                @enter="close(true)"
                @escape="close()"
            />
        </MyField>
        <MyField title="Right">
            <MyNumberInput
                v-model="right"
                :default-value="1"
                placeholder="Enter right scale..."
                @enter="close(true)"
                @escape="close()"
            />
        </MyField>
        <MyField title="Top">
            <MyNumberInput
                v-model="top"
                :default-value="1"
                placeholder="Enter top scale..."
                @enter="close(true)"
                @escape="close()"
            />
        </MyField>
        <MyField title="Bottom">
            <MyNumberInput
                v-model="bottom"
                :default-value="1"
                placeholder="Enter bottom scale..."
                @enter="close(true)"
                @escape="close()"
            />
        </MyField>
        <template #actions>
            <MyButton class="w-24" :icon="IconTimes" text="Cancel" @click="close()" />
            <MyButton :icon="IconCheck" text="Confirm" class="ml-4 w-24" @click="close(true)" />
        </template>
    </ModalBase>
</template>
