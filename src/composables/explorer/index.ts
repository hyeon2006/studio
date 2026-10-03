import { type Component, computed, markRaw, reactive, ref } from 'vue'
import ModalSelectSprites from '../../components/modals/ModalSelectSprites.vue'
import ModalTextInput from '../../components/modals/ModalTextInput.vue'
import { moveMapItem, renameMapItem } from '../../core/order'
import { type ProjectItemTypeOf } from '../../core/project'
import { clone } from '../../core/utils'
import IconScp from '../../icons/box-solid.svg?component'
import IconClone from '../../icons/clone-solid.svg?component'
import IconEdit from '../../icons/edit-solid.svg?component'
import IconPlus from '../../icons/plus-solid.svg?component'
import { useClipboard } from '../clipboard'
import { show } from '../modal'
import { push, type UseStateReturn, useState } from '../state'
import { toast } from '../toast'
import { addBackgroundItems } from './backgrounds'
import { addEffectItems } from './effects'
import { addParticleItems } from './particles'
import { addSkinItems } from './skins'

export interface ExplorerItem {
    level: number
    path: string[]
    hasChildren: boolean

    icon: Component | string
    fallback?: Component
    title: string

    onNew?: () => void
    onRename?: () => void
    onClone?: () => void
    onDelete?: () => void
    onCopy?: () => void
    onPaste?: () => void
    onMoveUp?: () => void
    onMoveDown?: () => void
}

const openedPaths = reactive(new Map<string, true>())

export const searchQuery = ref('')
const isSearching = computed(() => !!searchQuery.value.trim())

export function useExplorer() {
    const state = useState()

    const allItems = computed(() => {
        const items: ExplorerItem[] = [
            {
                level: 0,
                path: ['info'],
                hasChildren: false,
                icon: IconScp,
                title: 'Info',
            },
        ]

        addSkinItems(state, items)
        addBackgroundItems(state, items)
        addEffectItems(state, items)
        addParticleItems(state, items)

        const indexesByType = new Map<string, Map<string, number>>()
        for (const item of items) {
            if (item.path.length !== 2) continue
            const [type, name] = item.path
            if (
                type !== 'skins' &&
                type !== 'backgrounds' &&
                type !== 'effects' &&
                type !== 'particles'
            )
                continue

            let indexes = indexesByType.get(type)
            if (!indexes) {
                indexes = new Map([...state.project.value[type].keys()].map((key, i) => [key, i]))
                indexesByType.set(type, indexes)
            }
            const index = indexes.get(name!) ?? -1
            const move = (offset: -1 | 1) => {
                const resources = moveMapItem(
                    new Map<string, unknown>(state.project.value[type]),
                    name!,
                    offset,
                )
                push({ ...state.project.value, view: state.view.value, [type]: resources })
            }
            if (index > 0) item.onMoveUp = () => move(-1)
            if (index >= 0 && index < state.project.value[type].size - 1)
                item.onMoveDown = () => move(1)
        }
        return items
    })
    const tree = computed(() => {
        const items = allItems.value
        const query = searchQuery.value.trim().toLowerCase()
        if (!query) return items

        const keep = new Set<string>()
        for (const item of items) {
            if (!item.title.toLowerCase().includes(query)) continue

            for (let i = 1; i <= item.path.length; i++) {
                keep.add(toKey(item.path.slice(0, i)))
            }
        }

        return items.filter((item) => keep.has(toKey(item.path)))
    })

    return {
        tree,
    }
}

export function toKey(path: string[]) {
    return path.join('/')
}

export function isOpened(path: string[]) {
    if (isSearching.value) return true

    const key = path.join('/')
    return openedPaths.has(key)
}

export function open(path: string[]) {
    openedPaths.set(toKey(path), true)
}

export function close(path: string[]) {
    openedPaths.delete(toKey(path))
}

export function toggle(path: string[]) {
    if (isOpened(path)) {
        close(path)
    } else {
        open(path)
    }
}

export async function onCopyResources<T>(
    { project }: UseStateReturn,
    type: ProjectItemTypeOf<T>,
    itemType: string,
) {
    const resources = new Map<string, T>(project.value[type] as never)
    const selectedNames = await show(ModalSelectSprites, {
        icon: markRaw(IconClone),
        title: `Copy ${itemType}s`,
        sprites: [...resources.keys()],
        itemType: itemType.toLowerCase(),
    })
    if (!selectedNames?.length) return

    const selected = new Set(selectedNames)
    const { copy } = useClipboard()
    await copy(type, { items: [...resources].filter(([name]) => selected.has(name)) })
}

export async function onPasteResources<T>(
    { project, view }: UseStateReturn,
    type: ProjectItemTypeOf<T>,
) {
    const { read } = useClipboard()
    const data = (await read(type)) as { items: [string, T][] } | null
    if (!data || !Array.isArray(data.items)) {
        toast(`Clipboard does not contain ${type}`, 'error')
        return
    }
    if (!data.items.length) return

    const resources = new Map<string, T>(project.value[type] as never)
    for (const [name, item] of data.items) {
        resources.set(name, clone(item))
    }

    push({ ...project.value, view: view.value, [type]: resources })
    toast(`Pasted ${data.items.length} ${type}`, 'success')
}

export async function onNew<T>(
    { project, isExplorerOpened }: UseStateReturn,
    type: ProjectItemTypeOf<T>,
    title: string,
    placeholder: string,
    value: T,
) {
    const rawName: string | undefined = await show(ModalTextInput, {
        icon: markRaw(IconPlus),
        title,
        defaultValue: '',
        placeholder,
        errorMessage: 'Use a unique URI-safe name.',
        validator(name: string) {
            name = name.trim()
            if (!name.length) return false
            if (name !== encodeURIComponent(name)) return false
            if (project.value[type].has(name)) return false
            return true
        },
    })
    const name = rawName?.trim()
    if (!name) return

    const items = new Map(project.value[type] as never)
    items.set(name, value as never)

    push({
        ...project.value,
        view: [type, name],
        [type]: items,
    })

    isExplorerOpened.value = false
}

export function onDeleteAll<T>({ project }: UseStateReturn, type: ProjectItemTypeOf<T>) {
    if (!project.value[type].size) return

    push({
        ...project.value,
        view: [],
        [type]: new Map(),
    })
}

export function onDelete<T>({ project }: UseStateReturn, type: ProjectItemTypeOf<T>, name: string) {
    const items = new Map(project.value[type] as never)
    items.delete(name)

    push({
        ...project.value,
        view: [],
        [type]: items,
    })
}

export async function onRename<T>(
    { project, view }: UseStateReturn,
    type: ProjectItemTypeOf<T>,
    title: string,
    placeholder: string,
    oldName: string,
) {
    const rawNewName: string | undefined = await show(ModalTextInput, {
        icon: markRaw(IconEdit),
        title,
        defaultValue: oldName,
        placeholder,
        errorMessage: 'Use a unique name.',
        validator(name: string) {
            name = name.trim()
            if (!name.length) return false
            if (project.value[type].has(name)) return false
            return true
        },
    })
    const newName = rawNewName?.trim()
    if (!newName) return

    const items = renameMapItem(new Map(project.value[type] as never), oldName, newName)

    push({
        ...project.value,
        view:
            view.value[0] === type && view.value[1] === oldName
                ? [type, newName, ...view.value.slice(2)]
                : view.value,
        [type]: items,
    })
}

export async function onClone<T>(
    { project, view }: UseStateReturn,
    type: ProjectItemTypeOf<T>,
    title: string,
    placeholder: string,
    oldName: string,
) {
    const rawNewName: string | undefined = await show(ModalTextInput, {
        icon: markRaw(IconClone),
        title,
        defaultValue: oldName,
        placeholder,
        errorMessage: 'Use a unique name.',
        validator(name: string) {
            name = name.trim()
            if (!name.length) return false
            if (project.value[type].has(name)) return false
            return true
        },
    })
    const newName = rawNewName?.trim()
    if (!newName) return

    const items = new Map(project.value[type] as never)
    const newItem = clone(items.get(oldName))
    items.set(newName, newItem as never)

    push({
        ...project.value,
        view:
            view.value[0] === type && view.value[1] === oldName
                ? [type, newName, ...view.value.slice(2)]
                : view.value,
        [type]: items,
    })
}
