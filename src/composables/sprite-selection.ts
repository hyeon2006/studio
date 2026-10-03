import { computed, type Ref, ref, shallowRef, triggerRef } from 'vue'

export function useSpriteSelection(names: Ref<string[]>) {
    const search = ref('')
    const selected = shallowRef(new Set<string>())
    const entries = computed(() => names.value.map((name) => ({ name, lower: name.toLowerCase() })))
    const namesByLower = computed(
        () => new Map(entries.value.map(({ name, lower }) => [lower, name])),
    )
    const searchTerms = computed(() => splitTerms(search.value))
    const filteredSprites = computed(() =>
        searchTerms.value.length
            ? entries.value
                  .filter(({ lower }) => searchTerms.value.some((term) => lower.includes(term)))
                  .map(({ name }) => name)
            : names.value,
    )

    function toggle(name: string) {
        if (selected.value.has(name)) selected.value.delete(name)
        else selected.value.add(name)
        triggerRef(selected)
    }

    function selectAll() {
        for (const name of filteredSprites.value) selected.value.add(name)
        triggerRef(selected)
    }

    function deselectAll() {
        for (const name of filteredSprites.value) selected.value.delete(name)
        triggerRef(selected)
    }

    function selectSearchTerms(value: string) {
        for (const term of splitTerms(value)) {
            const name = namesByLower.value.get(term)
            if (name) selected.value.add(name)
        }
        triggerRef(selected)
        search.value = ''
    }

    return { search, selected, filteredSprites, toggle, selectAll, deselectAll, selectSearchTerms }
}

function splitTerms(value: string) {
    return value
        .split(/[,\r\n]+/)
        .map((term) => term.trim().toLowerCase())
        .filter(Boolean)
}
