<script setup lang="ts">
import { saveAs } from 'file-saver'
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { show, useModal } from '../composables/modal'
import { push, redo, replace, undo, useState } from '../composables/state'
import { toast } from '../composables/toast'
import { newProject, type Project } from '../core/project'
import IconBox from '../icons/box-solid.svg?component'
import IconList from '../icons/list-solid.svg?component'
import ModalConfirmation from './modals/ModalConfirmation.vue'
import ModalPackProject from './modals/ModalPackProject.vue'
import ModalUnpackPackage from './modals/ModalUnpackPackage.vue'

const { project, canUndo, canRedo, isModified, isExplorerOpened } = useState()
const { modal } = useModal()

function toggleExplorer() {
    isExplorerOpened.value = !isExplorerOpened.value
    close()
}

const menus = computed(() => [
    {
        title: 'Project',
        items: [
            {
                title: 'New',
                enabled: true,
                key: 'n',
                command: () => {
                    void onNewProject()
                },
            },
            null,
            {
                title: 'Open',
                enabled: true,
                key: 'o',
                command: () => {
                    void onOpenProject()
                },
            },
            {
                title: 'Import',
                enabled: true,
                key: 'i',
                command: onImportProject,
            },
            null,
            {
                title: 'Save',
                enabled: true,
                key: 's',
                command: () => {
                    void onSaveProject()
                },
            },
            {
                title: 'Save As',
                enabled: true,
                key: 'shift+s',
                command: () => {
                    void onSaveProjectAs()
                },
            },
        ],
    },
    {
        title: 'Edit',
        items: [
            {
                title: 'Undo',
                enabled: canUndo.value,
                key: 'z',
                command: undo,
            },
            {
                title: 'Redo',
                enabled: canRedo.value,
                key: 'y',
                command: redo,
            },
        ],
    },
])

async function onNewProject() {
    if (isModified.value) {
        const result = await show(ModalConfirmation, {
            message: 'Creating a new project will cause current project to be closed. Continue?',
        })
        if (!result) return
    }

    replace(newProject())
    fileHandle.value = undefined
}

const el = ref<HTMLInputElement>()
const onFileSelected = ref<(file: File) => Promise<void>>()

function onFileInput() {
    if (!el.value) return

    const file = el.value.files?.[0]
    if (!file) return

    el.value.value = ''

    void onFileSelected.value?.(file)
}

function selectFile(callback: (file: File) => Promise<void>) {
    if (!el.value) return

    onFileSelected.value = callback
    el.value.click()
}

async function unpackAndReplace(file: File, handle?: FileSystemFileHandle) {
    const selectedProject: Project | undefined = await show(ModalUnpackPackage, file)
    if (!selectedProject) return

    replace(selectedProject)
    fileHandle.value = handle
}

async function onOpenProject() {
    if (isModified.value) {
        const result = await show(ModalConfirmation, {
            message: 'Opening a project will cause current project to be closed. Continue?',
        })
        if (!result) return
    }

    if (window.showOpenFilePicker) {
        try {
            const [handle] = await window.showOpenFilePicker({ types: packageFileTypes })
            if (!handle) return

            await unpackAndReplace(await handle.getFile(), handle)
        } catch (err) {
            if ((err as Error).name === 'AbortError') return

            console.error(err)
            selectFile(unpackAndReplace)
        }
        return
    }

    selectFile(unpackAndReplace)
}

const isDragOver = ref(false)
let dragCounter = 0

function hasFiles(e: DragEvent) {
    return !!e.dataTransfer?.types.includes('Files')
}

function onDragEnter(e: DragEvent) {
    if (!hasFiles(e) || modal.value) return

    e.preventDefault()
    dragCounter++
    isDragOver.value = true
}

function onDragOver(e: DragEvent) {
    if (!hasFiles(e) || modal.value) return

    e.preventDefault()
}

function onDragLeave(e: DragEvent) {
    if (!hasFiles(e)) return

    dragCounter--
    if (dragCounter <= 0) {
        dragCounter = 0
        isDragOver.value = false
    }
}

function onDrop(e: DragEvent) {
    if (!hasFiles(e)) return

    e.preventDefault()
    dragCounter = 0
    isDragOver.value = false
    if (modal.value) return

    const file = e.dataTransfer?.files[0]
    if (!file) return

    // must be requested synchronously during the drop event
    const handlePromise = e.dataTransfer?.items[0]?.getAsFileSystemHandle?.()

    void onDropFile(file, handlePromise)
}

async function onDropFile(file: File, handlePromise?: Promise<FileSystemHandle | null>) {
    if (isModified.value) {
        const result = await show(ModalConfirmation, {
            message: 'Opening a project will cause current project to be closed. Continue?',
        })
        if (!result) return
    }

    let handle: FileSystemFileHandle | undefined
    try {
        const dropped = await handlePromise
        if (dropped?.kind === 'file') handle = dropped as FileSystemFileHandle
    } catch (err) {
        console.error(err)
    }

    await unpackAndReplace(file, handle)
}

function onImportProject() {
    selectFile(async (file) => {
        const selectedProject: Project | undefined = await show(ModalUnpackPackage, file)
        if (!selectedProject) return

        const skins = await merge(
            project.value.skins,
            selectedProject.skins,
            (name) => `Skin "${name}" already exists. Overwrite?`,
        )
        const backgrounds = await merge(
            project.value.backgrounds,
            selectedProject.backgrounds,
            (name) => `Background "${name}" already exists. Overwrite?`,
        )
        const effects = await merge(
            project.value.effects,
            selectedProject.effects,
            (name) => `SFX "${name}" already exists. Overwrite?`,
        )
        const particles = await merge(
            project.value.particles,
            selectedProject.particles,
            (name) => `Particle "${name}" already exists. Overwrite?`,
        )

        push({
            view: project.value.view,
            title: project.value.title,
            description: project.value.description,
            banner: project.value.banner,
            skins,
            backgrounds,
            effects,
            particles,
        })

        async function merge<T>(
            source: Map<string, T>,
            target: Map<string, T>,
            message: (name: string) => string,
        ) {
            const output = new Map(source)

            for (const [name, item] of target) {
                if (output.has(name)) {
                    const result = await show(ModalConfirmation, {
                        message: message(name),
                    })
                    if (!result) continue
                }

                output.set(name, item)
            }

            return output
        }
    })
}

const fileHandle = ref<FileSystemFileHandle>()

const packageFileTypes = [
    {
        description: 'Sonolus Collection Package',
        accept: { 'application/octet-stream': ['.scp'] },
    },
]

function packageFileName() {
    const title = project.value.title.trim().replace(/[\\/:*?"<>|]/g, '_')
    return `${title || 'project'}.scp`
}

async function writeToHandle(handle: FileSystemFileHandle, blob: Blob) {
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()

    toast(`Saved to ${handle.name}`, 'success')
}

async function saveBlobAs(blob: Blob) {
    if (!window.showSaveFilePicker) {
        saveAs(blob, packageFileName())
        return
    }

    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: packageFileName(),
            types: packageFileTypes,
        })

        await writeToHandle(handle, blob)
        fileHandle.value = handle
    } catch (err) {
        if ((err as Error).name === 'AbortError') return

        console.error(err)
        saveAs(blob, packageFileName())
    }
}

async function onSaveProject() {
    const result: Blob | undefined = await show(ModalPackProject, project.value)
    if (!result) return

    if (fileHandle.value) {
        try {
            await writeToHandle(fileHandle.value, result)
            return
        } catch (err) {
            if ((err as Error).name === 'AbortError') return

            console.error(err)
        }
    }

    await saveBlobAs(result)
}

async function onSaveProjectAs() {
    const result: Blob | undefined = await show(ModalPackProject, project.value)
    if (!result) return

    await saveBlobAs(result)
}

watchEffect(() => {
    const title = project.value.title.trim()
    document.title =
        (isModified.value ? '● ' : '') + (title ? `${title} - Sonolus Studio` : 'Sonolus Studio')
})

const openedIndex = ref<number>()

function open(index: number) {
    openedIndex.value = index
}

function switchTo(index: number) {
    if (openedIndex.value === undefined) return

    openedIndex.value = index
}

function close() {
    openedIndex.value = undefined
}

function onClick(item: { command: () => void }) {
    item.command()
    close()
}

onMounted(() => {
    document.addEventListener('keydown', onKeyDown, { passive: false })
    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
})
onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('dragenter', onDragEnter)
    document.removeEventListener('dragover', onDragOver)
    document.removeEventListener('dragleave', onDragLeave)
    document.removeEventListener('drop', onDrop)
})

const hotkeys = computed(() => {
    const output = new Map<string, (() => void) | null>()

    for (const menu of menus.value) {
        for (const item of menu.items) {
            if (!item) continue

            output.set(item.key, item.enabled ? item.command : null)
        }
    }

    return output
})

function formatHotkey(key: string) {
    return ['ctrl', ...key.split('+')]
        .map((part) => part[0]!.toUpperCase() + part.slice(1))
        .join(' + ')
}

function onKeyDown(e: KeyboardEvent) {
    if (!e.ctrlKey) return

    let key = e.key.toLowerCase()
    if (e.shiftKey) {
        // Ctrl+Shift+Z -> Redo
        key = key === 'z' ? 'y' : `shift+${key}`
    }

    const command = hotkeys.value.get(key)
    if (command === undefined) return

    e.preventDefault()
    if (modal.value) return

    command?.()
}
</script>

<template>
    <div
        class="fixed top-0 z-40 flex h-8 w-full border-b border-white/10 bg-black/80 text-sm backdrop-blur-md"
        @click.self="close()"
    >
        <button
            class="transparent-clickable h-full flex-none px-2 sm:hidden"
            @click="toggleExplorer()"
        >
            <IconList class="icon" />
        </button>
        <button
            v-for="(menu, i) in menus"
            :key="i"
            class="transparent-clickable h-full flex-none px-3"
            :class="{ 'bg-sonolus-ui-button-highlighted': openedIndex === i }"
            @click.self="open(i)"
            @mouseover.self="switchTo(i)"
        >
            {{ menu.title }}
            <Transition
                enter-from-class="-translate-y-1 opacity-0"
                enter-to-class="translate-y-0 opacity-100"
                enter-active-class="transition-all duration-150"
            >
                <div
                    v-if="openedIndex === i"
                    class="absolute top-8 -ml-3 flex min-w-[8rem] cursor-default flex-col overflow-hidden rounded-b-lg border border-white/10 bg-black/95 py-1 shadow-xl shadow-black/50 backdrop-blur-xl sm:min-w-[12rem]"
                >
                    <template v-for="(item, j) in menu.items" :key="j">
                        <button
                            v-if="item"
                            class="transparent-clickable flex w-full flex-none items-center px-3 py-1 text-left"
                            :disabled="!item.enabled"
                            @click="onClick(item)"
                        >
                            <div class="flex-grow">{{ item.title }}</div>
                            <div
                                class="text-sonolus-ui-text-disabled ml-8 hidden flex-shrink-0 text-xs sm:block"
                            >
                                {{ formatHotkey(item.key) }}
                            </div>
                        </button>
                        <hr v-else class="my-1 w-full flex-none border-white/10" />
                    </template>
                </div>
            </Transition>
        </button>
    </div>
    <div class="h-8" />

    <div v-if="openedIndex !== undefined" class="fixed z-30 h-full w-full" @click="close()" />

    <input ref="el" class="hidden" type="file" @input="onFileInput()" />

    <div
        v-if="isDragOver"
        class="bg-sonolus-main/80 pointer-events-none fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
    >
        <div
            class="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/30 px-16 py-12"
        >
            <IconBox class="h-10 w-10 fill-current opacity-75" />
            <div class="text-xl">Drop package to open</div>
        </div>
    </div>
</template>
