import {
    useDevicePixelRatio,
    useElementSize,
    useKeyModifier,
    useMouseInElement,
    useMousePressed,
} from '@vueuse/core'
import { computed, type Ref, ref, watch, watchEffect } from 'vue'
import { type Point, type Rect } from '../core/utils'

export function useCanvas(target: Ref<HTMLElement | undefined>) {
    const { elementX, elementY } = useMouseInElement(target)
    const { width, height } = useElementSize(target)
    const { pressed } = useMousePressed({ target })
    const { pixelRatio } = useDevicePixelRatio()
    const shift = useKeyModifier('Shift')

    const position = computed<Point>(() => [
        (elementX.value * 2) / width.value - 1,
        1 - (elementY.value * 2) / height.value,
    ])
    const canvasWidth = computed(() => width.value * pixelRatio.value)
    const canvasHeight = computed(() => height.value * pixelRatio.value)

    const rect = ref<Rect>([
        [-0.5, -0.5],
        [-0.5, 0.5],
        [0.5, 0.5],
        [0.5, -0.5],
    ])

    const draggingIndex = ref<number>()
    const hoverIndex = computed(() => {
        const [tx, ty] = position.value

        const [i, distance] = rect.value
            .map(([x, y], i) => [i, Math.hypot(tx - x, ty - y)] as const)
            .sort(([, a], [, b]) => a - b)[0]!

        if (distance > 20 / width.value) return

        return i
    })

    let dragStartRect: Rect | null = null

    watch(pressed, (value) => {
        if (!value) {
            draggingIndex.value = undefined
            return
        }

        draggingIndex.value = hoverIndex.value

        if (draggingIndex.value !== undefined) {
            dragStartRect = [
                [...rect.value[0]],
                [...rect.value[1]],
                [...rect.value[2]],
                [...rect.value[3]],
            ] as Rect
        }
    })

    watch([position, shift, draggingIndex], () => {
        if (draggingIndex.value === undefined || !dragStartRect) return

        if (shift.value) {
            const cx = dragStartRect.reduce((sum, p) => sum + p[0], 0) / 4
            const cy = dragStartRect.reduce((sum, p) => sum + p[1], 0) / 4

            const startP = dragStartRect[draggingIndex.value]
            const startDist = Math.hypot(startP[0] - cx, startP[1] - cy)
            const currentDist = Math.hypot(position.value[0] - cx, position.value[1] - cy)

            const scale = startDist === 0 ? 1 : currentDist / startDist

            for (let i = 0; i < 4; i++) {
                rect.value[i] = [
                    cx + (dragStartRect[i][0] - cx) * scale,
                    cy + (dragStartRect[i][1] - cy) * scale,
                ]
            }
        } else {
            rect.value[draggingIndex.value] = position.value

            dragStartRect = [
                [...rect.value[0]],
                [...rect.value[1]],
                [...rect.value[2]],
                [...rect.value[3]],
            ] as Rect
        }
    })

    return {
        rect,
        canvasWidth,
        canvasHeight,
        draggingIndex,
        hoverIndex,
    }
}
