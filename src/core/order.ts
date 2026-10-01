export function moveMapItem<T>(
    items: Map<string, T>,
    name: string,
    offset: -1 | 1,
): Map<string, T> {
    const entries = [...items]
    const index = entries.findIndex(([key]) => key === name)
    const target = index + offset
    if (index < 0 || target < 0 || target >= entries.length) return items

    const [entry] = entries.splice(index, 1)
    entries.splice(target, 0, entry!)
    return new Map(entries)
}

export function renameMapItem<T>(items: Map<string, T>, oldName: string, newName: string) {
    return new Map([...items].map(([name, value]) => [name === oldName ? newName : name, value]))
}
