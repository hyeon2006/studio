<script setup lang="ts">
import { onMounted, onUnmounted, ref, watchEffect } from 'vue'
import {
    type ExplorerItem,
    isOpened,
    open,
    toggle,
    toKey,
    useExplorer,
} from '../composables/explorer'
import { useState } from '../composables/state'
import IconAngleDown from '../icons/angle-down-solid.svg?component'
import IconAngleRight from '../icons/angle-right-solid.svg?component'
import IconClone from '../icons/clone-solid.svg?component'
import IconEdit from '../icons/edit-solid.svg?component'
import IconFile from '../icons/file-solid.svg?component'
import IconPlus from '../icons/plus-solid.svg?component'
import IconTrash from '../icons/trash-alt-solid.svg?component'
import MyImageIcon from './ui/MyImageIcon.vue'
import { resolveViewInfo } from './ViewManager'

const { project, view, isExplorerOpened, sidebarWidth } = useState()
const { tree } = useExplorer()

const isResizing = ref(false)
const isDesktop = ref(window.innerWidth >= 640)

watchEffect(() => {
    if (!resolveViewInfo(project.value, view.value)) return

    const path: string[] = []
    for (const part of view.value) {
        path.push(part)
        open(path)
    }
})

function isPathCurrentView(path: string[]) {
    return (
        path.length === view.value.length && path.every((part, index) => part === view.value[index])
    )
}

function onClick(item: ExplorerItem) {
    if (resolveViewInfo(project.value, item.path) && !isPathCurrentView(item.path)) {
        view.value = item.path
        isExplorerOpened.value = false
        return
    }
    toggle(item.path)
}

function onWindowResize() {
    const width = window.innerWidth
    isDesktop.value = width >= 640

    if (isDesktop.value) {
        const maxWidth = width / 2
        if (sidebarWidth.value > maxWidth) {
            sidebarWidth.value = maxWidth
        }
    }
}

onMounted(() => {
    window.addEventListener('resize', onWindowResize)
    onWindowResize()
})
onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize)
})

function startResize() {
    isResizing.value = true
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
}

function handleResize(e: MouseEvent) {
    if (!isResizing.value) return

    const maxWidth = (e.view?.innerWidth ?? window.innerWidth) / 2
    sidebarWidth.value = Math.max(200, Math.min(e.clientX, maxWidth))
}

function stopResize() {
    isResizing.value = false
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
}
</script>

<template>
    <div
        class="bg-sonolus-main fixed top-8 bottom-0 left-0 z-20 flex w-full -translate-x-full text-sm opacity-0 sm:translate-x-0 sm:opacity-100"
        :class="{
            'translate-x-0 opacity-100': isExplorerOpened,
            'transition-all duration-200': !isResizing,
        }"
        :style="{ width: isDesktop ? `${sidebarWidth}px` : '' }"
    >
        <div class="scrollbar h-full flex-1 overflow-y-auto">
            <div
                v-for="item in tree"
                :key="toKey(item.path)"
                class="transparent-clickable group flex h-8 w-full items-center"
                :class="{
                    'bg-sonolus-ui-button-normal': isPathCurrentView(item.path),
                }"
                @click="onClick(item)"
            >
                <button
                    class="h-full flex-none pr-2"
                    :class="{
                        'pl-2': item.level === 0,
                        'pl-4': item.level === 1,
                        'pl-8': item.level === 2,
                        'pl-12': item.level === 3,
                        'pl-16': item.level === 4,
                        'pl-20': item.level === 5,
                        'pointer-events-none opacity-0': !item.hasChildren,
                    }"
                    @click.stop="toggle(item.path)"
                >
                    <component
                        :is="isOpened(item.path) ? IconAngleDown : IconAngleRight"
                        class="icon"
                    />
                </button>
                <MyImageIcon
                    v-if="typeof item.icon === 'string'"
                    class="icon flex-none"
                    :src="item.icon"
                    :fallback="item.fallback || IconFile"
                    fill
                />
                <component :is="item.icon || item.fallback" v-else class="icon flex-none" />
                <div class="ml-2 flex-1 truncate text-left">
                    {{ item.title }}
                </div>
                <button
                    v-if="item.onNew"
                    class="h-full flex-none px-2 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-0"
                    @click.stop="item.onNew?.()"
                >
                    <IconPlus class="icon" />
                </button>
                <button
                    v-if="item.onClone"
                    class="h-full flex-none px-2 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-0"
                    @click.stop="item.onClone?.()"
                >
                    <IconClone class="icon" />
                </button>
                <button
                    v-if="item.onCopy"
                    class="h-full flex-none px-2 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-0"
                    @click.stop="item.onCopy?.()"
                >
                    <IconClone class="icon" />
                </button>
                <button
                    v-if="item.onPaste"
                    class="h-full flex-none px-2 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-0"
                    @click.stop="item.onPaste?.()"
                >
                    <IconFile class="icon" />
                </button>
                <button
                    v-if="item.onRename"
                    class="h-full flex-none px-2 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-0"
                    @click.stop="item.onRename?.()"
                >
                    <IconEdit class="icon" />
                </button>
                <button
                    v-if="item.onDelete"
                    class="h-full flex-none px-2 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-0"
                    @click.stop="item.onDelete()"
                >
                    <IconTrash class="icon" />
                </button>
            </div>
        </div>

        <div
            class="hover:bg-sonolus-ui-text-disabled hidden h-full w-2 flex-none cursor-col-resize sm:block"
            @mousedown.prevent="startResize"
        ></div>
    </div>
</template>
