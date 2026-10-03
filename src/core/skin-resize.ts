import { type Skin } from './skin'
import { load } from './storage'
import { getBlob, getImageInfo } from './utils'

export type SkinResizeOptions =
    | { mode: 'percentage'; percentage: number }
    | { mode: 'pixels'; keepAspectRatio: boolean; width?: number; height?: number }

export function validateSkinResizeOptions(options: SkinResizeOptions): string | undefined {
    if (options.mode === 'percentage') {
        if (
            !Number.isFinite(options.percentage) ||
            options.percentage <= 0 ||
            options.percentage > 100
        )
            return 'Enter a percentage greater than 0 and no greater than 100.'
        return
    }

    for (const value of [options.width, options.height]) {
        if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0))
            return 'Pixel dimensions must be positive whole numbers.'
    }
    if (options.width === undefined && options.height === undefined)
        return 'Enter a width or height in pixels.'
    if (!options.keepAspectRatio && (options.width === undefined || options.height === undefined))
        return 'Enter both width and height when aspect ratio is off.'
}

export function getSkinResizeDimensions(width: number, height: number, options: SkinResizeOptions) {
    const error = validateSkinResizeOptions(options)
    if (error) throw new Error(error)

    let targetWidth: number
    let targetHeight: number
    if (options.mode === 'percentage') {
        const scale = options.percentage / 100
        targetWidth = Math.max(1, Math.round(width * scale))
        targetHeight = Math.max(1, Math.round(height * scale))
    } else {
        // Never enlarge an image, even when only one of the supplied bounds is too large.
        if (
            (options.width !== undefined && options.width > width) ||
            (options.height !== undefined && options.height > height)
        )
            return

        if (options.keepAspectRatio) {
            const scale = Math.min(
                options.width === undefined ? 1 : options.width / width,
                options.height === undefined ? 1 : options.height / height,
            )
            targetWidth = Math.max(1, Math.round(width * scale))
            targetHeight = Math.max(1, Math.round(height * scale))
        } else {
            targetWidth = options.width!
            targetHeight = options.height!
        }
    }

    if (targetWidth === width && targetHeight === height) return
    return { width: targetWidth, height: targetHeight }
}

export interface SkinResizeResult {
    skins: Map<string, Skin>
    resized: number
    skipped: number
}

export async function resizeSkinTextures(
    source: Map<string, Skin>,
    skinNames: string[],
    options: SkinResizeOptions,
    spriteNames?: string[],
    onProgress?: (completed: number, total: number) => void,
    signal?: AbortSignal,
): Promise<SkinResizeResult> {
    const error = validateSkinResizeOptions(options)
    if (error) throw new Error(error)

    signal?.throwIfAborted()
    const selectedSprites = spriteNames === undefined ? undefined : new Set(spriteNames)
    const targets = [...new Set(skinNames)].flatMap((skinName) => {
        const skin = source.get(skinName)
        if (!skin) return []
        return skin.data.sprites.flatMap((sprite, index) =>
            !selectedSprites || selectedSprites.has(sprite.name)
                ? [{ skinName, skin, sprite, index }]
                : [],
        )
    })
    const cache = new Map<string, Blob | undefined>()
    const changes: { skinName: string; index: number; blob: Blob }[] = []
    let skipped = 0
    let canvas: HTMLCanvasElement | undefined
    let context: CanvasRenderingContext2D | null = null
    let lastYield = performance.now()
    onProgress?.(0, targets.length)
    // Let the busy state paint before drawing, including when images are already cached.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    try {
        for (const [i, { skinName, skin, sprite, index }] of targets.entries()) {
            if (performance.now() - lastYield >= 8) {
                await new Promise<void>((resolve) => setTimeout(resolve, 0))
                lastYield = performance.now()
            }
            signal?.throwIfAborted()
            if (!sprite.texture) {
                skipped++
                onProgress?.(i + 1, targets.length)
                continue
            }

            const key = `${Number(skin.data.interpolation)}:${sprite.texture}`
            if (!cache.has(key)) {
                const { img, width, height } = await getImageInfo(sprite.texture)
                signal?.throwIfAborted()
                const dimensions = getSkinResizeDimensions(width, height, options)
                let blob: Blob | undefined
                if (dimensions) {
                    canvas ??= document.createElement('canvas')
                    context ??= canvas.getContext('2d')
                    if (!context) throw new Error('Failed to obtain canvas context')
                    if (canvas.width !== dimensions.width) canvas.width = dimensions.width
                    if (canvas.height !== dimensions.height) canvas.height = dimensions.height
                    context.clearRect(0, 0, canvas.width, canvas.height)
                    context.imageSmoothingEnabled = skin.data.interpolation
                    context.imageSmoothingQuality = 'high'
                    context.drawImage(img, 0, 0, canvas.width, canvas.height)
                    blob = await getBlob(canvas)
                    signal?.throwIfAborted()
                }
                cache.set(key, blob)
            }
            const blob = cache.get(key)
            if (blob) changes.push({ skinName, index, blob })
            else skipped++
            onProgress?.(i + 1, targets.length)
        }
    } finally {
        // Release the backing buffer on success, cancellation, or failure.
        if (canvas) {
            canvas.width = 0
            canvas.height = 0
        }
    }
    signal?.throwIfAborted()

    // Register textures only once all image processing has succeeded, then commit as one edit.
    const skins = new Map(source)
    const textures = new Map<Blob, string>()
    for (const { skinName, index, blob } of changes) {
        const skin = skins.get(skinName)!
        if (skin === source.get(skinName))
            skins.set(skinName, {
                ...skin,
                data: { ...skin.data, sprites: [...skin.data.sprites] },
            })
        let texture = textures.get(blob)
        if (!texture) {
            texture = load(blob)
            textures.set(blob, texture)
        }
        const sprites = skins.get(skinName)!.data.sprites
        sprites[index] = { ...sprites[index]!, texture }
    }
    return { skins, resized: changes.length, skipped }
}
