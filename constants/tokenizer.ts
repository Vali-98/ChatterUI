//@ts-ignore
import { polyfill as polyfillBase64 } from 'react-native-polyfill-globals/src/base64'
//@ts-ignore
import { polyfill as polyfillTextEncoding } from 'react-native-polyfill-globals/src/encoding'
import { LlamaVocab } from './llamavocab'
polyfillBase64()
polyfillTextEncoding()

/**
 * TypeScript Implementation of:
 * https://github.com/belladoreai/llama-tokenizer-js
 */

const base64decode = (encodedString: string) => {
    return atob(encodedString)
}

const utf8ByteToHex = (c: number) => {
    const hexValue = c.toString().toUpperCase().padStart(2, '0')
    return `<0x${hexValue}>`
}

const hexToUtf8Byte = (hex: string) => {
    const strippedHex = hex.replace(/<0x|>/g, '')
    return parseInt(strippedHex, 16)
}

export namespace LlamaTokenizer {
    const vocabById: Array<string> = decodeVocabulary(LlamaVocab.vocab_base64)

    const vocabByString = new Map()
    vocabById.forEach((tokenString, tokenId) => {
        vocabByString.set(tokenString, tokenId)
    })
    const merges = decompressMerges(LlamaVocab.merges_binary)
    const utf8Encoder = new TextEncoder()
    const utf8Decoder = new TextDecoder('utf-8')

    function getMergeIdentifierString(firstTokenId: number, secondTokenId: number) {
        return vocabById[firstTokenId] + ' ' + vocabById[secondTokenId]
    }

    function decodeVocabulary(vocab_base64: any) {
        const byteArray = Uint8Array.from(base64decode(vocab_base64), (c) => c.charCodeAt(0))
        const decoder = new TextDecoder('utf-8')
        return decoder.decode(byteArray).split('\n')
    }

    function decompressMerges(merges_binary: any) {
        // Base64 decode binary.
        const byteArrayString = base64decode(merges_binary)

        // Convert byteArrayString to byteArray.
        const byteArray = new Uint8Array(byteArrayString.length)
        for (let i = 0; i < byteArrayString.length; i++) {
            byteArray[i] = byteArrayString.charCodeAt(i)
        }

        // Each byte-pair represents a tokenId.
        // Convert byte-pairs to tokenIds (integers between 0 and 32000).
        const tokenIds = []
        for (let i = 0; i < byteArray.length; i += 2) {
            const byte1 = byteArray[i]
            const byte2 = byteArray[i + 1]
            const tokenId = byte1 + (byte2 << 8)
            tokenIds.push(tokenId)
        }

        // Each pair of tokenIds represents a merge.
        const merges = new Map()
        for (let i = 0; i < tokenIds.length; i += 2) {
            const id1 = tokenIds[i]
            const id2 = tokenIds[i + 1]
            const mergeIdentifierString = getMergeIdentifierString(id1, id2)
            // Key identifies token pair, value represents merge priority
            merges.set(mergeIdentifierString, i + 1)
        }
        return merges
    }

    function mapCharactersToTokenIds(
        prompt: string,
        add_bos_token: boolean,
        add_preceding_space: boolean
    ) {
        const tokenIds = []
        // Special "beginning of string" token.
        if (add_bos_token) {
            tokenIds.push(1)
        }
        // Special "preceding space" added to beginning of prompt.
        if (add_preceding_space) {
            prompt = ' ' + prompt
        }
        // Special: spaces are represented as thick underscore ▁ (id 29871)
        const promptAltered = prompt.replaceAll(' ', vocabById[29871])
        // We need to use Array.from to iterate over characters in order to support UTF-8 multipoint characters
        const charArray = Array.from(promptAltered)
        // Transform each character to its corresponding token
        for (let i = 0; i < charArray.length; i++) {
            const c = charArray[i]
            if (vocabByString.has(c)) {
                // Typical case
                tokenIds.push(vocabByString.get(c))
            } else {
                // Special case where token not found and we have to fallback to byte-level tokens.
                const bytes = utf8Encoder.encode(c)
                for (let j = 0; j < bytes.length; j++) {
                    const hex = vocabByString.get(utf8ByteToHex(bytes[j]))
                    tokenIds.push(hex)
                    if (!(hex >= 0)) {
                        // This is not supposed to happen because the LLaMA vocabulary has a token corresponding to each byte,
                        // but if this happens regardless, let's follow the protocol and tokenize to <UNK> token instead of crashing.
                        console.log(
                            'Encountered unknown character ' +
                                c +
                                ' (partial UTF-8 byte ' +
                                bytes[j] +
                                ' + hex + ' +
                                utf8ByteToHex(bytes[j]) +
                                ')'
                        )
                        tokenIds[tokenIds.length - 1] = 0
                    }
                }
            }
        }
        return tokenIds
    }

    export function encode(
        prompt: string,
        add_bos_token = true,
        add_preceding_space = true,
        log_performance = false
    ): number[] {
        let startTime = null
        if (log_performance) {
            startTime = performance.now()
        }

        if (!vocabById || !vocabByString || !decompressMerges) {
            console.log('Tokenizer not initialized properly!')
            return []
        }
        if (prompt.length === 0) {
            return []
        }
        // Initially each character is transformed to a tokenId, later there will be merges of these.
        const tokenIds = mapCharactersToTokenIds(prompt, add_bos_token, add_preceding_space)

        type Node = {
            tokenId: number
            mergePrio?: number
            mergeToString?: string
            next: Node | null
            prev: Node | null
            origPos: number
            deleted: boolean
        }

        // Set up priority queue to efficiently iterate merge possibilities in priority order
        const mergeQueue = new PriorityQueue<Node>((a, b) => {
            return (a?.mergePrio ?? 0) < (b.mergePrio ?? 0)
        })
        const addToMergeQueue = function (leftNode: Node) {
            const mergeIdentifierString = getMergeIdentifierString(
                leftNode.tokenId,
                leftNode?.next?.tokenId || 0
            )
            // Merge priority is primarily determined by the location of the merge in the "merges" data,
            // secondarily determined by the relative position of the node in the linked list
            // (We want to perform equal merges from left to right)
            // We use a bit hacky 10000 multiplier and 10000 divider in order to pack both primary and
            // secondary priority into the same number, while avoiding numerical instability issues
            // (if we instead just had a 1000000000 multiplier and no divider, we would get instability issues)
            const mergePrio = merges.get(mergeIdentifierString) * 100000 + leftNode.origPos / 100000
            if (mergePrio) {
                // If mergePrio not found in merges, that means this merge is not possible according to vocabulary.
                leftNode.mergePrio = mergePrio
                leftNode.mergeToString = mergeIdentifierString.replace(' ', '')
                mergeQueue.push(leftNode)
            }
        }

        // Fill merge queue from initial merge possibilities and construct linked list
        let firstTokenNode: Node = {
            origPos: 0,
            tokenId: tokenIds[0],
            prev: null,
            next: null,
            deleted: false,
        }
        let prevTokenNode = firstTokenNode
        for (let i = 1; i < tokenIds.length; i++) {
            const currTokenNode: Node = {
                origPos: i,
                tokenId: tokenIds[i],
                prev: prevTokenNode,
                next: null,
                deleted: false,
            }
            prevTokenNode.next = currTokenNode
            addToMergeQueue(prevTokenNode)
            prevTokenNode = currTokenNode
        }

        // Perform merges in priority order
        while (!mergeQueue.isEmpty()) {
            const leftOfMerge = mergeQueue.pop()
            // Check that this merge is still possible
            if (leftOfMerge.deleted) continue
            if (!leftOfMerge.next) continue
            if (leftOfMerge.next.deleted) continue

            // Mark leftOfMerge and rightOfMerge as being deleted, because they are actually being replaced by a merged token.
            leftOfMerge.deleted = true
            leftOfMerge.next.deleted = true
            // It's a little bit more complicated to fix the prev of leftOfMerge.
            if (leftOfMerge.prev) {
                const oldPrev = leftOfMerge.prev
                // Mark oldPrev as deleted, to avoid erroneous merges later (ref to this node might exist in priorityqueue)
                oldPrev.deleted = true
                // Replace oldPrev within the linked list with a copy of itself
                const newPrev: Node = {
                    origPos: oldPrev.origPos,
                    tokenId: oldPrev.tokenId,
                    prev: oldPrev.prev,
                    next: oldPrev.next,
                    deleted: false,
                }
                leftOfMerge.prev = newPrev
                // Update linked list reference of "prev of prev"
                if (newPrev.prev) {
                    newPrev.prev.next = newPrev
                } else {
                    // If "prev of prev" does not exist, that means newPrev must be the new firstNode
                    firstTokenNode = newPrev
                }
            }
            // Create node representing merge result
            const resultOfMerge = {
                origPos: leftOfMerge.origPos,
                tokenId: vocabByString.get(leftOfMerge.mergeToString),
                prev: leftOfMerge.prev,
                next: leftOfMerge.next.next,
                deleted: false,
            }
            // Consider adding to merge queue: prev--resultOfMerge
            if (resultOfMerge.prev) {
                resultOfMerge.prev.next = resultOfMerge
                resultOfMerge.prev
                addToMergeQueue(resultOfMerge.prev)
            } else {
                // If prev does not exist then this is the new firstNode
                firstTokenNode = resultOfMerge
            }
            // Consider adding to merge queue: resultOfMerge--next
            if (resultOfMerge.next) {
                resultOfMerge.next.prev = resultOfMerge
                addToMergeQueue(resultOfMerge)
            }
        }

        // Get final tokenIds by traversing the linked list
        const mergedTokenIds = []
        for (
            let currTokenNode: Node | null = firstTokenNode;
            currTokenNode !== null;
            currTokenNode = currTokenNode.next
        ) {
            mergedTokenIds.push(currTokenNode.tokenId)
        }

        if (log_performance && startTime) {
            const endTime = performance.now()
            console.log('Tokenizer running time: ' + (endTime - startTime) + ' milliseconds')
        }

        return mergedTokenIds
    }

    export function decode(tokenIds: number[], add_bos_token = true, add_preceding_space = true) {
        const utf8byteVals = []
        const startIndex = add_bos_token ? 1 : 0
        for (let i = startIndex; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i]
            const tokenString = vocabById[tokenId]
            if (tokenString.startsWith('<0x') && tokenString.endsWith('>')) {
                // Special case
                const utf8byte = hexToUtf8Byte(tokenString)
                utf8byteVals.push(utf8byte)
            } else {
                // Typical case
                const utf8bytes = utf8Encoder.encode(tokenString)
                utf8bytes.forEach((utf8Byte) => utf8byteVals.push(utf8Byte))
            }
        }
        const uint8Array = new Uint8Array(utf8byteVals)
        const decodedString = utf8Decoder.decode(uint8Array)
        const spacesFixed = decodedString.replaceAll(vocabById[29871], ' ')
        // Note that preceding space must be removed here at string level, not earlier at token level, because multiple consecutive spaces are represented as single token.
        return add_preceding_space ? spacesFixed.slice(1) : spacesFixed
    }
}

class PriorityQueue<T> {
    // PriorityQueue implementation is copied from https://stackoverflow.com/a/42919752 with minor refactoring
    _heap: T[]
    _comparator: (a: T, b: T) => boolean
    constructor(comparator = (a: T, b: T) => a > b) {
        this._heap = []
        this._comparator = comparator
    }
    size() {
        return this._heap.length
    }
    isEmpty() {
        return this.size() === 0
    }
    peek() {
        return this._heap[0]
    }
    push(...values: T[]) {
        values.forEach((value) => {
            this._heap.push(value)
            this._siftUp()
        })
        return this.size()
    }
    pop() {
        const poppedValue = this.peek()
        const bottom = this.size() - 1
        if (bottom > 0) {
            this._swap(0, bottom)
        }
        this._heap.pop()
        this._siftDown()
        return poppedValue
    }
    replace(value: T) {
        const replacedValue = this.peek()
        this._heap[0] = value
        this._siftDown()
        return replacedValue
    }
    _parent(i: number) {
        return ((i + 1) >>> 1) - 1
    }
    _left(i: number) {
        return (i << 1) + 1
    }
    _right(i: number) {
        return (i + 1) << 1
    }
    _greater(i: number, j: number) {
        return this._comparator(this._heap[i], this._heap[j])
    }
    _swap(i: number, j: number) {
        ;[this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]]
    }
    _siftUp() {
        let node = this.size() - 1
        while (node > 0 && this._greater(node, this._parent(node))) {
            this._swap(node, this._parent(node))
            node = this._parent(node)
        }
    }
    _siftDown() {
        let node = 0
        while (
            (this._left(node) < this.size() && this._greater(this._left(node), node)) ||
            (this._right(node) < this.size() && this._greater(this._right(node), node))
        ) {
            const maxChild =
                this._right(node) < this.size() &&
                this._greater(this._right(node), this._left(node))
                    ? this._right(node)
                    : this._left(node)
            this._swap(node, maxChild)
            node = maxChild
        }
    }
}
