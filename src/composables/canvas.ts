import {
    useDevicePixelRatio,
    useElementSize,
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

    watch(pressed, (value) => {
        if (!value) {
            draggingIndex.value = undefined
            return
        }

        draggingIndex.value = hoverIndex.value
    })

    watchEffect(() => {
        if (draggingIndex.value === undefined) return

        rect.value[draggingIndex.value] = position.value
    })

    return {
        rect,
        canvasWidth,
        canvasHeight,
        draggingIndex,
        hoverIndex,
    }
}
