import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useVirtualList } from '@vueuse/core'
import vue from '@vitejs/plugin-vue'
import { createServer } from 'vite'
import svgLoader from 'vite-svg-loader'
import { effectScope, nextTick, ref, watchEffect } from 'vue'

test('large selection lists and explorer search', async (t) => {
    const server = await createServer({
        configFile: false,
        plugins: [vue(), svgLoader()],
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'custom',
    })
    t.after(() => server.close())
    const { useSpriteSelection } = await server.ssrLoadModule(
        '/src/composables/sprite-selection.ts',
    )

    await t.test(
        'filtered selection keeps hidden choices and notifies once per bulk action',
        () => {
            const selection = useSpriteSelection(ref(['Alpha', 'Beta', 'AlphaNote']))
            const counts = []
            const stop = watchEffect(() => counts.push(selection.selected.value.size), {
                flush: 'sync',
            })
            selection.toggle('Beta')
            selection.search.value = 'alpha'
            assert.deepEqual(selection.filteredSprites.value, ['Alpha', 'AlphaNote'])
            selection.selectAll()
            assert.deepEqual(counts, [0, 1, 3])
            selection.deselectAll()
            assert.deepEqual([...selection.selected.value], ['Beta'])
            assert.deepEqual(counts, [0, 1, 3, 1])
            stop()
        },
    )

    await t.test('name pasting and search remain case insensitive as resources change', () => {
        const names = ref(['Alpha', 'Beta', 'AlphaNote'])
        const selection = useSpriteSelection(names)
        selection.selectSearchTerms(' alpha,\r\n BETA,unknown ')
        assert.deepEqual([...selection.selected.value], ['Alpha', 'Beta'])
        selection.search.value = 'NOTE,beta'
        assert.deepEqual(selection.filteredSprites.value, ['Beta', 'AlphaNote'])
        names.value = ['Gamma']
        selection.selectSearchTerms('GAMMA')
        assert.equal(selection.selected.value.has('Gamma'), true)
        assert.deepEqual(selection.filteredSprites.value, ['Gamma'])
    })

    await t.test(
        '10,000 names render a bounded window and reset correctly after filtering',
        async () => {
            const scope = effectScope()
            try {
                const names = ref(Array.from({ length: 10000 }, (_, i) => `sprite-${i}`))
                const { list, containerProps, scrollTo } = scope.run(() =>
                    useVirtualList(names, { itemHeight: 40, overscan: 8 }),
                )
                containerProps.ref.value = {
                    clientHeight: 256,
                    scrollTop: 0,
                    scrollTo({ top }) {
                        this.scrollTop = top
                    },
                }
                await nextTick()
                assert.ok(list.value.length > 0 && list.value.length <= 24)
                assert.equal(list.value[0].data, 'sprite-0')
                scrollTo(9000)
                assert.ok(list.value.some(({ data }) => data === 'sprite-9000'))
                names.value = ['only-match']
                await nextTick()
                scrollTo(0)
                assert.deepEqual(
                    list.value.map(({ data }) => data),
                    ['only-match'],
                )
            } finally {
                scope.stop()
            }
        },
    )

    const originalAddEventListener = globalThis.addEventListener
    globalThis.addEventListener = () => {}
    t.after(() => {
        if (originalAddEventListener) globalThis.addEventListener = originalAddEventListener
        else delete globalThis.addEventListener
    })
    const { useExplorer, searchQuery, open } = await server.ssrLoadModule(
        '/src/composables/explorer/index.ts',
    )
    const { replace, useState } = await server.ssrLoadModule('/src/composables/state.ts')
    const { newProject } = await server.ssrLoadModule('/src/core/project.ts')
    const { newSkin, newSkinSprite } = await server.ssrLoadModule('/src/core/skin.ts')

    await t.test(
        'changing a nonempty query reuses explorer items and includes matching ancestors',
        () => {
            const project = newProject()
            const skin = newSkin()
            skin.data.sprites.push(newSkinSprite('AlphaNote'))
            project.skins.set('AlphaSkin', skin)
            project.skins.set('BetaSkin', newSkin())
            replace(project)
            const { tree } = useExplorer()
            searchQuery.value = 'alpha'
            const original = tree.value.find(
                ({ path }) => path[1] === 'AlphaSkin' && path.length === 2,
            )
            assert.ok(original)
            searchQuery.value = 'alphanote'
            assert.equal(
                tree.value.find(({ path }) => path.length === 2),
                original,
            )
            assert.ok(tree.value.some(({ path }) => path.length === 1 && path[0] === 'skins'))
            assert.ok(tree.value.some(({ path }) => path[2] === 'sprites' && path.length === 3))
            assert.ok(tree.value.some(({ path }) => path[3] === 'AlphaNote'))
            searchQuery.value = ''
            assert.equal(
                tree.value.some(({ path }) => path.length === 2),
                false,
            )
        },
    )

    await t.test('saved order actions stay correct after reordering and filtering', () => {
        const project = newProject()
        for (const name of ['first', 'middle', 'last']) project.skins.set(name, newSkin())
        replace(project)
        searchQuery.value = ''
        open(['skins'])
        const { tree } = useExplorer()
        let skins = tree.value.filter(({ path }) => path.length === 2)
        assert.equal(skins[0].onMoveUp, undefined)
        assert.equal(skins[2].onMoveDown, undefined)
        skins[1].onMoveUp()
        assert.deepEqual([...useState().project.value.skins.keys()], ['middle', 'first', 'last'])
        skins = tree.value.filter(({ path }) => path.length === 2)
        assert.equal(skins[0].title, 'middle')
        assert.equal(skins[0].onMoveUp, undefined)
        searchQuery.value = 'middle'
        tree.value.find(({ path }) => path.length === 2).onMoveDown()
        assert.deepEqual([...useState().project.value.skins.keys()], ['first', 'middle', 'last'])
        searchQuery.value = ''
    })
})
