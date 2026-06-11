declare module '*.vue' {
    const component: never

    export default component
}

interface FilePickerAcceptType {
    description?: string
    accept: Record<string, string[]>
}

interface Window {
    showSaveFilePicker?: (options?: {
        suggestedName?: string
        types?: FilePickerAcceptType[]
    }) => Promise<FileSystemFileHandle>
    showOpenFilePicker?: (options?: {
        types?: FilePickerAcceptType[]
    }) => Promise<FileSystemFileHandle[]>
}

interface DataTransferItem {
    getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>
}
