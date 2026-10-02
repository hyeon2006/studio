import { EffectClipName } from '@sonolus/core'
import { markRaw } from 'vue'
import ModalName from '../../components/modals/ModalName.vue'
import ModalSelectSprites from '../../components/modals/ModalSelectSprites.vue'
import { type Effect, formatEffectClipName, newEffect, newEffectClip } from '../../core/effect'
import { clone } from '../../core/utils'
import IconClone from '../../icons/clone-solid.svg?component'
import IconDrum from '../../icons/drum-solid.svg?component'
import IconEdit from '../../icons/edit-solid.svg?component'
import IconFileAudio from '../../icons/file-audio-solid.svg?component'
import IconFolder from '../../icons/folder-solid.svg?component'
import IconPlus from '../../icons/plus-solid.svg?component'
import { useClipboard } from '../clipboard'
import { show } from '../modal'
import { push, type UseStateReturn } from '../state'
import { toast } from '../toast'
import {
    type ExplorerItem,
    isOpened,
    onClone,
    onCopyResources,
    onDelete,
    onDeleteAll,
    onNew,
    onPasteResources,
    onRename,
} from '.'

export function addEffectItems(state: UseStateReturn, items: ExplorerItem[]) {
    items.push({
        level: 0,
        path: ['effects'],
        hasChildren: true,
        icon: IconDrum,
        onCopy: () => {
            void onCopyResources(state, 'effects', 'Effect')
        },
        onPaste: () => {
            void onPasteResources(state, 'effects')
        },
        title: `Effects (${state.project.value.effects.size})`,
        onNew: () => {
            void onNew(state, 'effects', 'New Effect', 'Enter effect name...', newEffect())
        },
        onDelete: () => {
            onDeleteAll(state, 'effects')
        },
    })

    if (!isOpened(['effects'])) return

    for (const [name, effect] of state.project.value.effects) {
        items.push({
            level: 1,
            path: ['effects', name],
            hasChildren: true,
            icon: effect.thumbnail,
            title: name,
            onRename: () => {
                void onRename(state, 'effects', 'Rename Effect', 'Enter new effect name...', name)
            },
            onClone: () => {
                void onClone(state, 'effects', 'Clone Effect', 'Enter new effect name...', name)
            },
            onDelete: () => {
                onDelete(state, 'effects', name)
            },
        })

        if (!isOpened(['effects', name])) continue

        items.push({
            level: 2,
            path: ['effects', name, 'clips'],
            hasChildren: true,
            icon: IconFolder,
            title: `Clips (${effect.data.clips.length})`,
            onCopy: () => {
                void onCopyEffectClips(state, name)
            },
            onPaste: () => {
                void onPasteEffectClips(state, name)
            },
            onNew: () => {
                void onNewEffectClip(state, name)
            },
            onDelete: () => {
                onDeleteEffectClips(state, name)
            },
        })

        if (!isOpened(['effects', name, 'clips'])) continue

        for (const { name: clipName } of effect.data.clips) {
            items.push({
                level: 3,
                path: ['effects', name, 'clips', clipName],
                hasChildren: false,
                icon: IconFileAudio,
                title: formatEffectClipName(clipName),
                onRename: () => {
                    void onRenameEffectClip(state, name, clipName)
                },
                onClone: () => {
                    void onCloneEffectClip(state, name, clipName)
                },
                onDelete: () => {
                    onDeleteEffectClip(state, name, clipName)
                },
            })
        }
    }
}

async function onCopyEffectClips({ project }: UseStateReturn, name: string) {
    const effect = project.value.effects.get(name)
    if (!effect) throw new Error('Effect not found')

    const selectedNames = await show(ModalSelectSprites, {
        icon: markRaw(IconClone),
        title: `Copy Clips from "${name}"`,
        sprites: effect.data.clips.map((clip) => clip.name),
        itemType: 'clip',
    })
    if (!selectedNames?.length) return

    const selected = new Set(selectedNames)
    const { copy } = useClipboard()
    await copy('effect-clips', {
        clips: effect.data.clips.filter((clip) => selected.has(clip.name)),
    })
}

async function onPasteEffectClips({ project, view }: UseStateReturn, name: string) {
    const { read } = useClipboard()
    const data = (await read('effect-clips')) as { clips: Effect['data']['clips'] } | null
    if (!data || !Array.isArray(data.clips)) {
        toast('Clipboard does not contain effect clips', 'error')
        return
    }
    if (!data.clips.length) return

    const effect = project.value.effects.get(name)
    if (!effect) throw new Error('Effect not found')

    const newEffect = clone(effect)
    for (const clip of data.clips) {
        const existingIndex = newEffect.data.clips.findIndex((item) => item.name === clip.name)
        if (existingIndex === -1) {
            newEffect.data.clips.push(clone(clip))
        } else {
            newEffect.data.clips.splice(existingIndex, 1, clone(clip))
        }
    }

    const effects = new Map(project.value.effects)
    effects.set(name, newEffect)
    push({ ...project.value, view: view.value, effects })
    toast(`Pasted ${data.clips.length} clips`, 'success')
}

async function onNewEffectClip({ project, isExplorerOpened }: UseStateReturn, name: string) {
    const effect = project.value.effects.get(name)
    if (!effect) throw new Error('Effect not found')

    const newName = await show(ModalName, {
        icon: markRaw(IconPlus),
        title: 'New Effect Clip',
        names: EffectClipName,
        defaultValue: EffectClipName.Miss,
        validator: (value) => !!value && !effect.data.clips.some(({ name }) => name === value),
    })
    if (!newName) return

    const newEffect = clone(effect)
    newEffect.data.clips.push(newEffectClip(newName))

    const effects = new Map(project.value.effects)
    effects.set(name, newEffect)

    push({
        ...project.value,
        view: ['effects', name, 'clips', newName],
        effects,
    })

    isExplorerOpened.value = false
}

function onDeleteEffectClips({ project }: UseStateReturn, name: string) {
    const effect = project.value.effects.get(name)
    if (!effect) throw new Error('Effect not found')
    if (!effect.data.clips.length) return

    const newEffect = clone(effect)
    newEffect.data.clips = []

    const effects = new Map(project.value.effects)
    effects.set(name, newEffect)

    push({
        ...project.value,
        view: [],
        effects,
    })
}

function onDeleteEffectClip({ project }: UseStateReturn, name: string, clipName: string) {
    const effect = project.value.effects.get(name)
    if (!effect) throw new Error('Effect not found')

    const newEffect = clone(effect)
    newEffect.data.clips = newEffect.data.clips.filter(({ name }) => name !== clipName)

    const effects = new Map(project.value.effects)
    effects.set(name, newEffect)

    push({
        ...project.value,
        view: [],
        effects,
    })
}

async function onRenameEffectClip(
    { project, view }: UseStateReturn,
    name: string,
    spriteName: string,
) {
    const effect = project.value.effects.get(name)
    if (!effect) throw new Error('Effect not found')

    const clip = effect.data.clips.find(({ name }) => name === spriteName)
    if (!clip) throw new Error('Effect clip not found')

    const newName = await show(ModalName, {
        icon: markRaw(IconEdit),
        title: 'Rename Effect Clip',
        names: EffectClipName,
        defaultValue: spriteName,
        validator: (value) => !!value && !effect.data.clips.some(({ name }) => name === value),
    })
    if (!newName) return

    const newClip = clone(clip)
    newClip.name = newName

    const newEffect = clone(effect)
    newEffect.data.clips = newEffect.data.clips.map((clip) =>
        clip.name === spriteName ? newClip : clip,
    )

    const effects = new Map(project.value.effects)
    effects.set(name, newEffect)

    push({
        ...project.value,
        view:
            view.value[0] === 'effects' &&
            view.value[1] === name &&
            view.value[2] === 'clips' &&
            view.value[3] === spriteName
                ? ['effects', name, 'clips', newName, ...view.value.slice(4)]
                : view.value,
        effects,
    })
}

async function onCloneEffectClip(
    { project, view }: UseStateReturn,
    name: string,
    spriteName: string,
) {
    const effect = project.value.effects.get(name)
    if (!effect) throw new Error('Effect not found')

    const clip = effect.data.clips.find(({ name }) => name === spriteName)
    if (!clip) throw new Error('Effect clip not found')

    const newName = await show(ModalName, {
        icon: markRaw(IconClone),
        title: 'Clone Effect Clip',
        names: EffectClipName,
        defaultValue: spriteName,
        validator: (value) => !!value && !effect.data.clips.some(({ name }) => name === value),
    })
    if (!newName) return

    const newClip = clone(clip)
    newClip.name = newName

    const newEffect = clone(effect)
    newEffect.data.clips.push(newClip)

    const effects = new Map(project.value.effects)
    effects.set(name, newEffect)

    push({
        ...project.value,
        view:
            view.value[0] === 'effects' &&
            view.value[1] === name &&
            view.value[2] === 'clips' &&
            view.value[3] === spriteName
                ? ['effects', name, 'clips', newName, ...view.value.slice(4)]
                : view.value,
        effects,
    })
}
