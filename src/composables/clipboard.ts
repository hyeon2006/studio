import { packRaw } from '../core/utils'

const CLIPBOARD_KEY = 'sonolus_studio_clipboard'

interface SerializedFile {
    __type: 'File'
    name: string
    type: string
    data: string
}

interface ClipboardItem {
    type: string
    data: unknown
    dependencies?: unknown[]
}

interface Sprite {
    id: string
    [key: string]: unknown
}

interface HasSprites {
    data: {
        sprites: Sprite[]
    }
}

interface HasSpriteId {
    spriteId: string
}

interface PasteOptions {
    exclude?: string[]
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

async function dataUrlToFile(dataUrl: string, filename: string, mimeType: string): Promise<File> {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    return new File([blob], filename, { type: mimeType })
}

function isSerializedFile(data: unknown): data is SerializedFile {
    return (
        typeof data === 'object' &&
        data !== null &&
        '__type' in data &&
        (data as Record<string, unknown>).__type === 'File'
    )
}

function hasSprites(root: unknown): root is HasSprites {
    if (typeof root !== 'object' || root === null) return false
    const r = root as Record<string, unknown>

    if (typeof r.data !== 'object' || r.data === null) return false
    const d = r.data as Record<string, unknown>

    return Array.isArray(d.sprites)
}

function hasSpriteId(data: unknown): data is HasSpriteId {
    return (
        typeof data === 'object' &&
        data !== null &&
        'spriteId' in data &&
        typeof (data as Record<string, unknown>).spriteId === 'string'
    )
}

function collectDependencies(data: unknown, rootSprites: Sprite[]): Sprite[] {
    const dependencies = new Map<string, Sprite>()
    const visited = new Set<unknown>()

    function traverse(obj: unknown) {
        if (typeof obj !== 'object' || obj === null) return
        if (visited.has(obj)) return
        visited.add(obj)

        if (hasSpriteId(obj)) {
            const sprite = rootSprites.find((s) => s.id === obj.spriteId)
            if (sprite) {
                dependencies.set(sprite.id, sprite)
            }
        }

        if (Array.isArray(obj)) {
            obj.forEach((item) => {
                traverse(item)
            })
        } else {
            Object.values(obj as Record<string, unknown>).forEach((val) => {
                traverse(val)
            })
        }
    }

    traverse(data)
    return Array.from(dependencies.values())
}

function replaceSpriteIds(data: unknown, replacements: Map<string, string>) {
    const visited = new Set<unknown>()

    function traverse(obj: unknown) {
        if (typeof obj !== 'object' || obj === null) return
        if (visited.has(obj)) return
        visited.add(obj)

        if (hasSpriteId(obj)) {
            const r = obj as unknown as Record<string, unknown>
            const oldId = r.spriteId as string
            if (replacements.has(oldId)) {
                r.spriteId = replacements.get(oldId)
            }
        }

        if (Array.isArray(obj)) {
            obj.forEach((item) => {
                traverse(item)
            })
        } else {
            Object.values(obj as Record<string, unknown>).forEach((val) => {
                traverse(val)
            })
        }
    }

    traverse(data)
}

async function serialize(data: unknown): Promise<unknown> {
    if (data instanceof File) {
        return {
            __type: 'File',
            name: data.name,
            type: data.type,
            data: await fileToDataUrl(data),
        } as SerializedFile
    } else if (Array.isArray(data)) {
        return Promise.all(data.map(serialize))
    } else if (typeof data === 'object' && data !== null) {
        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            result[key] = await serialize(value)
        }
        return result
    }
    return data
}

async function deserialize(data: unknown): Promise<unknown> {
    if (isSerializedFile(data)) {
        return await dataUrlToFile(data.data, data.name, data.type)
    } else if (Array.isArray(data)) {
        return Promise.all(data.map(deserialize))
    } else if (typeof data === 'object' && data !== null) {
        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            result[key] = await deserialize(value)
        }
        return result
    }
    return data
}

async function getHash(url: string) {
    if (!url) return ''
    try {
        const { hash } = await packRaw(url)
        return hash
    } catch {
        return ''
    }
}

async function resolveDependencies(root: HasSprites, dependencies: Sprite[]) {
    const idReplacement = new Map<string, string>()
    const rootSpriteHashes = new Map<string, string>()

    const getRootSpriteHash = async (sprite: Sprite) => {
        if (rootSpriteHashes.has(sprite.id)) return rootSpriteHashes.get(sprite.id)!
        const hash = await getHash(sprite.texture as string)
        rootSpriteHashes.set(sprite.id, hash)
        return hash
    }

    for (const depSprite of dependencies) {
        const existsById = root.data.sprites.find((s) => s.id === depSprite.id)
        if (existsById) continue

        const depHash = await getHash(depSprite.texture as string)
        if (!depHash) {
            root.data.sprites.push(depSprite)
            console.log(`Auto-added missing sprite (no hash): ${depSprite.id}`)
            continue
        }

        let foundMatch: Sprite | undefined
        for (const s of root.data.sprites) {
            const sHash = await getRootSpriteHash(s)
            if (sHash === depHash) {
                foundMatch = s
                break
            }
        }

        if (foundMatch) {
            console.log(`Reused existing sprite: ${depSprite.id} -> ${foundMatch.id}`)
            idReplacement.set(depSprite.id, foundMatch.id)
        } else {
            root.data.sprites.push(depSprite)
            console.log(`Auto-added missing sprite: ${depSprite.id}`)
        }
    }

    return idReplacement
}

export function useClipboard() {
    async function copy(type: string, data: unknown, root?: unknown) {
        try {
            let dependencies: unknown[] = []

            if (hasSprites(root)) {
                dependencies = collectDependencies(data, root.data.sprites)
            }

            const serializedData = await serialize(data)
            const serializedDependencies = await serialize(dependencies)

            localStorage.setItem(
                CLIPBOARD_KEY,
                JSON.stringify({
                    type,
                    data: serializedData,
                    dependencies: serializedDependencies,
                }),
            )
            alert('Copied to clipboard')
        } catch (err) {
            console.error(err)
            alert('Failed to copy (File processing error)')
        }
    }

    async function paste(
        type: string,
        target: Record<string, unknown>,
        root?: unknown,
        options?: PasteOptions,
    ) {
        const text = localStorage.getItem(CLIPBOARD_KEY)
        if (!text) {
            alert('Clipboard is empty')
            return
        }

        try {
            const item = JSON.parse(text) as ClipboardItem

            if (item.type !== type) {
                alert(`Type mismatch\nClipboard: ${item.type}\nTarget: ${type}`)
                return
            }

            const deserializedData = (await deserialize(item.data)) as Record<string, unknown>

            if (hasSprites(root) && Array.isArray(item.dependencies)) {
                const deserializedDeps = (await deserialize(item.dependencies)) as Sprite[]
                const idReplacement = await resolveDependencies(root, deserializedDeps)

                if (idReplacement.size > 0) {
                    replaceSpriteIds(deserializedData, idReplacement)
                }
            }

            if (options?.exclude) {
                for (const key of options.exclude) {
                    delete deserializedData[key]
                }
            }

            Object.assign(target, deserializedData)
            alert('Pasted from clipboard')
        } catch (err) {
            console.error(err)
            alert('Failed to paste')
        }
    }
    async function read(type: string, root?: unknown) {
        const text = localStorage.getItem(CLIPBOARD_KEY)
        if (!text) return null

        try {
            const item = JSON.parse(text) as ClipboardItem
            if (item.type !== type) return null

            const deserializedData = await deserialize(item.data)

            if (hasSprites(root) && Array.isArray(item.dependencies)) {
                const deserializedDeps = (await deserialize(item.dependencies)) as Sprite[]
                const idReplacement = await resolveDependencies(root, deserializedDeps)

                if (idReplacement.size > 0) {
                    replaceSpriteIds(deserializedData, idReplacement)
                }
            }

            return deserializedData
        } catch (err) {
            console.error(err)
            return null
        }
    }

    return {
        copy,
        paste,
        read,
    }
}
