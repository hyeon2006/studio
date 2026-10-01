import { TextFunction } from '@sonolus/core'
import { enTexts } from './text-en'

// Standard text keys are previewed in English; custom translations use the requested locale.
export function localizeText(text: string, locale = 'en') {
    return text
        .split('\n')
        .map((line) => localizeLine(line, locale))
        .join('\n')
}

function localizeLine(line: string, locale: string): string {
    if (!line.startsWith('#')) return line

    const colonIndex = line.indexOf(':')
    const key = colonIndex === -1 ? line : line.slice(0, colonIndex)
    const rest = colonIndex === -1 ? undefined : line.slice(colonIndex + 1)

    if (key === '##') return rest ?? ''

    if (key === TextFunction.Localize) {
        try {
            const translations: unknown = JSON.parse(rest ?? '')
            if (!translations || typeof translations !== 'object' || Array.isArray(translations))
                return line

            const entries = Object.entries(translations)
            if (!entries.every(([, value]) => typeof value === 'string')) return line

            return entries.find(([language]) => language === locale)?.[1] ?? entries[0]?.[1] ?? ''
        } catch {
            // Preserve incomplete or invalid JSON while the user is typing.
            return line
        }
    }

    if (key === '##TIME_FULL' || key === '##TIME_RELATIVE') {
        const time = Number(rest)
        if (!Number.isFinite(time)) return rest ?? ''

        return key === '##TIME_FULL'
            ? new Date(time).toLocaleString()
            : formatRelativeTime(new Date(time))
    }

    const localized = enTexts[key]
    if (localized === undefined) return line

    if (rest === undefined) return localized

    const arg = localizeLine(rest, locale)
    return localized.includes('{0}') ? localized.replaceAll('{0}', arg) : localized + arg
}

function formatRelativeTime(date: Date) {
    const seconds = (date.getTime() - Date.now()) / 1000

    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
        ['second', 1],
    ] as const

    for (const [unit, size] of units) {
        const value = Math.trunc(seconds / size)
        if (value) return new Intl.RelativeTimeFormat('en').format(value, unit)
    }

    return 'now'
}
