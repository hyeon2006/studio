<script setup lang="ts"></script>

<template>
    <div class="rounded-md bg-white/5 p-2 text-left text-xs text-sonolus-ui-text-soften">
        <div>#KEY — localized text, e.g. #PUBLISHED → Published</div>
        <div>#KEY:value — interpolate argument, e.g. #DAY_PAST:42 → 42d ago</div>
        <div>#KEY:#KEY:value — nest, e.g. #PUBLISHED:#SEPARATOR_COLON:#DAY_PAST:42</div>
        <div>##:value — escape, keep value as-is, e.g. ##:#TITLE → #TITLE</div>
        <div>
            ##TIME_FULL:timestamp / ##TIME_RELATIVE:timestamp — formatted time, in milliseconds,
            e.g. ##TIME_FULL:1767225600000 → Jan 1st 2026
        </div>
    </div>
</template>
