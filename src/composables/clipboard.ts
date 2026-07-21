import { packRaw } from '../core/utils'
import { toast } from './toast'

const CLIPBOARD_KEY = 'sonolus_studio_clipboard'
const DB_NAME = 'sonolus_studio'
const DB_STORE = 'clipboard'

interface SerializedFile {
    __type: 'File'
    name: string
    type: string
    data: Blob
}

interface SerializedBlobUrl {
    __type: 'BlobUrl'
    data: Blob
    mimeType: string
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

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1)
        request.onupgradeneeded = () => {
            request.result.createObjectStore(DB_STORE)
        }
        request.onsuccess = () => {
            resolve(request.result)
        }
        request.onerror = () => {
            reject(request.error)
        }
    })
}

async function storageSet(value: unknown): Promise<void> {
    const db = await openDb()
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite')
            tx.objectStore(DB_STORE).put(value, CLIPBOARD_KEY)
            tx.oncomplete = () => {
                resolve()
            }
            tx.onerror = () => {
                reject(tx.error)
            }
            tx.onabort = () => {
                reject(tx.error)
            }
        })
    } finally {
        db.close()
    }
}

async function storageGet(): Promise<unknown> {
    const db = await openDb()
    try {
        return await new Promise((resolve, reject) => {
            const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(CLIPBOARD_KEY)
            request.onsuccess = () => {
                resolve(request.result)
            }
            request.onerror = () => {
                reject(request.error)
            }
        })
    } finally {
        db.close()
    }
}

function isSerializedFile(data: unknown): data is SerializedFile {
    return (
        typeof data === 'object' &&
        data !== null &&
        '__type' in data &&
        (data as Record<string, unknown>).__type === 'File'
    )
}

function isSerializedBlobUrl(data: unknown): data is SerializedBlobUrl {
    return (
        typeof data === 'object' &&
        data !== null &&
        '__type' in data &&
        (data as Record<string, unknown>).__type === 'BlobUrl'
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
    const spritesById = new Map<string, Sprite>()
    const visited = new Set<unknown>()

    for (const sprite of rootSprites) {
        if (!spritesById.has(sprite.id)) {
            spritesById.set(sprite.id, sprite)
        }
    }

    function traverse(obj: unknown) {
        if (typeof obj !== 'object' || obj === null) return
        if (visited.has(obj)) return
        visited.add(obj)

        if (hasSpriteId(obj)) {
            const sprite = spritesById.get(obj.spriteId)
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
            data,
        } as SerializedFile
    } else if (typeof data === 'string' && data.startsWith('blob:')) {
        try {
            const res = await fetch(data)
            const blob = await res.blob()
            return {
                __type: 'BlobUrl',
                data: blob,
                mimeType: blob.type,
            } as SerializedBlobUrl
        } catch (error) {
            console.warn('Failed to serialize blob URL:', data, error)
            return data
        }
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
        return new File([data.data], data.name, { type: data.type })
    } else if (isSerializedBlobUrl(data)) {
        return URL.createObjectURL(data.data)
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
        const existingIndex = root.data.sprites.findIndex((s) => s.id === depSprite.id)
        if (existingIndex !== -1) {
            root.data.sprites.splice(existingIndex, 1, depSprite)
            console.log(`Overwrote existing sprite: ${depSprite.id}`)
            continue
        }

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

            await storageSet({
                type,
                data: serializedData,
                dependencies: serializedDependencies,
            })
            localStorage.removeItem(CLIPBOARD_KEY)
            toast('Copied to clipboard', 'success')
        } catch (err) {
            console.error(err)
            toast('Failed to copy (File processing error)', 'error')
        }
    }

    async function paste(type: string, target: object, root?: unknown, options?: PasteOptions) {
        try {
            const item = (await storageGet()) as ClipboardItem | undefined
            if (!item) {
                toast('Clipboard is empty', 'error')
                return
            }

            if (item.type !== type) {
                toast(`Type mismatch\nClipboard: ${item.type}\nTarget: ${type}`, 'error')
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
            toast('Pasted from clipboard', 'success')
        } catch (err) {
            console.error(err)
            toast('Failed to paste', 'error')
        }
    }
    async function read(type: string, root?: unknown) {
        try {
            const item = (await storageGet()) as ClipboardItem | undefined
            if (!item || item.type !== type) return null

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
