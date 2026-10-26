// Retain suffixes that could be the start of a stop string in the next output delta.
export const createStopFilter = (stops: string[]) => {
    const values = stops.filter(Boolean)
    const pattern = values.length
        ? new RegExp(
              values
                  .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                  .sort((a, b) => b.length - a.length)
                  .join('|'),
              'g'
          )
        : undefined
    let pending = ''
    return {
        push: (text: string) => {
            pending += text
            if (pattern) pending = pending.replace(pattern, '')
            let retained = 0
            for (const stop of values) {
                for (
                    let length = Math.min(stop.length - 1, pending.length);
                    length > retained;
                    length--
                ) {
                    if (pending.endsWith(stop.slice(0, length))) {
                        retained = length
                        break
                    }
                }
            }
            const output = pending.slice(0, pending.length - retained)
            pending = pending.slice(pending.length - retained)
            return output
        },
        flush: () => {
            const output = pending
            pending = ''
            return output
        },
    }
}
