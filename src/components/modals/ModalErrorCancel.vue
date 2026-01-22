<script setup lang="ts">
import { type Component } from 'vue'
import IconExclamation from '../../icons/exclamation-circle-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import ModalBase from './ModalBase.vue'

defineProps<{
    data: {
        message: string
        title?: string
        text?: string
        icon?: Component
        actionIcon?: Component
    }
}>()

defineEmits<{
    close: []
}>()
</script>

<template>
    <ModalBase :icon="data.icon || IconExclamation" :title="data.title ?? 'Error'">
        <div class="whitespace-pre-wrap">{{ data.message }}</div>

        <template #actions>
            <MyButton
                class="w-24"
                :icon="data.actionIcon || IconTimes"
                :text="data.text ?? 'Cancel'"
                auto-focus
                @click="$emit('close')"
            />
        </template>
    </ModalBase>
</template>