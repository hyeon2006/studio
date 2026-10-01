import { Text, TextFunction } from '@sonolus/core'
import { enTexts } from './text-en'

const functionHints: Record<string, string> = {
    [TextFunction.Escape]: 'escape: keep argument as-is',
    [TextFunction.TimeFull]: 'full time from timestamp',
    [TextFunction.TimeRelative]: 'relative time from timestamp',
    [TextFunction.Localize]:
        'language-specific text from JSON, e.g. {"en":"Hello!","ko":"안녕하세요!"}',
}

export function suggestText(text: string, caret = text.length) {
    const before = text.slice(0, caret)
    const line = before.slice(before.lastIndexOf('\n') + 1)
    if (!line.startsWith('#')) return []

    const segments = line.split(':')
    if (
        segments
            .slice(0, -1)
            .some((key) => key === TextFunction.Escape || key === TextFunction.Localize)
    )
        return []

    const tail = segments.at(-1) ?? ''
    if (!tail.startsWith('#')) return []

    const prefix = before.slice(0, before.length - tail.length)
    const suffix = text.slice(caret)
    return suggestTextKeys(tail).map(({ value, hint }) => ({
        value: prefix + value + suffix,
        label: value,
        hint,
        caret: prefix.length + value.length,
    }))
}

const candidates = [...new Set<string>([...Object.values(Text), ...Object.values(TextFunction)])]

export function suggestTextKeys(tail: string) {
    const query = tail.toLowerCase()

    return candidates
        .filter((candidate) => candidate.toLowerCase().startsWith(query) && candidate !== tail)
        .slice(0, 50)
        .map((candidate) => ({
            value: candidate,
            hint: enTexts[candidate] ?? functionHints[candidate],
        }))
}
