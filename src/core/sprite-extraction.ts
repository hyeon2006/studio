import { load } from './storage'
import { getBlob } from './utils'

export function createSpriteExtractor(canvas: HTMLCanvasElement) {
    const available = [canvas]
    const cache = new WeakMap<HTMLImageElement, Map<string, Promise<string>>>()

    return function extractSprite(
        img: HTMLImageElement,
        x: number,
        y: number,
        w: number,
        h: number,
    ) {
        let sprites = cache.get(img)
        if (!sprites) {
            sprites = new Map()
            cache.set(img, sprites)
        }
        const key = `${x},${y},${w},${h}`
        let texture = sprites.get(key)
        if (!texture) {
            texture = extract()
            sprites.set(key, texture)
            void texture.catch(() => sprites.delete(key))
        }
        return texture

        async function extract() {
            const target = available.pop() ?? canvas.ownerDocument.createElement('canvas')
            try {
                target.width = w
                target.height = h
                const ctx = target.getContext('2d')
                if (!ctx) throw new Error('Failed to obtain canvas context')

                ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
                return load(await getBlob(target))
            } finally {
                // Release pixel buffers, particularly for large sprites on mobile.
                target.width = 0
                target.height = 0
                available.push(target)
            }
        }
    }
}
