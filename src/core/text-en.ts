import textDts from '../../node_modules/@sonolus/core/dist/common/core/text/text.d.ts?raw'

// en localizations parsed from @sonolus/core doc comments, kept in sync with the installed version
export const enTexts: Record<string, string> = {}

for (const [, text, key] of textDts.matchAll(
    /\/\*\* en: ([\s\S]*?) \*\/\s*export declare const \w+: "([^"]+)"/g,
)) {
    enTexts[key!] = text!
}
