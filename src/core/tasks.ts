export interface Task {
    description: string
    execute: () => void | Promise<void>
    // Only opt in when this task is independent of adjacent parallel tasks.
    parallel?: boolean
}

export interface TaskProgress {
    completed: number
    total: number
    description: string
}

export async function runTasks(
    tasks: Task[],
    onProgress: (progress: TaskProgress) => void,
    isAborted: () => boolean,
) {
    let index = 0
    let lastUpdate = performance.now()
    const report = () =>
        onProgress({
            completed: index,
            total: tasks.length,
            description: tasks[index]?.description ?? 'Completed.',
        })
    const yieldToMainThread = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

    report()
    await yieldToMainThread()

    while (index < tasks.length && !isAborted()) {
        const task = tasks[index]!
        if (task.parallel) {
            const batch: Task[] = []
            while (batch.length < 4 && tasks[index]?.parallel) {
                batch.push(tasks[index++]!)
            }
            // Drain every in-flight task before reporting a failure or cancellation.
            const results = await Promise.allSettled(
                batch.map(async (task) => await task.execute()),
            )
            const failure = results.find((result) => result.status === 'rejected')
            if (failure?.status === 'rejected') throw failure.reason
        } else {
            await task.execute()
            index++
        }

        if (performance.now() - lastUpdate >= 16) {
            report()
            await yieldToMainThread()
            lastUpdate = performance.now()
        }
    }

    report()
}
