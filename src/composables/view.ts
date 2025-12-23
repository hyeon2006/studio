import { computed, type Ref, shallowRef, toRaw, triggerRef, watch } from 'vue'
import { type ProjectItemTypeOf } from '../core/project'
import { clone } from '../core/utils'
import { push, useState } from './state'

export function useView<T extends object, U = T>(
    props: { data: T },
    type: ProjectItemTypeOf<T>,
    getter?: (v: Ref<T>, view: Ref<string[]>) => U,
): Ref<U> {
    const { project, view } = useState()

    const localData = shallowRef(props.data) as Ref<T>

    watch(
        () => props.data,
        (newValue) => {
            localData.value = newValue
        },
    )

    const v = computed(() => bind(toRaw(localData.value), ['data']))
    return getter ? computed(() => getter(v, view)) : (v as never)

    function bind<T extends object>(data: T, path: string[]): T {
        return new Proxy(data, {
            get(target, prop, receiver) {
                const keyPath = [...path, prop as never]

                const value = Reflect.get(target, prop, receiver)

                return typeof value === 'object' && value ? bind(value, keyPath) : value
            },
            set(target, prop, value, receiver) {
                const oldValue = Reflect.get(target, prop, receiver)
                if (oldValue === value) return true

                update([...path, prop as never], value)
                return true
            },
        })
    }

    function update(path: string[], value: unknown) {
        updateLocalData(localData.value, path.slice(1), value)

        triggerRef(localData)

        const newProps = { ...props, data: clone(localData.value) }

        path.reduce(
            (data, key, index) =>
                index === path.length - 1
                    ? (data[key as never] = value as never)
                    : data[key as never],
            newProps,
        )

        const items = new Map(project.value[type] as never)
        items.set(view.value[1], newProps.data)

        push(
            {
                ...project.value,
                view: view.value,
                [type]: items,
            },
            path.join('.'),
        )
    }

    function updateLocalData(target: unknown, path: string[], value: unknown) {
        path.reduce((acc, key, index) => {
            const obj = acc as Record<string, unknown>

            if (index === path.length - 1) {
                obj[key] = value
                return value
            }

            return obj[key]
        }, target)
    }
}
