<script setup lang="ts">
import IconCheck from '../../icons/check-solid.svg?component'
import IconClone from '../../icons/clone-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import ModalBase from './ModalBase.vue'

defineProps<{
    data: {
        conflicts: {
            label: string
            names: string[]
        }[]
    }
}>()

const emit = defineEmits<{
    close: [result?: 'skip' | 'overwrite']
}>()
</script>

<template>
    <ModalBase :icon="IconClone" title="Import Conflicts">
        <div class="text-left">
            <div class="mb-4 text-center">
                Some imported items already exist in the current project.
            </div>
            <div class="scrollbar max-h-48 overflow-y-auto rounded-md bg-black/20 p-2 text-sm">
                <div v-for="conflict in data.conflicts" :key="conflict.label" class="mb-3 last:mb-0">
                    <div class="font-semibold">
                        {{ conflict.label }} ({{ conflict.names.length }})
                    </div>
                    <div class="text-sonolus-ui-text-soften mt-1 break-words text-xs">
                        {{ conflict.names.join(', ') }}
                    </div>
                </div>
            </div>
        </div>

        <template #actions>
            <MyButton :icon="IconTimes" text="Cancel" class="w-24" @click="emit('close')" />
            <MyButton
                :icon="IconClone"
                text="Skip"
                class="ml-2 w-24"
                @click="emit('close', 'skip')"
            />
            <MyButton
                :icon="IconCheck"
                text="Overwrite"
                class="ml-2 w-28"
                auto-focus
                @click="emit('close', 'overwrite')"
            />
        </template>
    </ModalBase>
</template>
