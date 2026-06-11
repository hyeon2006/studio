<script setup lang="ts">
import { onMounted, onUnmounted, ref, watchEffect } from 'vue'
import {
    type ExplorerItem,
    isOpened,
    open,
    searchQuery,
    toggle,
    toKey,
    useExplorer,
} from '../composables/explorer'
import { useState } from '../composables/state'
import IconAngleDown from '../icons/angle-down-solid.svg?component'
import IconAngleRight from '../icons/angle-right-solid.svg?component'
import IconBox from '../icons/box-solid.svg?component'
import IconClone from '../icons/clone-solid.svg?component'
import IconEdit from '../icons/edit-solid.svg?component'
import IconFile from '../icons/file-solid.svg?component'
import IconList from '../icons/list-solid.svg?component'
import IconPlus from '../icons/plus-solid.svg?component'
import IconSearch from '../icons/search-solid.svg?component'
import IconTimes from '../icons/times-solid.svg?component'
import IconTrash from '../icons/trash-alt-solid.svg?component'
import MyImageIcon from './ui/MyImageIcon.vue'
import { resolveViewInfo } from './ViewManager'

const { project, view, isExplorerOpened, sidebarWidth } = useState()
const { tree } = useExplorer()

const isResizing = ref(false)
const isDesktop = ref(window.innerWidth >= 640)
const activeItem = ref<string>('')

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

function toggleMore(key: string) {
    if (activeItem.value === key) {
        activeItem.value = ''
    } else {
        activeItem.value = key
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
        class="bg-sonolus-main/80 fixed top-8 bottom-0 left-0 z-20 flex w-full -translate-x-full border-r border-white/10 text-sm opacity-0 backdrop-blur-md sm:translate-x-0 sm:opacity-100"
        :class="{
            'translate-x-0 opacity-100': isExplorerOpened,
            'transition-all duration-200': !isResizing,
        }"
        :style="{ width: isDesktop ? `${sidebarWidth}px` : '' }"
    >
        <div class="flex h-full min-w-0 flex-1 flex-col">
            <div class="relative m-1 flex h-8 flex-none items-center overflow-hidden rounded-md">
                <input
                    v-model="searchQuery"
                    type="text"
                    class="clickable h-full w-full border-none pr-8 pl-8"
                    placeholder="Search..."
                    @keydown.escape="searchQuery = ''"
                />
                <IconSearch class="icon pointer-events-none absolute top-2 left-2" />
                <button
                    v-if="searchQuery"
                    class="transparent-clickable absolute right-0 h-full px-2"
                    @click="searchQuery = ''"
                >
                    <IconTimes class="icon" />
                </button>
            </div>
            <div class="scrollbar min-h-0 flex-1 overflow-y-auto">
                <div
                    v-for="item in tree"
                    :key="toKey(item.path)"
                    class="transparent-clickable group relative mx-1 flex h-8 items-center rounded-md"
                    :class="{
                        'bg-sonolus-ui-button-normal': isPathCurrentView(item.path),
                    }"
                    @click="onClick(item)"
                >
                    <div
                        v-if="isPathCurrentView(item.path)"
                        class="bg-sonolus-glow absolute top-1.5 bottom-1.5 left-0.5 w-0.5 rounded-full"
                    />
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
                    <div
                        class="flex h-full flex-none items-center transition-opacity duration-200 group-hover:opacity-100 sm:opacity-0"
                        :class="{
                            'sm:!opacity-100': activeItem === toKey(item.path),
                        }"
                    >
                        <template v-if="activeItem !== toKey(item.path)">
                            <button
                                v-if="item.onNew"
                                class="h-full px-2"
                                @click.stop="item.onNew?.()"
                            >
                                <IconPlus class="icon" />
                            </button>
                            <button
                                v-if="item.onRename"
                                class="h-full px-2"
                                @click.stop="item.onRename?.()"
                            >
                                <IconEdit class="icon" />
                            </button>
                            <button
                                v-if="item.onDelete"
                                class="h-full px-2"
                                @click.stop="item.onDelete()"
                            >
                                <IconTrash class="icon" />
                            </button>
                            <button
                                v-if="item.onClone || item.onCopy || item.onPaste"
                                class="h-full px-2"
                                @click.stop="toggleMore(toKey(item.path))"
                            >
                                <IconList class="icon" />
                            </button>
                        </template>
                        <template v-else>
                            <button
                                v-if="item.onClone"
                                class="h-full px-2"
                                @click.stop="item.onClone?.()"
                            >
                                <IconClone class="icon" />
                            </button>
                            <button
                                v-if="item.onCopy"
                                class="h-full px-2"
                                @click.stop="item.onCopy?.()"
                            >
                                <IconBox class="icon" />
                            </button>
                            <button
                                v-if="item.onPaste"
                                class="h-full px-2"
                                @click.stop="item.onPaste?.()"
                            >
                                <IconFile class="icon" />
                            </button>
                            <button
                                class="h-full px-2"
                                @click.stop="toggleMore(toKey(item.path))"
                            >
                                <IconTimes class="icon" />
                            </button>
                        </template>
                    </div>
                </div>
                <div
                    v-if="searchQuery && !tree.length"
                    class="text-sonolus-ui-text-disabled px-2 py-4 text-center"
                >
                    No matching items
                </div>
            </div>
        </div>

        <div
            class="hidden h-full w-1.5 flex-none cursor-col-resize transition-colors hover:bg-white/20 active:bg-white/30 sm:block"
            @mousedown.prevent="startResize"
        ></div>
    </div>
</template>
