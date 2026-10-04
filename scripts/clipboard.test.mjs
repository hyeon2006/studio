import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'

test('particle clipboard resolves sprites by texture instead of source ID', async (t) => {
    const stored = new Map()
    const originalIndexedDB = globalThis.indexedDB
    const originalLocalStorage = globalThis.localStorage
    globalThis.indexedDB = {
        open() {
            const request = {
                result: {
                    close() {},
                    transaction() {
                        const transaction = {
                            objectStore() {
                                return {
                                    put(value, key) {
                                        stored.set(key, structuredClone(value))
                                        queueMicrotask(() => transaction.oncomplete())
                                    },
                                    get(key) {
                                        const read = { result: structuredClone(stored.get(key)) }
                                        queueMicrotask(() => read.onsuccess())
                                        return read
                                    },
                                }
                            },
                        }
                        return transaction
                    },
                },
            }
            queueMicrotask(() => request.onsuccess())
            return request
        },
    }
    globalThis.localStorage = { removeItem() {} }
    const server = await createServer({
        configFile: false,
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'custom',
    })
    t.after(async () => {
        await server.close()
        if (originalIndexedDB) globalThis.indexedDB = originalIndexedDB
        else delete globalThis.indexedDB
        if (originalLocalStorage) globalThis.localStorage = originalLocalStorage
        else delete globalThis.localStorage
    })
    const { useClipboard } = await server.ssrLoadModule('/src/composables/clipboard.ts')
    const { copy, paste, read } = useClipboard()
    const sprite = (id, image, padding = true) => ({
        id,
        texture: image ? `data:image/png;base64,${Buffer.from(image).toString('base64')}` : '',
        padding: { left: padding, right: padding, top: padding, bottom: padding },
    })
    const effect = (...ids) => ({ groups: [{ particles: ids.map((spriteId) => ({ spriteId })) }] })
    const references = (data) => data.groups[0].particles.map(({ spriteId }) => spriteId)

    await t.test('colliding ID with different image appends and remaps pasted references', async () => {
        const existing = sprite('#1', 'existing')
        const root = { data: { sprites: [existing] } }
        const source = sprite('#1', 'new')
        await copy('particle-effect', effect('#1', '#1'), { data: { sprites: [source] } })
        const target = {}
        await paste('particle-effect', target, root)
        assert.equal(root.data.sprites.length, 2)
        assert.deepEqual(root.data.sprites[0], existing)
        const added = root.data.sprites[1]
        assert.notEqual(added.id, existing.id)
        assert.equal(added.texture, source.texture)
        assert.deepEqual(references(target), [added.id, added.id])
        const repeated = await read('particle-effect', root)
        assert.equal(root.data.sprites.length, 2)
        assert.deepEqual(references(repeated), [added.id, added.id])
    })

    await t.test('matching image at a different ID overwrites that sprite and keeps its ID', async () => {
        const unrelated = sprite('#shared', 'unrelated')
        const root = { data: { sprites: [unrelated, sprite('#target', 'same')] } }
        const source = sprite('#shared', 'same', false)
        await copy('particle-effect', effect(source.id), { data: { sprites: [source] } })
        const result = await read('particle-effect', root)
        assert.equal(root.data.sprites.length, 2)
        assert.deepEqual(root.data.sprites[0], unrelated)
        assert.deepEqual(root.data.sprites[1], { ...source, id: '#target' })
        assert.deepEqual(references(result), ['#target'])
    })

    await t.test('missing textures cannot overwrite an existing sprite with the same ID', async () => {
        const existing = sprite('#empty', 'existing')
        const root = { data: { sprites: [existing] } }
        const source = sprite('#empty', '')
        await copy('particle-effect', effect(source.id), { data: { sprites: [source] } })
        const result = await read('particle-effect', root)
        assert.equal(root.data.sprites.length, 2)
        assert.deepEqual(root.data.sprites[0], existing)
        assert.notEqual(root.data.sprites[1].id, existing.id)
        assert.deepEqual(references(result), [root.data.sprites[1].id])
    })

    await t.test('dependencies with the same image share one appended sprite', async () => {
        const root = { data: { sprites: [] } }
        const sprites = [sprite('#a', 'same'), sprite('#b', 'same', false)]
        await copy('particle-effect', effect('#a', '#b'), { data: { sprites } })
        const result = await read('particle-effect', root)
        assert.equal(root.data.sprites.length, 1)
        const added = root.data.sprites[0]
        assert.deepEqual(references(result), [added.id, added.id])
        assert.equal(added.padding.left, false)
    })
})
