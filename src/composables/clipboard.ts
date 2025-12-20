const CLIPBOARD_KEY = 'sonolus_studio_clipboard'

type SerializedFile = {
    __type: 'File'
    name: string
    type: string
    data: string
}

type ClipboardItem = {
    type: string
    data: unknown
    dependencies?: unknown[]
}

type Sprite = {
    id: string
    [key: string]: unknown
}

type HasSprites = {
    data: {
        sprites: Sprite[]
    }
}

type HasSpriteId = {
    spriteId: string
}

type PasteOptions = {
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

                for (const depSprite of deserializedDeps) {
                    const exists = root.data.sprites.some((s) => s.id === depSprite.id)
                    if (!exists) {
                        root.data.sprites.push(depSprite)
                        console.log(`Auto-added missing sprite: ${depSprite.id}`)
                    }
                }
            }

            if (options?.exclude) {
                for (const key of options.exclude) {
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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

    return {
        copy,
        paste,
    }
}
