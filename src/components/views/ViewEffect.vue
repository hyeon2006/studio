<script setup lang="ts">
import { useClipboard } from '../../composables/clipboard'
import { useView } from '../../composables/view'
import { type Effect } from '../../core/effect'
import IconClone from '../../icons/clone-solid.svg?component'
import IconPaste from '../../icons/file-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import MyField from '../ui/MyField.vue'
import MyImageInput from '../ui/MyImageInput.vue'
import MySection from '../ui/MySection.vue'
import MyTextArea from '../ui/MyTextArea.vue'
import MyTextInput from '../ui/MyTextInput.vue'

const props = defineProps<{
    data: Effect
}>()

const { copy, paste } = useClipboard()

const v = useView(props, 'effects')
</script>

<template>
    <MySection header="Clipboard">
        <div class="flex gap-2">
            <MyButton :icon="IconClone" text="Copy" @click="copy('effect', v)" />
            <MyButton :icon="IconPaste" text="Paste" @click="paste('effect', v)" />
        </div>
    </MySection>

    <MySection header="Info">
        <MyField title="Title">
            <MyTextInput v-model="v.title" placeholder="Enter SFX title..." validate />
        </MyField>
        <MyField title="Subtitle">
            <MyTextInput v-model="v.subtitle" placeholder="Enter SFX subtitle..." validate />
        </MyField>
        <MyField title="Author">
            <MyTextInput v-model="v.author" placeholder="Enter SFX author..." validate />
        </MyField>
        <MyField title="Description">
            <MyTextArea v-model="v.description" placeholder="Enter SFX description..." validate />
        </MyField>
    </MySection>

    <MySection header="Thumbnail">
        <MyField title="Thumbnail">
            <MyImageInput v-model="v.thumbnail" fill validate />
        </MyField>
    </MySection>
</template>
