<script setup lang="ts">
import { useClipboard } from '../../composables/clipboard'
import { useView } from '../../composables/view'
import { type Effect } from '../../core/effect'
import IconClone from '../../icons/clone-solid.svg?component'
import IconPaste from '../../icons/file-solid.svg?component'
import MyAudioInput from '../ui/MyAudioInput.vue'
import MyButton from '../ui/MyButton.vue'
import MyField from '../ui/MyField.vue'
import MySection from '../ui/MySection.vue'

const props = defineProps<{
    data: Effect
}>()

const { copy, paste } = useClipboard()

const v = useView(props, 'effects', (v, view) =>
    v.value.data.clips.find(({ name }) => name === view.value[3])!,
)
</script>

<template>
    <MySection header="Clipboard">
        <div class="flex gap-2">
            <MyButton :icon="IconClone" text="Copy" @click="copy('effect-clip', v)" />
            <MyButton
                :icon="IconPaste"
                text="Paste"
                @click="paste('effect-clip', v, undefined, { exclude: ['name'] })"
            />
        </div>
    </MySection>

    <MySection header="Clip">
        <MyField title="Clip">
            <MyAudioInput v-model="v.url" validate />
        </MyField>
    </MySection>
</template>
