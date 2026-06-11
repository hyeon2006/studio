import { Text, TextFunction } from '@sonolus/core'
import { enTexts } from './text-en'

const functionHints: Record<string, string> = {
    [TextFunction.Escape]: 'escape: keep argument as-is',
    [TextFunction.TimeFull]: 'full time from timestamp',
    [TextFunction.TimeRelative]: 'relative time from timestamp',
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
