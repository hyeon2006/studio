<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { show } from '../../composables/modal'
import { type Project, unpackPackage } from '../../core/project'
import IconSpinner from '../../icons/spinner-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import ModalBase from './ModalBase.vue'
import ModalErrorCancel from './ModalErrorCancel.vue'

const props = defineProps<{
    data: File
}>()

const emit = defineEmits<{
    close: [result?: Project]
}>()

const el = ref<HTMLCanvasElement>()
const description = ref<string>()
const completed = ref(0)
const total = ref(0)
const aborted = ref(false)

onMounted(async () => {
    while (!el.value) {
        await nextTick()
    }

    const { project, tasks, finish } = unpackPackage(props.data, el.value)
    total.value = tasks.length

    try {
        for (const [i, task] of tasks.entries()) {
            completed.value = i
            description.value = `${task.description} (${i + 1}/${tasks.length})`
            await nextTick()
            await task.execute()

            if (aborted.value) return
            completed.value = i + 1
        }

        description.value = 'Completed.'
        await nextTick()

        await finish()
        emit('close', project)
    } catch (error) {
        void show(ModalErrorCancel, {
            message: error instanceof Error ? error.message : String(error),
        })
        emit('close')
    }
})

onUnmounted(() => (aborted.value = true))

function cancel() {
    aborted.value = true
    emit('close')
}
</script>

<template>
    <ModalBase :icon="IconSpinner" title="Unpacking Package">
        <div aria-live="polite">{{ description }}</div>
        <div class="mt-4 h-2 overflow-hidden rounded-full bg-black/25">
            <div
                class="bg-sonolus-success h-full transition-all duration-200"
                :style="{ width: total ? `${(completed / total) * 100}%` : '0%' }"
            />
        </div>

        <canvas ref="el" class="hidden" />

        <template #actions>
            <MyButton
                class="w-24"
                :icon="IconTimes"
                text="Cancel"
                auto-focus
                @click="cancel()"
            />
        </template>
    </ModalBase>
</template>
