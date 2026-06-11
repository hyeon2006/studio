import { type Tag } from '@sonolus/core'

export interface ProjectTag {
    title: string
    icon: string
}

export function packTags(tags: ProjectTag[]): Tag[] {
    return tags
        .filter((tag) => tag.title.trim() || tag.icon)
        .map((tag) => (tag.icon ? { title: tag.title, icon: tag.icon } : { title: tag.title }))
}

export function unpackTags(tags: Tag[] | undefined): ProjectTag[] {
    return (tags ?? []).map((tag) => ({
        title: typeof tag.title === 'string' ? tag.title : '',
        icon: typeof tag.icon === 'string' ? tag.icon : '',
    }))
}
