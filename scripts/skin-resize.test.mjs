import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'

test('skin image resizing', async (t) => {
    const server = await createServer({
        configFile: false,
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'custom',
    })
    t.after(() => server.close())
    const {
        getSkinResizeDimensions: dimensions,
        resizeSkinTextures,
        validateSkinResizeOptions,
    } = await server.ssrLoadModule('/src/core/skin-resize.ts')
    globalThis.addEventListener = () => {}
    const { push, replace, undo, redo, useState } = await server.ssrLoadModule(
        '/src/composables/state.ts',
    )
    const { newProject } = await server.ssrLoadModule('/src/core/project.ts')
    const { nextTick } = await import('vue')

    const pixels = (width, height, keepAspectRatio = true) => ({
        mode: 'pixels',
        width,
        height,
        keepAspectRatio,
    })

    await t.test('percentage scaling rounds dimensions and preserves at least one pixel', () => {
        assert.deepEqual(dimensions(800, 400, { mode: 'percentage', percentage: 25 }), {
            width: 200,
            height: 100,
        })
        assert.deepEqual(dimensions(3, 1, { mode: 'percentage', percentage: 50 }), {
            width: 2,
            height: 1,
        })
        assert.equal(dimensions(800, 400, { mode: 'percentage', percentage: 100 }), undefined)
    })

    await t.test('aspect ratio uses width alone, height alone, or both bounds', () => {
        assert.deepEqual(dimensions(800, 400, pixels(200)), { width: 200, height: 100 })
        assert.deepEqual(dimensions(800, 400, pixels(undefined, 100)), { width: 200, height: 100 })
        assert.deepEqual(dimensions(400, 800, pixels(200)), { width: 200, height: 400 })
        assert.deepEqual(dimensions(800, 400, pixels(300, 100)), { width: 200, height: 100 })
        assert.deepEqual(dimensions(800, 400, pixels(300, 100, false)), { width: 300, height: 100 })
    })

    await t.test('pixel resizing skips undersized images and exact-size images', () => {
        assert.equal(dimensions(100, 50, pixels(200)), undefined)
        assert.equal(dimensions(100, 50, pixels(undefined, 60)), undefined)
        assert.equal(dimensions(100, 50, pixels(80, 60)), undefined)
        assert.equal(dimensions(100, 50, pixels(80, 60, false)), undefined)
        assert.equal(dimensions(100, 50, pixels(100)), undefined)
    })

    await t.test(
        'invalid input is rejected, with both dimensions required when ratio is off',
        () => {
            for (const percentage of [0, -1, 101, NaN, Infinity])
                assert.ok(validateSkinResizeOptions({ mode: 'percentage', percentage }))
            for (const options of [
                pixels(),
                pixels(0),
                pixels(-1),
                pixels(1.5),
                pixels(NaN),
                pixels(Infinity),
                pixels(50, undefined, false),
            ]) {
                assert.ok(validateSkinResizeOptions(options))
                assert.throws(() => dimensions(100, 100, options))
            }
            assert.equal(validateSkinResizeOptions(pixels(undefined, 50)), undefined)
        },
    )

    const imageSizes = new Map([
        ['wide', [800, 400]],
        ['tall', [400, 800]],
        ['small', [100, 50]],
    ])
    const draws = []
    globalThis.Image = class {
        set src(value) {
            queueMicrotask(() => {
                const size = imageSizes.get(value)
                if (!size) return this.onerror(new Error('Invalid image'))
                ;[this.naturalWidth, this.naturalHeight] = size
                this.onload()
            })
        }
    }
    globalThis.document = {
        createElement(name) {
            assert.equal(name, 'canvas')
            const canvas = {
                getContext() {
                    return {
                        drawImage() {
                            draws.push({
                                width: canvas.width,
                                height: canvas.height,
                                smooth: this.imageSmoothingEnabled,
                            })
                        },
                    }
                },
                toBlob(callback, type) {
                    callback(new Blob([JSON.stringify([canvas.width, canvas.height])], { type }))
                },
            }
            return canvas
        },
    }
    const sprite = (name, texture) => ({
        name,
        texture,
        padding: { left: true },
        transform: { x1: { x1: 1 } },
    })
    const skin = (sprites, interpolation = true) => ({
        title: 'Title',
        thumbnail: 'thumbnail',
        data: { sprites, interpolation },
    })

    await t.test(
        'batch resizing handles multiple skins, counts skips, reuses textures, and leaves originals intact',
        async () => {
            draws.length = 0
            const source = new Map([
                [
                    'first',
                    skin([sprite('one', 'wide'), sprite('two', 'small'), sprite('empty', '')]),
                ],
                ['second', skin([sprite('three', 'wide'), sprite('four', 'tall')])],
                ['unselected', skin([sprite('five', 'wide')])],
            ])
            const progress = []
            const result = await resizeSkinTextures(
                source,
                ['first', 'second'],
                pixels(200),
                undefined,
                (...args) => progress.push(args),
            )
            assert.equal(result.resized, 3)
            assert.equal(result.skipped, 2)
            assert.deepEqual(progress.at(-1), [5, 5])
            assert.deepEqual(draws, [
                { width: 200, height: 100, smooth: true },
                { width: 200, height: 400, smooth: true },
            ])
            assert.equal(source.get('first').data.sprites[0].texture, 'wide')
            assert.equal(result.skins.get('unselected'), source.get('unselected'))
            const resized = result.skins.get('first').data.sprites[0]
            assert.equal(resized.texture, result.skins.get('second').data.sprites[0].texture)
            assert.equal(resized.padding, source.get('first').data.sprites[0].padding)
            assert.equal(resized.transform, source.get('first').data.sprites[0].transform)
            assert.equal(result.skins.get('first').thumbnail, 'thumbnail')
            assert.equal((await fetch(resized.texture)).headers.get('content-type'), 'image/png')
        },
    )

    await t.test(
        'sprite selection resizes only chosen images and honors interpolation',
        async () => {
            draws.length = 0
            const source = new Map([
                ['first', skin([sprite('one', 'wide'), sprite('two', 'tall')], false)],
            ])
            const result = await resizeSkinTextures(source, ['first'], pixels(undefined, 100), [
                'one',
            ])
            assert.equal(result.resized, 1)
            assert.equal(
                result.skins.get('first').data.sprites[1],
                source.get('first').data.sprites[1],
            )
            assert.deepEqual(draws, [{ width: 200, height: 100, smooth: false }])
        },
    )

    await t.test(
        'an invalid image aborts the batch without replacing any source texture',
        async () => {
            const source = new Map([
                ['first', skin([sprite('one', 'wide'), sprite('invalid', 'missing')])],
            ])
            const before = JSON.stringify([...source])
            await assert.rejects(resizeSkinTextures(source, ['first'], pixels(200)))
            assert.equal(JSON.stringify([...source]), before)
        },
    )
    await t.test(
        'batch changes undo and redo together while resized textures remain available',
        async () => {
            const initial = newProject()
            initial.skins.set('first', skin([sprite('one', 'wide')]))
            initial.skins.set('second', skin([sprite('two', 'tall')]))
            replace(initial)
            await nextTick()
            const { project, canUndo, canRedo } = useState()
            const result = await resizeSkinTextures(
                project.value.skins,
                ['first', 'second'],
                pixels(200),
            )
            const texture = result.skins.get('first').data.sprites[0].texture
            push({ ...project.value, skins: result.skins })
            await nextTick()
            assert.equal(canUndo.value, true)
            undo()
            await nextTick()
            assert.equal(project.value.skins.get('first').data.sprites[0].texture, 'wide')
            assert.equal(project.value.skins.get('second').data.sprites[0].texture, 'tall')
            assert.equal(canRedo.value, true)
            assert.equal((await fetch(texture)).status, 200)
            redo()
            await nextTick()
            assert.equal(project.value.skins.get('first').data.sprites[0].texture, texture)
        },
    )
})
