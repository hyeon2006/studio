import { getImageInfo } from './utils'

export interface SpriteLayout {
    name: string
    texture: string
    padding: {
        left: boolean
        right: boolean
        top: boolean
        bottom: boolean
    }
}

export async function tryCalculateLayout(sprite: SpriteLayout[]) {
    const sprites = await getSprites(sprite)

    let size = 128
    while (size <= 4096) {
        const layouts = calculateLayout(sprites, size)
        if (layouts) {
            return {
                size,
                layouts,
            }
        }

        size *= 2
    }
    throw new Error('Maximum texture size (4096x4096) exceeded')
}

interface Sprite {
    name: string
    w: number
    h: number
    width: number
    height: number
}

interface Rect {
    x: number
    y: number
    width: number
    height: number
}

interface Layout extends Sprite {
    x: number
    y: number
}

interface SkylineNode {
    x: number
    y: number
    width: number
}

type Heuristic = 'shortSide' | 'area' | 'longSide' | 'bottomLeft'

type SkylineMode = 'bottomLeft' | 'minWaste'

async function getSprites(sprite: SpriteLayout[]) {
    const sprites: Sprite[] = []

    for (const { name, texture, padding } of sprite) {
        const { width, height } = await getImageInfo(texture)

        sprites.push({
            name,
            w: width,
            h: height,
            width: width + (padding.left ? 1 : 0) + (padding.right ? 1 : 0),
            height: height + (padding.top ? 1 : 0) + (padding.bottom ? 1 : 0),
        })
    }

    return sprites
}

function calculateLayout(sprites: Sprite[], size: number) {
    const attempts: Layout[][] = []

    for (const orderedSprites of orderSprites(sprites)) {
        for (const heuristic of ['shortSide', 'area', 'longSide', 'bottomLeft'] as const) {
            const layouts = pack(orderedSprites, size, heuristic)
            if (layouts) attempts.push(layouts)
        }

        for (const heuristic of ['area', 'longSide', 'shortSide'] as const) {
            const layouts = packDynamic(orderedSprites, size, heuristic)
            if (layouts) attempts.push(layouts)
        }

        for (const direction of ['horizontal', 'vertical'] as const) {
            const layouts = packShelves(orderedSprites, size, direction)
            if (layouts) attempts.push(layouts)
        }

        for (const mode of ['bottomLeft', 'minWaste'] as const) {
            const layouts = packSkyline(orderedSprites, size, mode)
            if (layouts) attempts.push(layouts)
        }
    }

    return attempts.sort(compareLayouts)[0]
}

function orderSprites(sprites: Sprite[]) {
    const sorters: ((a: Sprite, b: Sprite) => number)[] = [
        (a, b) =>
            b.width * b.height - a.width * a.height ||
            Math.max(b.width, b.height) - Math.max(a.width, a.height) ||
            b.width + b.height - (a.width + a.height) ||
            a.name.localeCompare(b.name),
        (a, b) =>
            Math.max(b.width, b.height) - Math.max(a.width, a.height) ||
            b.width * b.height - a.width * a.height ||
            a.name.localeCompare(b.name),
        (a, b) =>
            b.height - a.height ||
            b.width - a.width ||
            b.width * b.height - a.width * a.height ||
            a.name.localeCompare(b.name),
        (a, b) =>
            b.width - a.width ||
            b.height - a.height ||
            b.width * b.height - a.width * a.height ||
            a.name.localeCompare(b.name),
        (a, b) =>
            b.width + b.height - (a.width + a.height) ||
            b.width * b.height - a.width * a.height ||
            a.name.localeCompare(b.name),
    ]

    const orders: Sprite[][] = []
    const keys = new Set<string>()

    for (const sorter of sorters) {
        const orderedSprites = [...sprites].sort(sorter)
        const key = orderedSprites.map(({ name }) => name).join('\n')
        if (keys.has(key)) continue

        keys.add(key)
        orders.push(orderedSprites)
    }

    return orders
}

function pack(sprites: Sprite[], size: number, heuristic: Heuristic) {
    if (sprites.some(({ width, height }) => width > size || height > size)) return

    const freeRects: Rect[] = [{ x: 0, y: 0, width: size, height: size }]
    const layouts: Layout[] = []

    for (const sprite of sprites) {
        const placement = findPlacement(sprite, freeRects, heuristic)
        if (!placement) return

        layouts.push({
            ...sprite,
            x: placement.x,
            y: placement.y,
        })

        splitFreeRects(freeRects, {
            x: placement.x,
            y: placement.y,
            width: sprite.width,
            height: sprite.height,
        })
    }

    return layouts
}

function packDynamic(sprites: Sprite[], size: number, heuristic: Heuristic) {
    if (sprites.some(({ width, height }) => width > size || height > size)) return

    const freeRects: Rect[] = [{ x: 0, y: 0, width: size, height: size }]
    const layouts: Layout[] = []
    const remaining = [...sprites]

    while (remaining.length) {
        const placement = findBestPlacement(remaining, freeRects, heuristic)
        if (!placement) return

        const [sprite] = remaining.splice(placement.index, 1)
        if (!sprite) throw new Error('Unexpected missing sprite')

        layouts.push({
            ...sprite,
            x: placement.x,
            y: placement.y,
        })

        splitFreeRects(freeRects, {
            x: placement.x,
            y: placement.y,
            width: sprite.width,
            height: sprite.height,
        })
    }

    return layouts
}

function packShelves(sprites: Sprite[], size: number, direction: 'horizontal' | 'vertical') {
    if (direction === 'vertical') return packVerticalShelves(sprites, size)

    return packHorizontalShelves(sprites, size)
}

function packHorizontalShelves(sprites: Sprite[], size: number) {
    if (sprites.some(({ width, height }) => width > size || height > size)) return

    const layouts: Layout[] = []
    let x = 0
    let y = 0
    let rowHeight = 0

    for (const sprite of sprites) {
        if (x > 0 && x + sprite.width > size) {
            x = 0
            y += rowHeight
            rowHeight = 0
        }

        if (y + sprite.height > size) return

        layouts.push({
            ...sprite,
            x,
            y,
        })

        x += sprite.width
        rowHeight = Math.max(rowHeight, sprite.height)
    }

    return layouts
}

function packVerticalShelves(sprites: Sprite[], size: number) {
    if (sprites.some(({ width, height }) => width > size || height > size)) return

    const layouts: Layout[] = []
    let x = 0
    let y = 0
    let columnWidth = 0

    for (const sprite of sprites) {
        if (y > 0 && y + sprite.height > size) {
            x += columnWidth
            y = 0
            columnWidth = 0
        }

        if (x + sprite.width > size) return

        layouts.push({
            ...sprite,
            x,
            y,
        })

        y += sprite.height
        columnWidth = Math.max(columnWidth, sprite.width)
    }

    return layouts
}

function packSkyline(sprites: Sprite[], size: number, mode: SkylineMode) {
    if (sprites.some(({ width, height }) => width > size || height > size)) return

    const skyline: SkylineNode[] = [{ x: 0, y: 0, width: size }]
    const layouts: Layout[] = []

    for (const sprite of sprites) {
        const placement = findSkylinePlacement(skyline, sprite, size, mode)
        if (!placement) return

        layouts.push({
            ...sprite,
            x: placement.x,
            y: placement.y,
        })

        addSkylineLevel(
            skyline,
            placement.index,
            placement.x,
            placement.y,
            sprite.width,
            sprite.height,
        )
    }

    return layouts
}

function findSkylinePlacement(
    skyline: SkylineNode[],
    sprite: Sprite,
    size: number,
    mode: SkylineMode,
) {
    let best: { index: number; x: number; y: number; score: [number, number, number] } | undefined

    for (let index = 0; index < skyline.length; index++) {
        const level = fitSkylineLevel(skyline, index, sprite.width, size)
        if (level === undefined) continue

        const top = level + sprite.height
        if (top > size) continue

        const x = skyline[index]!.x
        const score: [number, number, number] =
            mode === 'minWaste'
                ? [skylineWaste(skyline, index, sprite.width, level), top, x]
                : [top, x, 0]

        if (!best || compareScore3(score, best.score) < 0) {
            best = { index, x, y: level, score }
        }
    }

    return best
}

function fitSkylineLevel(skyline: SkylineNode[], index: number, width: number, size: number) {
    const x = skyline[index]!.x
    if (x + width > size) return

    let remaining = width
    let level = 0

    for (let i = index; remaining > 0; i++) {
        const node = skyline[i]
        if (!node) return

        level = Math.max(level, node.y)
        remaining -= node.width
    }

    return level
}

function skylineWaste(skyline: SkylineNode[], index: number, width: number, level: number) {
    let remaining = width
    let waste = 0

    for (let i = index; remaining > 0; i++) {
        const node = skyline[i]!
        waste += (level - node.y) * Math.min(node.width, remaining)
        remaining -= node.width
    }

    return waste
}

function addSkylineLevel(
    skyline: SkylineNode[],
    index: number,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    skyline.splice(index, 0, { x, y: y + height, width })

    for (let i = index + 1; i < skyline.length; i++) {
        const prev = skyline[i - 1]!
        const node = skyline[i]!

        if (node.x >= prev.x + prev.width) break

        const shrink = prev.x + prev.width - node.x
        node.x += shrink
        node.width -= shrink

        if (node.width > 0) break

        skyline.splice(i, 1)
        i--
    }

    mergeSkyline(skyline)
}

function mergeSkyline(skyline: SkylineNode[]) {
    for (let i = 0; i < skyline.length - 1; i++) {
        const node = skyline[i]!
        const next = skyline[i + 1]!

        if (node.y !== next.y) continue

        node.width += next.width
        skyline.splice(i + 1, 1)
        i--
    }
}

function compareScore3(a: [number, number, number], b: [number, number, number]) {
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

function findPlacement(sprite: Sprite, freeRects: Rect[], heuristic: Heuristic) {
    let best: Rect | undefined
    let bestScore: [number, number, number, number] | undefined

    for (const freeRect of freeRects) {
        if (freeRect.width < sprite.width || freeRect.height < sprite.height) continue

        const score = getPlacementScore(sprite, freeRect, heuristic)

        if (!bestScore || compareScore(score, bestScore) < 0) {
            best = {
                x: freeRect.x,
                y: freeRect.y,
                width: sprite.width,
                height: sprite.height,
            }
            bestScore = score
        }
    }

    return best
}

function findBestPlacement(sprites: Sprite[], freeRects: Rect[], heuristic: Heuristic) {
    let best:
        | (Rect & {
              index: number
              score: [number, number, number, number]
              area: number
              maxSide: number
              name: string
          })
        | undefined

    for (const [index, sprite] of sprites.entries()) {
        for (const freeRect of freeRects) {
            if (freeRect.width < sprite.width || freeRect.height < sprite.height) continue

            const candidate = {
                x: freeRect.x,
                y: freeRect.y,
                width: sprite.width,
                height: sprite.height,
                index,
                score: getPlacementScore(sprite, freeRect, heuristic),
                area: sprite.width * sprite.height,
                maxSide: Math.max(sprite.width, sprite.height),
                name: sprite.name,
            }

            if (!best || comparePlacement(candidate, best) < 0) {
                best = candidate
            }
        }
    }

    return best
}

function getPlacementScore(
    { width, height }: Sprite,
    { x, y, width: freeWidth, height: freeHeight }: Rect,
    heuristic: Heuristic,
): [number, number, number, number] {
    const areaFit = freeWidth * freeHeight - width * height
    const leftoverX = freeWidth - width
    const leftoverY = freeHeight - height
    const shortSideFit = Math.min(leftoverX, leftoverY)
    const longSideFit = Math.max(leftoverX, leftoverY)

    if (heuristic === 'area') return [areaFit, shortSideFit, y, x]
    if (heuristic === 'longSide') return [longSideFit, shortSideFit, y, x]
    if (heuristic === 'bottomLeft') return [y + height, x, shortSideFit, areaFit]

    return [shortSideFit, longSideFit, y, x]
}

function compareScore(a: [number, number, number, number], b: [number, number, number, number]) {
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]
}

function comparePlacement(
    a: {
        score: [number, number, number, number]
        area: number
        maxSide: number
        name: string
    },
    b: {
        score: [number, number, number, number]
        area: number
        maxSide: number
        name: string
    },
) {
    return (
        compareScore(a.score, b.score) ||
        b.area - a.area ||
        b.maxSide - a.maxSide ||
        a.name.localeCompare(b.name)
    )
}

function splitFreeRects(freeRects: Rect[], usedRect: Rect) {
    for (let i = 0; i < freeRects.length; i++) {
        const splitRects = splitFreeRect(freeRects[i]!, usedRect)
        if (!splitRects) continue

        freeRects.splice(i, 1, ...splitRects)
        i += splitRects.length - 1
    }

    pruneFreeRects(freeRects)
}

function splitFreeRect(freeRect: Rect, usedRect: Rect) {
    if (!intersects(freeRect, usedRect)) return

    const rects: Rect[] = []
    const freeRight = freeRect.x + freeRect.width
    const freeBottom = freeRect.y + freeRect.height
    const usedRight = usedRect.x + usedRect.width
    const usedBottom = usedRect.y + usedRect.height

    if (usedRect.x < freeRight && usedRight > freeRect.x) {
        if (usedRect.y > freeRect.y) {
            rects.push({
                x: freeRect.x,
                y: freeRect.y,
                width: freeRect.width,
                height: usedRect.y - freeRect.y,
            })
        }

        if (usedBottom < freeBottom) {
            rects.push({
                x: freeRect.x,
                y: usedBottom,
                width: freeRect.width,
                height: freeBottom - usedBottom,
            })
        }
    }

    if (usedRect.y < freeBottom && usedBottom > freeRect.y) {
        if (usedRect.x > freeRect.x) {
            rects.push({
                x: freeRect.x,
                y: freeRect.y,
                width: usedRect.x - freeRect.x,
                height: freeRect.height,
            })
        }

        if (usedRight < freeRight) {
            rects.push({
                x: usedRight,
                y: freeRect.y,
                width: freeRight - usedRight,
                height: freeRect.height,
            })
        }
    }

    return rects.filter(({ width, height }) => width > 0 && height > 0)
}

function intersects(a: Rect, b: Rect) {
    return (
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    )
}

function pruneFreeRects(freeRects: Rect[]) {
    for (let i = 0; i < freeRects.length; i++) {
        const a = freeRects[i]!

        for (let j = i + 1; j < freeRects.length; j++) {
            const b = freeRects[j]!

            if (contains(a, b)) {
                freeRects.splice(j, 1)
                j--
                continue
            }

            if (contains(b, a)) {
                freeRects.splice(i, 1)
                i--
                break
            }
        }
    }

    freeRects.sort(
        (a, b) =>
            a.y - b.y || a.x - b.x || a.width * a.height - b.width * b.height || a.width - b.width,
    )
}

function contains(a: Rect, b: Rect) {
    return (
        a.x <= b.x &&
        a.y <= b.y &&
        a.x + a.width >= b.x + b.width &&
        a.y + a.height >= b.y + b.height
    )
}

function compareLayouts(a: Layout[], b: Layout[]) {
    const boundsA = getBounds(a)
    const boundsB = getBounds(b)

    return (
        boundsA.width * boundsA.height - boundsB.width * boundsB.height ||
        Math.max(boundsA.width, boundsA.height) - Math.max(boundsB.width, boundsB.height) ||
        boundsA.height - boundsB.height ||
        boundsA.width - boundsB.width ||
        getLayoutKey(a).localeCompare(getLayoutKey(b))
    )
}

function getBounds(layouts: Layout[]) {
    return layouts.reduce(
        (bounds, { x, y, width, height }) => ({
            width: Math.max(bounds.width, x + width),
            height: Math.max(bounds.height, y + height),
        }),
        { width: 0, height: 0 },
    )
}

function getLayoutKey(layouts: Layout[]) {
    return [...layouts]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ name, x, y }) => `${name}:${x}:${y}`)
        .join('\n')
}

export async function bakeSprite(
    { texture, padding }: Omit<SpriteLayout, 'name'>,
    x: number,
    y: number,
    w: number,
    h: number,
    ctx: CanvasRenderingContext2D,
) {
    const { img } = await getImageInfo(texture)

    const l = padding.left ? 1 : 0
    const t = padding.top ? 1 : 0

    ctx.drawImage(img, x + l, y + t)

    if (padding.left) {
        ctx.drawImage(img, 0, 0, 1, h, x, y + t, 1, h)
    }

    if (padding.right) {
        ctx.drawImage(img, w - 1, 0, 1, h, x + w + l, y + t, 1, h)
    }

    if (padding.top) {
        ctx.drawImage(img, 0, 0, w, 1, x + l, y, w, 1)
    }

    if (padding.bottom) {
        ctx.drawImage(img, 0, h - 1, w, 1, x + l, y + h + t, w, 1)
    }

    if (padding.left && padding.top) {
        ctx.drawImage(img, 0, 0, 1, 1, x, y, 1, 1)
    }

    if (padding.left && padding.bottom) {
        ctx.drawImage(img, 0, h - 1, 1, 1, x, y + h + t, 1, 1)
    }

    if (padding.right && padding.top) {
        ctx.drawImage(img, w - 1, 0, 1, 1, x + w + l, y, 1, 1)
    }

    if (padding.right && padding.bottom) {
        ctx.drawImage(img, w - 1, h - 1, 1, 1, x + w + l, y + h + t, 1, 1)
    }
}
