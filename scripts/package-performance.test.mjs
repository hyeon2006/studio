import assert from 'node:assert/strict'
import { test } from 'node:test'
import JSZip from 'jszip'
import { gzip } from 'pako'
import { createServer } from 'vite'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test('package loading and cooperative task scheduling', async (t) => {
    const server = await createServer({
        configFile: false,
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'custom',
    })
    t.after(() => server.close())
    const { runTasks } = await server.ssrLoadModule('/src/core/tasks.ts')
    const { createSpriteExtractor } = await server.ssrLoadModule('/src/core/sprite-extraction.ts')
    const { unpackPackage } = await server.ssrLoadModule('/src/core/project.ts')
    const { purge } = await server.ssrLoadModule('/src/core/storage.ts')
    t.after(() => purge(new Set()))
    const noop = () => {}

    await t.test(
        'parallel work is bounded, ordered around dependencies and dynamically appended',
        async () => {
            let active = 0
            let peak = 0
            let completed = 0
            const progress = []
            const tasks = [
                {
                    description: 'discover',
                    execute() {
                        for (let i = 0; i < 11; i++)
                            tasks.push({
                                description: `sprite ${i}`,
                                parallel: true,
                                async execute() {
                                    peak = Math.max(peak, ++active)
                                    await delay(i % 3)
                                    active--
                                    completed++
                                },
                            })
                        tasks.push({
                            description: 'dependent',
                            execute() {
                                assert.equal(completed, 11)
                            },
                        })
                    },
                },
            ]
            await runTasks(
                tasks,
                (value) => progress.push(value),
                () => false,
            )
            assert.equal(peak, 4)
            assert.equal(progress.at(-1).completed, 13)
            assert.equal(progress.at(-1).total, 13)
        },
    )

    await t.test('serial tasks using a shared packing canvas never overlap', async () => {
        let active = 0
        await runTasks(
            Array.from({ length: 6 }, () => ({
                description: 'pack',
                async execute() {
                    assert.equal(++active, 1)
                    await delay(1)
                    active--
                },
            })),
            noop,
            () => false,
        )
    })

    await t.test(
        'a failed parallel batch drains before rejecting and skips dependent tasks',
        async () => {
            let drained = false
            let dependent = false
            await assert.rejects(
                runTasks(
                    [
                        {
                            description: 'failure',
                            parallel: true,
                            execute() {
                                throw new Error('encode failed')
                            },
                        },
                        {
                            description: 'in flight',
                            parallel: true,
                            async execute() {
                                await delay(5)
                                drained = true
                            },
                        },
                        {
                            description: 'dependent',
                            execute() {
                                dependent = true
                            },
                        },
                    ],
                    noop,
                    () => false,
                ),
                /encode failed/,
            )
            assert.equal(drained, true)
            assert.equal(dependent, false)
        },
    )

    await t.test('long synchronous queues yield so cancellation can run', async () => {
        let aborted = false
        let executed = 0
        let updates = 0
        setTimeout(() => {
            aborted = true
        }, 5)
        const tasks = Array.from({ length: 100 }, () => ({
            description: 'CPU work',
            execute() {
                const start = performance.now()
                while (performance.now() - start < 1) {
                    /* simulate synchronous work */
                }
                executed++
            },
        }))
        await runTasks(
            tasks,
            () => updates++,
            () => aborted,
        )
        assert.ok(executed < 100)
        assert.ok(updates < 100)
    })

    let encodes = 0
    let canvases = 0
    const createCanvas = () => {
        canvases++
        const canvas = {
            ownerDocument: { createElement: createCanvas },
            getContext() {
                return {
                    drawImage(img, x, y, w, h) {
                        canvas.crop = [x, y, w, h]
                    },
                }
            },
            toBlob(callback) {
                encodes++
                const before = JSON.stringify([canvas.width, canvas.height, canvas.crop])
                setTimeout(() => {
                    assert.equal(
                        JSON.stringify([canvas.width, canvas.height, canvas.crop]),
                        before,
                        'no canvas reuse during asynchronous encoding',
                    )
                    callback(new Blob([before]))
                }, 1)
            },
        }
        return canvas
    }

    await t.test(
        'concurrent crops use isolated reusable canvases and deduplicate atlas regions',
        async () => {
            const canvas = createCanvas()
            const extract = createSpriteExtractor(canvas)
            const img = {}
            const before = encodes
            const results = await Promise.all([
                extract(img, 0, 0, 8, 9),
                extract(img, 10, 20, 2, 3),
                extract(img, 0, 0, 8, 9),
            ])
            assert.equal(results[0], results[2])
            assert.equal(encodes - before, 2)
            assert.deepEqual(await (await fetch(results[1])).json(), [2, 3, [10, 20, 2, 3]])
            assert.equal(canvas.width, 0)
            assert.equal(canvas.height, 0)
            const count = canvases
            await extract(img, 1, 1, 4, 4)
            assert.equal(canvases, count)
        },
    )

    await t.test(
        'real SCP ZIP and gzip data preserve sprite order, transforms and particle links',
        async () => {
            const previousImage = globalThis.Image
            globalThis.Image = class {
                set src(value) {
                    fetch(value)
                        .then((r) => r.blob())
                        .then(() => {
                            this.naturalWidth = 64
                            this.naturalHeight = 64
                            this.onload()
                        })
                        .catch((error) => this.onerror(error))
                }
            }
            try {
                const zip = new JSZip()
                const json = (path, value) => zip.file(path, JSON.stringify(value))
                json('sonolus/package', { shouldUpdate: false })
                json('sonolus/info', { title: 'Test', description: 'Metadata' })
                zip.file('sonolus/repository/shared', 'atlas')
                const sprites = Array.from({ length: 12 }, (_, i) => ({
                    name: `sprite-${i}`,
                    x: i,
                    y: 0,
                    w: 2,
                    h: 3,
                    transform: { x1: { x1: 0.5 } },
                }))
                const property = { from: { c: 1 }, to: { c: 2 } }
                const particle = {
                    sprite: 5,
                    color: '#fff',
                    start: 0,
                    duration: 1,
                    x: property,
                    y: property,
                    w: property,
                    h: property,
                    r: property,
                    a: property,
                }
                for (const type of ['skins', 'particles']) {
                    json(`sonolus/${type}/list`, { items: [{ name: 'resource' }] })
                    json(`sonolus/${type}/resource`, {
                        item: {
                            title: 'Title',
                            subtitle: '',
                            author: 'Author',
                            tags: [],
                            thumbnail: { url: '/sonolus/repository/shared' },
                            texture: { url: '/sonolus/repository/shared' },
                            data: { url: `/sonolus/repository/${type}-data` },
                        },
                        description: 'Description',
                    })
                    zip.file(
                        `sonolus/repository/${type}-data`,
                        gzip(
                            JSON.stringify({
                                interpolation: false,
                                sprites,
                                effects: [
                                    {
                                        name: 'effect',
                                        transform: {},
                                        groups: [
                                            { name: 'group', count: 1, particles: [particle] },
                                        ],
                                    },
                                ],
                            }),
                        ),
                    )
                }
                const process = unpackPackage(
                    await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }),
                    createCanvas(),
                )
                const before = canvases
                await runTasks(process.tasks, noop, () => false)
                const skin = process.project.skins.get('resource')
                const loadedParticle = process.project.particles.get('resource')
                assert.deepEqual(
                    skin.data.sprites.map((s) => s.name),
                    sprites.map((s) => s.name),
                )
                assert.equal(skin.data.sprites[0].transform.x1.x1, 0.5)
                assert.equal(skin.data.interpolation, false)
                assert.equal(
                    loadedParticle.data.effects[0].groups[0].particles[0].spriteId,
                    loadedParticle.data.sprites[5].id,
                )
                assert.equal(loadedParticle.data.effects[0].groups[0].particles[0].x.ease, 'linear')
                assert.ok(canvases - before <= 3)
                const raw1 = process.getRaw('/sonolus/repository/shared')
                const raw2 = process.getRaw('/sonolus/repository/shared')
                assert.equal(raw1, raw2, 'reuse the decompression promise for a shared ZIP entry')
                await process.finish()
                assert.notEqual(
                    process.getRaw('/sonolus/repository/shared'),
                    raw1,
                    'release cached ZIP data at finish',
                )
            } finally {
                if (previousImage) globalThis.Image = previousImage
                else delete globalThis.Image
            }
        },
    )
})
