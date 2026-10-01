<script setup lang="ts"></script>

<template>
    <div class="rounded-md bg-white/5 p-2 text-left text-xs text-sonolus-ui-text-soften">
        <div>#KEY — localized text, e.g. #PUBLISHED → Published</div>
        <div>#KEY:value — interpolate argument, e.g. #DAY_PAST:42 → 42d ago</div>
        <div>#KEY:#KEY:value — nest, e.g. #PUBLISHED:#SEPARATOR_COLON:#DAY_PAST:42</div>
        <div>##:value — escape, keep value as-is, e.g. ##:#TITLE → #TITLE</div>
        <div>
            Click lo to edit translations in separate language fields. The first field uses en;
            click lo again to add another language. English is required and is exported first as the
            fallback. Text is formatted automatically when saved.
        </div>
        <div>
            ##LOCALIZE:{"en":"Hello!","ko":"안녕하세요!","ja":"こんにちは！"} — choose text for the
            player's language, falling back to the first entry. Preview uses English. Keep the JSON
            on one line; use \n inside a translation for a line break.
        </div>
        <div>
            ##TIME_FULL:timestamp / ##TIME_RELATIVE:timestamp — formatted time, in milliseconds,
            e.g. ##TIME_FULL:1767225600000 → Jan 1st 2026
        </div>
    </div>
</template>
