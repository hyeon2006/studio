import { markRaw } from 'vue'
import IconVectorSquare from '../icons/vector-square-solid.svg?component'
import ModalResizeSkins from '../components/modals/ModalResizeSkins.vue'
import ModalSelectSprites from '../components/modals/ModalSelectSprites.vue'
import { show } from './modal'
import { push, useState } from './state'
import { toast } from './toast'

export async function resizeSelectedSkins() {
    const { project } = useState()
    const skinNames = await show(ModalSelectSprites, {
        icon: markRaw(IconVectorSquare),
        title: 'Select Skins to Resize',
        sprites: [...project.value.skins.keys()],
        itemType: 'skin',
        submitText: 'Continue',
    })
    if (!skinNames?.length) return
    await resize(skinNames)
}

export async function resizeSelectedSkinSprites(skinName: string) {
    const { project } = useState()
    const skin = project.value.skins.get(skinName)
    if (!skin) return
    const spriteNames = await show(ModalSelectSprites, {
        icon: markRaw(IconVectorSquare),
        title: 'Select Sprites to Resize',
        sprites: skin.data.sprites.map(({ name }) => name),
        submitText: 'Continue',
    })
    if (!spriteNames?.length) return
    await resize([skinName], spriteNames)
}

async function resize(skinNames: string[], spriteNames?: string[]) {
    const { project, view } = useState()
    const source = project.value
    const result = await show(
        ModalResizeSkins,
        { project: source, skinNames, spriteNames },
        { dismissible: false },
    )
    if (!result) return
    if (project.value !== source) {
        toast('The project changed. Please select the images and resize again.', 'error')
        return
    }
    if (result.resized) push({ ...source, view: view.value, skins: result.skins })
    toast(`Resized ${result.resized} image(s); skipped ${result.skipped}.`, 'success')
}
