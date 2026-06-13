<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { show } from '../../composables/modal'
import { type Project, packProject } from '../../core/project'
import IconSpinner from '../../icons/spinner-solid.svg?component'
import IconTimes from '../../icons/times-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import ModalBase from './ModalBase.vue'
import ModalErrorCancel from './ModalErrorCancel.vue'

const props = defineProps<{
    data: Project
}>()

const emit = defineEmits<{
    close: [result?: Blob]
}>()

const el = ref<HTMLCanvasElement>()
const description = ref<string>()
const completed = ref(0)
const total = ref(0)
const aborted = ref(false)
const progress = computed(() => (total.value ? Math.min(completed.value / total.value, 1) : 0))
const progressPercentage = computed(() => Math.round(progress.value * 100))

onMounted(async () => {
    while (!el.value) {
        await nextTick()
    }

    const { tasks, finish } = packProject(props.data, el.value)

    try {
        await runTasks(tasks)
        if (aborted.value) return

        total.value = completed.value + 1
        description.value = `Finalizing package... (${completed.value + 1}/${total.value})`
        await nextTick()
        const result = await finish()
        if (aborted.value) return

        completed.value = total.value
        description.value = 'Completed.'
        await nextTick()

        emit('close', result)
    } catch (error) {
        void show(ModalErrorCancel, {
            message: error instanceof Error ? error.message : String(error),
        })
        emit('close')
    }
})

onUnmounted(() => (aborted.value = true))

async function runTasks(tasks: { description: string; execute: () => void | Promise<void> }[]) {
    let index = 0

    while (index < tasks.length) {
        const task = tasks[index]
        if (!task) break

        total.value = tasks.length
        completed.value = index
        description.value = `${task.description} (${index + 1}/${total.value})`
        await nextTick()
        await task.execute()

        if (aborted.value) return

        index++
        total.value = tasks.length
        completed.value = index
    }
}

function cancel() {
    aborted.value = true
    emit('close')
}
</script>

<template>
    <ModalBase :icon="IconSpinner" title="Packing Project">
        <div aria-live="polite">{{ description }}</div>
        <div class="mt-4 h-2 overflow-hidden rounded-full bg-black/25">
            <div
                class="bg-sonolus-success h-full"
                :style="{ width: `${progressPercentage}%` }"
            />
        </div>
        <div class="text-sonolus-ui-text-soften mt-1 text-right text-xs">
            {{ progressPercentage }}%
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
