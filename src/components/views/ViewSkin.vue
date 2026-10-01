<script setup lang="ts">
import { markRaw } from 'vue'
import { useClipboard } from '../../composables/clipboard'
import { show } from '../../composables/modal'
import { toast } from '../../composables/toast'
import { useView } from '../../composables/view'
import { load } from '../../core/storage'
import { type Skin } from '../../core/skin'
import { getBlob, getImageInfo } from '../../core/utils'
import IconClone from '../../icons/clone-solid.svg?component'
import IconPaste from '../../icons/file-solid.svg?component'
import IconVectorSquare from '../../icons/vector-square-solid.svg?component'
import ModalHorizontalAnchor from '../modals/ModalHorizontalAnchor.vue'
import ModalSelectSprites from '../modals/ModalSelectSprites.vue'
import MyButton from '../ui/MyButton.vue'
import MyField from '../ui/MyField.vue'
import MyImageInput from '../ui/MyImageInput.vue'
import MySection from '../ui/MySection.vue'
import MyTagsInput from '../ui/MyTagsInput.vue'
import MyLocalizedText from '../ui/MyLocalizedText.vue'
import MyTextInput from '../ui/MyTextInput.vue'
import MyToggle from '../ui/MyToggle.vue'

const props = defineProps<{
    data: Skin
}>()

const { copy, paste } = useClipboard()

const v = useView(props, 'skins')

type HorizontalAnchor = 'left' | 'center' | 'right'

async function reduceSpriteWidths() {
    const selectedNames = (await show(ModalSelectSprites, {
        icon: markRaw(IconVectorSquare),
        title: 'Select Sprites to Reduce',
        sprites: v.value.data.sprites.map(({ name }) => name),
        submitText: 'Continue',
    })) as string[] | undefined
    if (!selectedNames?.length) return

    const anchor = (await show(ModalHorizontalAnchor, {
        count: selectedNames.length,
    })) as HorizontalAnchor | undefined
    if (!anchor) return

    const selected = new Set(selectedNames)

    try {
        const sprites = await Promise.all(
            v.value.data.sprites.map(async (sprite) => {
                if (!selected.has(sprite.name)) return sprite

                return {
                    ...sprite,
                    texture: await cropToPixelColumn(sprite.texture, anchor),
                }
            }),
        )

        v.value.data.sprites = sprites
        toast(
            `Reduced ${selected.size} sprite${selected.size === 1 ? '' : 's'} to 1 px wide`,
            'success',
        )
    } catch {
        toast(
            'Failed to reduce sprite widths. Check that every selected sprite has a valid image.',
            'error',
        )
    }
}

async function cropToPixelColumn(texture: string, anchor: HorizontalAnchor) {
    const { img, width, height } = await getImageInfo(texture)
    const sourceX =
        anchor === 'left' ? 0 : anchor === 'right' ? width - 1 : Math.floor((width - 1) / 2)

    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Failed to obtain canvas context')

    context.drawImage(img, sourceX, 0, 1, height, 0, 0, 1, height)
    return load(await getBlob(canvas))
}
</script>

<template>
    <MySection header="Clipboard">
        <div class="flex gap-2">
            <MyButton :icon="IconClone" text="Copy" @click="copy('skin', v)" />
            <MyButton :icon="IconPaste" text="Paste" @click="paste('skin', v)" />
        </div>
    </MySection>

    <MySection header="Info">
        <MyField title="Title">
            <MyLocalizedText v-model="v.title" placeholder="Enter skin title..." validate />
        </MyField>
        <MyField title="Subtitle">
            <MyLocalizedText v-model="v.subtitle" placeholder="Enter skin subtitle..." validate />
        </MyField>
        <MyField title="Author">
            <MyTextInput v-model="v.author" placeholder="Enter skin author..." validate />
        </MyField>
        <MyField title="Tags">
            <MyTagsInput v-model="v.tags" />
        </MyField>
        <MyField title="Description">
            <MyLocalizedText
                multiline
                v-model="v.description"
                placeholder="Enter skin description..."
                validate
            />
        </MyField>
    </MySection>

    <MySection header="Thumbnail">
        <MyField title="Thumbnail">
            <MyImageInput v-model="v.thumbnail" fill validate />
        </MyField>
    </MySection>

    <MySection header="Data">
        <MyField title="Interpolation">
            <MyToggle v-model="v.data.interpolation" :default-value="true" />
        </MyField>
    </MySection>

    <MySection header="Sprite Tools">
        <MyButton
            :icon="IconVectorSquare"
            text="Reduce Widths to 1 px"
            :disabled="v.data.sprites.length === 0"
            @click="reduceSpriteWidths"
        />
        <p class="mt-2 text-xs text-sonolus-ui-text-disabled">
            Select multiple sprites and keep their left, center, or right pixel column.
        </p>
    </MySection>
</template>
