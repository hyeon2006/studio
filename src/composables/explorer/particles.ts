import { ParticleEffectName } from '@sonolus/core'
import { markRaw } from 'vue'
import ModalName from '../../components/modals/ModalName.vue'
import ModalSelectSprites from '../../components/modals/ModalSelectSprites.vue'
import ModalTextInput from '../../components/modals/ModalTextInput.vue'
import { newId } from '../../core/id'
import {
    type Particle,
    formatParticleEffectName,
    newParticle,
    newParticleEffect,
    newParticleEffectGroup,
    newParticleEffectGroupParticle,
    newParticleSprite,
} from '../../core/particle'
import { packRaw } from '../../core/utils'
import { clone } from '../../core/utils'
import IconClone from '../../icons/clone-solid.svg?component'
import IconEdit from '../../icons/edit-solid.svg?component'
import IconFileImage from '../../icons/file-image-solid.svg?component'
import IconFile from '../../icons/file-solid.svg?component'
import IconFolder from '../../icons/folder-solid.svg?component'
import IconParticle from '../../icons/particle.svg?component'
import IconPlus from '../../icons/plus-solid.svg?component'
import ModalErrorCancel from '../../components/modals/ModalErrorCancel.vue'
import IconCheck from '../../icons/check-solid.svg?component'
import { useClipboard } from '../clipboard'
import { show } from '../modal'
import { push, type UseStateReturn } from '../state'
import { type ExplorerItem, isOpened, onClone, onDelete, onDeleteAll, onNew, onRename } from '.'

async function getHash(url: string) {
    if (!url) return ''
    try {
        const { hash } = await packRaw(url)
        return hash
    } catch {
        return ''
    }
}

export function addParticleItems(state: UseStateReturn, items: ExplorerItem[]) {
    items.push({
        level: 0,
        path: ['particles'],
        hasChildren: true,
        icon: IconParticle,
        title: `Particles (${state.project.value.particles.size})`,
        onNew: () => {
            void onNew(state, 'particles', 'New Particle', 'Enter particle name...', newParticle())
        },
        onDelete: () => {
            onDeleteAll(state, 'particles')
        },
    })

    if (!isOpened(['particles'])) return

    for (const [name, particle] of state.project.value.particles) {
        items.push({
            level: 1,
            path: ['particles', name],
            hasChildren: true,
            icon: particle.thumbnail,
            title: name,
            onRename: () => {
                void onRename(
                    state,
                    'particles',
                    'Rename Particle',
                    'Enter new particle name...',
                    name,
                )
            },
            onClone: () => {
                void onClone(
                    state,
                    'particles',
                    'Clone Particle',
                    'Enter new particle name...',
                    name,
                )
            },
            onDelete: () => {
                onDelete(state, 'particles', name)
            },
        })

        if (!isOpened(['particles', name])) continue

        items.push({
            level: 2,
            path: ['particles', name, 'sprites'],
            hasChildren: true,
            icon: IconFolder,
            title: `Sprites (${particle.data.sprites.length})`,
            onNew: () => {
                onNewParticleSprite(state, name)
            },
            onCopy: () => {
                void onCopyParticleSprites(state, name)
            },
            onPaste: () => {
                void onPasteParticleSprites(state, name)
            },
            onDelete: () => {
                onDeleteParticleSprites(state, name)
            },
        })

        if (isOpened(['particles', name, 'sprites'])) {
            for (const [index, { id: spriteId, texture }] of particle.data.sprites.entries()) {
                items.push({
                    level: 3,
                    path: ['particles', name, 'sprites', spriteId],
                    hasChildren: false,
                    icon: texture,
                    fallback: IconFileImage,
                    title: `Sprite #${index + 1}`,
                    onDelete: () => {
                        onDeleteParticleSprite(state, name, spriteId)
                    },
                })
            }
        }

        items.push({
            level: 2,
            path: ['particles', name, 'effects'],
            hasChildren: true,
            icon: IconFolder,
            title: `Effects (${particle.data.effects.length})`,
            onNew: () => {
                void onNewParticleEffect(state, name)
            },
            onCopy: () => {
                void onCopyParticleEffects(state, name)
            },
            onPaste: () => {
                void onPasteParticleEffects(state, name)
            },
            onDelete: () => {
                onDeleteParticleEffects(state, name)
            },
        })

        if (isOpened(['particles', name, 'effects'])) {
            for (const { name: effectName, groups } of particle.data.effects) {
                items.push({
                    level: 3,
                    path: ['particles', name, 'effects', effectName],
                    hasChildren: true,
                    icon: IconParticle,
                    fallback: IconFileImage,
                    title: formatParticleEffectName(effectName),
                    onNew: () => {
                        onNewParticleEffectGroup(state, name, effectName)
                    },
                    onRename: () => {
                        void onRenameParticleEffect(state, name, effectName)
                    },
                    onClone: () => {
                        void onCloneParticleEffect(state, name, effectName)
                    },
                    onCopy: () => {
                        void onCopyParticleEffectGroups(state, name, effectName)
                    },
                    onPaste: () => {
                        void onPasteParticleEffectGroups(state, name, effectName)
                    },
                    onDelete: () => {
                        onDeleteParticleEffect(state, name, effectName)
                    },
                })

                if (!isOpened(['particles', name, 'effects', effectName])) continue

                for (const [groupIndex, group] of groups.entries()) {
                    items.push({
                        level: 4,
                        path: ['particles', name, 'effects', effectName, 'groups', `${groupIndex}`],
                        hasChildren: true,
                        icon: IconFolder,
                        title: group.name ? group.name : `Group #${groupIndex}`,
                        onNew: () => {
                            onNewParticleEffectGroupParticle(state, name, effectName, groupIndex)
                        },
                        onRename: () => {
                            void onRenameParticleEffectGroup(state, name, effectName, groupIndex)
                        },
                        onClone: () => {
                            onCloneParticleEffectGroup(state, name, effectName, groupIndex)
                        },
                        onDelete: () => {
                            onDeleteParticleEffectGroup(state, name, effectName, groupIndex)
                        },
                    })

                    if (
                        !isOpened([
                            'particles',
                            name,
                            'effects',
                            effectName,
                            'groups',
                            `${groupIndex}`,
                        ])
                    )
                        continue

                    for (const [particleIndex, { spriteId }] of group.particles.entries()) {
                        items.push({
                            level: 5,
                            path: [
                                'particles',
                                name,
                                'effects',
                                effectName,
                                'groups',
                                `${groupIndex}`,
                                'particles',
                                `${particleIndex}`,
                            ],
                            hasChildren: false,
                            icon:
                                particle.data.sprites.find(({ id }) => id === spriteId)?.texture ??
                                '',
                            fallback: IconFileImage,
                            title: `Particle #${particleIndex}`,
                            onClone: () => {
                                onCloneParticleEffectGroupParticle(
                                    state,
                                    name,
                                    effectName,
                                    groupIndex,
                                    particleIndex,
                                )
                            },
                            onDelete: () => {
                                onDeleteParticleEffectGroupParticle(
                                    state,
                                    name,
                                    effectName,
                                    groupIndex,
                                    particleIndex,
                                )
                            },
                        })
                    }
                }
            }
        }
    }
}

function onNewParticleSprite({ project }: UseStateReturn, name: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const spriteId = newId()

    const newParticle = clone(particle)
    newParticle.data.sprites.push(newParticleSprite(spriteId))

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: ['particles', name, 'sprites', spriteId],
        particles,
    })
}

async function onCopyParticleSprites({ project }: UseStateReturn, name: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const selectedNames = (await show(ModalSelectSprites, {
        icon: markRaw(IconClone),
        title: `Copy Sprites from "${name}"`,
        sprites: particle.data.sprites.map((_, i) => `Sprite #${i + 1}`),
    })) as string[] | undefined

    if (!selectedNames || selectedNames.length === 0) return

    const selectedIndexes = selectedNames.map((s) => parseInt(s.slice(8)) - 1)
    const spritesToCopy = particle.data.sprites.filter((_, i) => selectedIndexes.includes(i))

    const { copy } = useClipboard()
    await copy('particle-sprites', { sprites: spritesToCopy })
}

async function onPasteParticleSprites({ project }: UseStateReturn, name: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const { read } = useClipboard()
    const data = (await read('particle-sprites')) as {
        sprites: Particle['data']['sprites']
    } | null

    if (!data || !Array.isArray(data.sprites)) {
        await show(ModalErrorCancel, {
            message: 'Clipboard does not contain particle sprites',
        })
        return
    }

    const newParticle = clone(particle)
    let addedCount = 0

    const existingHashes = new Set<string>()
    for (const s of newParticle.data.sprites) {
        existingHashes.add(await getHash(s.texture))
    }

    for (const sprite of data.sprites) {
        const hash = await getHash(sprite.texture)
        if (hash && existingHashes.has(hash)) {
            continue
        }

        const newSprite = clone(sprite)
        newSprite.id = newId()
        newParticle.data.sprites.push(newSprite)

        if (hash) existingHashes.add(hash)
        addedCount++
    }

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        particles,
    })

    if (addedCount > 0) {
        await show(ModalErrorCancel, {
            title: 'Success',
            icon: markRaw(IconCheck),
            message: `Pasted ${addedCount} sprites`,
            text: 'OK',
        })
    } else {
        await show(ModalErrorCancel, {
            title: 'Info',
            icon: markRaw(IconCheck),
            message: 'No new sprites pasted (duplicates skipped)',
            text: 'OK',
        })
    }
}

async function onNewParticleEffect({ project, isExplorerOpened }: UseStateReturn, name: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effectName = await show(ModalName, {
        icon: markRaw(IconPlus),
        title: 'New Particle Effect',
        names: ParticleEffectName,
        defaultValue: ParticleEffectName.LaneLinear,
        validator: (value: string) =>
            !!value && !particle.data.effects.some(({ name }) => name === value),
    })
    if (!effectName) return

    const newParticle = clone(particle)
    newParticle.data.effects.push(newParticleEffect(effectName))

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: ['particles', name, 'effects', effectName],
        particles,
    })

    isExplorerOpened.value = false
}

async function onCopyParticleEffects({ project }: UseStateReturn, name: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const selectedNames = (await show(ModalSelectSprites, {
        icon: markRaw(IconClone),
        title: `Copy Effects from "${name}"`,
        sprites: particle.data.effects.map((e) => e.name),
    })) as string[] | undefined

    if (!selectedNames || selectedNames.length === 0) return

    const effectsToCopy = particle.data.effects.filter((e) => selectedNames.includes(e.name))

    const { copy } = useClipboard()
    await copy('particle-effects', { effects: effectsToCopy }, particle)
}

async function onPasteParticleEffects({ project }: UseStateReturn, name: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const { read } = useClipboard()
    const data = (await read('particle-effects', particle)) as {
        effects: Particle['data']['effects']
    } | null

    if (!data || !Array.isArray(data.effects)) {
        await show(ModalErrorCancel, {
            message: 'Clipboard does not contain particle effects',
        })
        return
    }

    const newParticle = clone(particle)
    let addedCount = 0

    for (const effect of data.effects) {
        let effectName = effect.name
        if (newParticle.data.effects.some((e) => e.name === effectName)) {
            effectName = `Copy of ${effectName}`
            let i = 1
            while (newParticle.data.effects.some((e) => e.name === effectName)) {
                effectName = `Copy (${i}) of ${effect.name}`
                i++
            }
        }

        const newEffect = clone(effect)
        newEffect.name = effectName
        newParticle.data.effects.push(newEffect)
        addedCount++
    }

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        particles,
    })

    await show(ModalErrorCancel, {
        title: 'Success',
        icon: markRaw(IconCheck),
        message: `Pasted ${addedCount} effects`,
        text: 'OK',
    })
}

function onNewParticleEffectGroup({ project }: UseStateReturn, name: string, effectName: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const newEffect = clone(effect)
    newEffect.groups.push(newParticleEffectGroup())

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((effect) =>
        effect.name === effectName ? newEffect : effect,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: ['particles', name, 'effects', effectName, 'groups', `${effect.groups.length}`],
        particles,
    })
}

async function onCopyParticleEffectGroups(
    { project }: UseStateReturn,
    name: string,
    effectName: string,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const groupNames = effect.groups.map(
        (g, i) => `${g.name || 'Group'} #${i}` + (g.name ? ` (${i})` : ''),
    )
    const selectedKeys = (await show(ModalSelectSprites, {
        icon: markRaw(IconClone),
        title: `Copy Groups from "${formatParticleEffectName(effectName)}"`,
        sprites: groupNames,
    })) as string[] | undefined

    if (!selectedKeys || selectedKeys.length === 0) return

    const indexesToCopy = new Set<number>()
    groupNames.forEach((key, index) => {
        if (selectedKeys.includes(key)) indexesToCopy.add(index)
    })

    const groupsToCopy = effect.groups.filter((_, i) => indexesToCopy.has(i))

    const { copy } = useClipboard()
    await copy('particle-effect-groups', { groups: groupsToCopy }, particle)
}

async function onPasteParticleEffectGroups(
    { project }: UseStateReturn,
    name: string,
    effectName: string,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const { read } = useClipboard()
    const data = (await read('particle-effect-groups', particle)) as {
        groups: Particle['data']['effects'][number]['groups']
    } | null

    if (!data || !Array.isArray(data.groups)) {
        await show(ModalErrorCancel, {
            message: 'Clipboard does not contain particle effect groups',
        })
        return
    }

    const newEffect = clone(effect)
    let addedCount = 0

    for (const group of data.groups) {
        newEffect.groups.push(clone(group))
        addedCount++
    }

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((e) =>
        e.name === effectName ? newEffect : e,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        particles,
    })

    await show(ModalErrorCancel, {
        title: 'Success',
        icon: markRaw(IconCheck),
        message: `Pasted ${addedCount} groups`,
        text: 'OK',
    })
}

function onNewParticleEffectGroupParticle(
    { project }: UseStateReturn,
    name: string,
    effectName: string,
    groupIndex: number,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const group = effect.groups[groupIndex]
    if (!group) throw new Error('Particle Effect Group not found')

    const newGroup = clone(group)
    newGroup.particles.push(newParticleEffectGroupParticle())

    const newEffect = clone(effect)
    newEffect.groups[groupIndex] = newGroup

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((effect) =>
        effect.name === effectName ? newEffect : effect,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: [
            'particles',
            name,
            'effects',
            effectName,
            'groups',
            `${groupIndex}`,
            'particles',
            `${group.particles.length}`,
        ],
        particles,
    })
}

function onDeleteParticleSprites({ project }: UseStateReturn, name: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')
    if (!particle.data.sprites.length) return

    const newParticle = clone(particle)
    newParticle.data.sprites = []
    for (const effect of newParticle.data.effects) {
        for (const group of effect.groups) {
            for (const particle of group.particles) {
                particle.spriteId = ''
            }
        }
    }

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: [],
        particles,
    })
}

function onDeleteParticleSprite({ project }: UseStateReturn, name: string, spriteId: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const newParticle = clone(particle)
    newParticle.data.sprites = newParticle.data.sprites.filter(({ id }) => id !== spriteId)
    for (const effect of newParticle.data.effects) {
        for (const group of effect.groups) {
            for (const particle of group.particles) {
                if (particle.spriteId === spriteId) {
                    particle.spriteId = ''
                }
            }
        }
    }

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: [],
        particles,
    })
}

function onDeleteParticleEffects({ project }: UseStateReturn, name: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')
    if (!particle.data.effects.length) return

    const newParticle = clone(particle)
    newParticle.data.effects = []

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: [],
        particles,
    })
}

function onDeleteParticleEffect({ project }: UseStateReturn, name: string, effectName: string) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.filter(({ name }) => name !== effectName)

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: [],
        particles,
    })
}

function onDeleteParticleEffectGroup(
    { project }: UseStateReturn,
    name: string,
    effectName: string,
    groupIndex: number,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const newEffect = clone(effect)
    newEffect.groups.splice(groupIndex, 1)

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((effect) =>
        effect.name === effectName ? newEffect : effect,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: [],
        particles,
    })
}

function onDeleteParticleEffectGroupParticle(
    { project }: UseStateReturn,
    name: string,
    effectName: string,
    groupIndex: number,
    particleIndex: number,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const group = effect.groups[groupIndex]
    if (!group) throw new Error('Particle Effect Group not found')

    const newGroup = clone(group)
    newGroup.particles.splice(particleIndex, 1)

    const newEffect = clone(effect)
    newEffect.groups[groupIndex] = newGroup

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((effect) =>
        effect.name === effectName ? newEffect : effect,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: [],
        particles,
    })
}

async function onRenameParticleEffect(
    { project, view }: UseStateReturn,
    name: string,
    effectName: string,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const newName = await show(ModalName, {
        icon: markRaw(IconEdit),
        title: 'Rename Particle Effect',
        names: ParticleEffectName,
        defaultValue: effectName,
        validator: (value: string) =>
            !!value && !particle.data.effects.some(({ name }) => name === value),
    })
    if (!newName) return

    const newEffect = clone(effect)
    newEffect.name = newName

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((effect) =>
        effect.name === effectName ? newEffect : effect,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view:
            view.value[0] === 'particles' &&
            view.value[1] === name &&
            view.value[2] === 'effects' &&
            view.value[3] === effectName
                ? ['particles', name, 'effects', newName, ...view.value.slice(4)]
                : view.value,
        particles,
    })
}

async function onRenameParticleEffectGroup(
    { project, view }: UseStateReturn,
    name: string,
    effectName: string,
    groupIndex: number,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const group = effect.groups[groupIndex]
    if (!group) throw new Error('Particle Effect Group not found')

    const newName = await show(ModalTextInput, {
        icon: markRaw(IconEdit),
        title: 'Rename Particle Effect Group',
        defaultValue: group.name,
        placeholder: 'Enter group name...',
    })
    if (newName === undefined) return

    const newGroup = clone(group)
    newGroup.name = newName

    const newEffect = clone(effect)
    newEffect.groups[groupIndex] = newGroup

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((effect) =>
        effect.name === effectName ? newEffect : effect,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view: view.value,
        particles,
    })
}

async function onCloneParticleEffect(
    { project, view }: UseStateReturn,
    name: string,
    effectName: string,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const newName = await show(ModalName, {
        icon: markRaw(IconClone),
        title: 'Clone Particle Effect',
        names: ParticleEffectName,
        defaultValue: effectName,
        validator: (value: string) =>
            !!value && !particle.data.effects.some(({ name }) => name === value),
    })
    if (!newName) return

    const newEffect = clone(effect)
    newEffect.name = newName

    const newParticle = clone(particle)
    newParticle.data.effects.push(newEffect)

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view:
            view.value[0] === 'particles' &&
            view.value[1] === name &&
            view.value[2] === 'effects' &&
            view.value[3] === effectName
                ? ['particles', name, 'effects', newName, ...view.value.slice(4)]
                : view.value,
        particles,
    })
}

function onCloneParticleEffectGroup(
    { project, view }: UseStateReturn,
    name: string,
    effectName: string,
    groupIndex: number,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const group = effect.groups[groupIndex]
    if (!group) throw new Error('Particle Effect Group not found')

    const newGroup = clone(group)

    const newEffect = clone(effect)
    newEffect.groups.push(newGroup)

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((effect) =>
        effect.name === effectName ? newEffect : effect,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view:
            view.value[0] === 'particles' &&
            view.value[1] === name &&
            view.value[2] === 'effects' &&
            view.value[3] === effectName &&
            view.value[4] === 'groups' &&
            view.value[5] === `${groupIndex}`
                ? [
                      'particles',
                      name,
                      'effects',
                      effectName,
                      'groups',
                      `${effect.groups.length}`,
                      ...view.value.slice(5),
                  ]
                : view.value,
        particles,
    })
}

function onCloneParticleEffectGroupParticle(
    { project, view }: UseStateReturn,
    name: string,
    effectName: string,
    groupIndex: number,
    particleIndex: number,
) {
    const particle = project.value.particles.get(name)
    if (!particle) throw new Error('Particle not found')

    const effect = particle.data.effects.find(({ name }) => name === effectName)
    if (!effect) throw new Error('Particle Effect not found')

    const group = effect.groups[groupIndex]
    if (!group) throw new Error('Particle Effect Group not found')

    const groupParticle = group.particles[particleIndex]
    if (!groupParticle) throw new Error('Particle Effect Group Particle not found')

    const newGroupParticle = clone(groupParticle)

    const newGroup = clone(group)
    newGroup.particles.push(newGroupParticle)

    const newEffect = clone(effect)
    newEffect.groups[groupIndex] = newGroup

    const newParticle = clone(particle)
    newParticle.data.effects = newParticle.data.effects.map((effect) =>
        effect.name === effectName ? newEffect : effect,
    )

    const particles = new Map(project.value.particles)
    particles.set(name, newParticle)

    push({
        ...project.value,
        view:
            view.value[0] === 'particles' &&
            view.value[1] === name &&
            view.value[2] === 'effects' &&
            view.value[3] === effectName &&
            view.value[4] === 'groups' &&
            view.value[5] === `${groupIndex}` &&
            view.value[6] === 'particles' &&
            view.value[7] === `${particleIndex}`
                ? [
                      'particles',
                      name,
                      'effects',
                      effectName,
                      'groups',
                      `${groupIndex}`,
                      'particles',
                      `${group.particles.length}`,
                      ...view.value.slice(6),
                  ]
                : view.value,
        particles,
    })
}
