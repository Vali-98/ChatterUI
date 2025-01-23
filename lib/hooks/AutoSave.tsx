import { useRef, useEffect, useState, JSX } from 'react'

export interface CommonProps<TData, TReturn> {
    /** The controlled form value to be auto saved   */
    data: TData
    /** Callback function to save your data */
    onSave: (data: TData) => Promise<TReturn> | TReturn | void
    /** The number of milliseconds between save attempts. Defaults to 2000 */
    interval?: number
    /** Set to false if you do not want the save function to fire on unmount */
    saveOnUnmount?: boolean
}

export interface AutosaveProps<TData, TReturn> extends CommonProps<TData, TReturn> {
    /** JSX.Element to return */
    element?: JSX.Element | null
}

function useAutosave<TData, TReturn>({
    data,
    onSave,
    interval = 2000,
    saveOnUnmount = true,
}: CommonProps<TData, TReturn>) {
    const valueOnCleanup = useRef(data)
    const initialRender = useRef(true)
    const handleSave = useRef(onSave)

    const debouncedValueToSave = useDebounce(data, interval)

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false
        } else {
            handleSave.current(debouncedValueToSave)
        }
    }, [debouncedValueToSave])

    useEffect(() => {
        valueOnCleanup.current = data
    }, [data])

    useEffect(() => {
        handleSave.current = onSave
    }, [onSave])

    useEffect(
        () => () => {
            if (saveOnUnmount) {
                handleSave.current(valueOnCleanup.current)
            }
        },
        [saveOnUnmount]
    )
}

export default useAutosave

function useDebounce<TData>(data: TData, interval: number) {
    const [liveData, setLiveData] = useState<TData>(data)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handler = setTimeout(() => {
                setLiveData(data)
            }, interval)
            return () => {
                clearTimeout(handler)
            }
        }
    }, [data, interval])

    return liveData
}
