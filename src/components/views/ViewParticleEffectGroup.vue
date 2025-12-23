<script setup lang="ts">
import { useClipboard } from '../../composables/clipboard'
import { useView } from '../../composables/view'
import { type Particle } from '../../core/particle'
import IconClone from '../../icons/clone-solid.svg?component'
import IconPaste from '../../icons/file-solid.svg?component'
import MyButton from '../ui/MyButton.vue'
import MyField from '../ui/MyField.vue'
import MyNumberInput from '../ui/MyNumberInput.vue'
import MySection from '../ui/MySection.vue'
import MyTextInput from '../ui/MyTextInput.vue'
import PreviewParticleEffectGroup from './previews/PreviewParticleEffectGroup.vue'

const props = defineProps<{
    data: Particle
}>()

const { copy, paste } = useClipboard()

const v = useView(
    props,
    'particles',
    (v, view) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        v.value.data.effects.find(({ name }) => name === view.value[3])!.groups[+view.value[5]!]!,
)
</script>

<template>
    <MySection header="Clipboard">
        <div class="flex gap-2">
            <MyButton
                :icon="IconClone"
                text="Copy"
                @click="copy('particle-effect-group', v, props.data)"
            />
            <MyButton
                :icon="IconPaste"
                text="Paste"
                @click="paste('particle-effect-group', v, props.data)"
            />
        </div>
    </MySection>

    <MySection header="Group">
        <MyField title="Name">
            <MyTextInput v-model="v.name" placeholder="Enter group name..." />
        </MyField>
        <MyField title="Count">
            <MyNumberInput v-model="v.count" placeholder="Enter group count..." validate />
        </MyField>
    </MySection>

    <MySection header="Preview">
        <PreviewParticleEffectGroup :sprites="data.data.sprites" :group="v" />
    </MySection>
</template>
