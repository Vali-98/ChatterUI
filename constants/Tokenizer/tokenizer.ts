import { Tensor } from 'onnxruntime-react-native'

const PUNCTUATION_REGEX = '\\p{P}\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E'
const PROBLEMATIC_REGEX_MAP = new Map([
    // This uses the case insensitive group modifier, which is not supported in JavaScript.
    // When parsing the regex, an "Invalid group" error is thrown.
    ["(?i:'s|'t|'re|'ve|'m|'ll|'d)", "(?:'([sS]|[tT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))"],
])

function regexSplit(text: string, regex: RegExp) {
    const result = []
    let prev = 0
    for (const match of text.matchAll(regex)) {
        const fullMatch = match[0]
        if (prev < match.index) {
            result.push(text.slice(prev, match.index))
        }
        if (fullMatch.length > 0) {
            result.push(fullMatch)
        }
        prev = match.index + fullMatch.length
    }
    if (prev < text.length) {
        result.push(text.slice(prev))
    }
    return result
}

export const Callable = /** @type {any} */ class {
    /**
     * Creates a new instance of the Callable class.
     */
    constructor() {}

    /**
     * This method should be implemented in subclasses to provide the
     * functionality of the callable object.
     *
     * @param {any[]} args
     * @throws {Error} If the subclass does not implement the `_call` method.
     */
    _call(...args: any) {
        throw Error('Must implement _call method in subclass')
    }
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

function createPattern(pattern: any, invert = true) {
    if (pattern.Regex !== undefined) {
        // In certain cases, the pattern may contain unnecessary escape sequences (e.g., \# or \& or \~).
        // i.e., valid in Python (where the patterns are exported from) but invalid in JavaScript (where the patterns are parsed).
        // This isn't an issue when creating the regex w/o the 'u' flag, but it is when the 'u' flag is used.
        // For this reason, it is necessary to remove these backslashes before creating the regex.
        // See https://stackoverflow.com/a/63007777/13989043 for more information
        let regex = pattern.Regex.replace(/\\([#&~])/g, '$1') // TODO: add more characters to this list if necessary

        // We also handle special cases where the regex contains invalid (non-JS compatible) syntax.
        for (const [key, value] of PROBLEMATIC_REGEX_MAP) {
            regex = regex.replaceAll(key, value)
        }
        //TODO: might need u
        return new RegExp(regex, 'g')
    } else if (pattern.String !== undefined) {
        const escaped = escapeRegExp(pattern.String)
        // NOTE: if invert is true, we wrap the pattern in a group so that it is kept when performing .split()
        return new RegExp(invert ? escaped : `(${escaped})`, 'gu')
    } else {
        console.warn('Unknown pattern type:', pattern)
        return null
    }
}

export class PriorityQueue {
    _heap: any[]
    _comparator: (a: any, b: any) => boolean

    /**
     * Create a new PriorityQueue.
     * @param {Function} comparator Comparator function to determine priority. Defaults to a MaxHeap.
     */
    constructor(comparator = (a: any, b: any) => a > b) {
        this._heap = []
        this._comparator = comparator
    }

    /**
     * The size of the queue
     */
    get size() {
        return this._heap.length
    }

    /**
     * Check if the queue is empty.
     * @returns {boolean} `true` if the queue is empty, `false` otherwise.
     */
    isEmpty() {
        return this.size === 0
    }

    /**
     * Return the element with the highest priority in the queue.
     * @returns {any} The highest priority element in the queue.
     */
    peek() {
        return this._heap[0]
    }

    /**
     * Add one or more elements to the queue.
     * @param  {...any} values The values to push into the queue.
     * @returns {number} The new size of the queue.
     */
    push(...values: any) {
        return this.extend(values)
    }

    /**
     * Add multiple elements to the queue.
     * @param {any[]} values The values to push into the queue.
     * @returns {number} The new size of the queue.
     */
    extend(values: any) {
        for (const value of values) {
            this._heap.push(value)
            this._siftUp()
        }
        return this.size
    }

    /**
     * Remove and return the element with the highest priority in the queue.
     * @returns {any} The element with the highest priority in the queue.
     */
    pop() {
        const poppedValue = this.peek()
        const bottom = this.size - 1
        if (bottom > 0) {
            this._swap(0, bottom)
        }
        this._heap.pop()
        this._siftDown()
        return poppedValue
    }

    /**
     * Replace the element with the highest priority in the queue with a new value.
     * @param {*} value The new value.
     * @returns {*} The replaced value.
     */
    replace(value: any) {
        const replacedValue = this.peek()
        this._heap[0] = value
        this._siftDown()
        return replacedValue
    }

    /**
     * Compute the index for the parent of the node at index `i`.
     * @param {number} i The index of the node to get the parent of.
     * @returns {number} The index of the parent node.
     * @private
     */
    _parent(i: any) {
        return ((i + 1) >>> 1) - 1
    }

    /**
     * Compute the index for the left child of the node at index `i`.
     * @param {number} i The index of the node to get the left child of.
     * @returns {number} The index of the left child.
     * @private
     */
    _left(i: any) {
        return (i << 1) + 1
    }

    /**
     * Compute the index for the right child of the node at index `i`.
     * @param {number} i The index of the node to get the right child of.
     * @returns {number} The index of the right child.
     * @private
     */
    _right(i: any) {
        return (i + 1) << 1
    }

    /**
     * Check if the element at index `i` is greater than the element at index `j`.
     * @param {number} i The index of the first element to compare.
     * @param {number} j The index of the second element to compare.
     * @returns {boolean} `true` if the element at index `i` is greater than the element at index `j`, `false` otherwise.
     * @private
     */
    _greater(i: any, j: any) {
        return this._comparator(this._heap[i], this._heap[j])
    }

    /**
     * Swap the elements at indices `i` and `j`.
     * @param {number} i The index of the first element to swap.
     * @param {number} j The index of the second element to swap.
     * @private
     */
    _swap(i: any, j: any) {
        const temp = this._heap[i]
        this._heap[i] = this._heap[j]
        this._heap[j] = temp
    }

    /**
     * Maintain the heap property by updating positions in the heap,
     * starting at the last element and moving up the heap.
     * @private
     */
    _siftUp() {
        let node = this.size - 1
        while (node > 0 && this._greater(node, this._parent(node))) {
            this._swap(node, this._parent(node))
            node = this._parent(node)
        }
    }
    /**
     * Maintain the heap property by updating positions in the heap,
     * starting at the first element and moving down the heap.
     * @private
     */
    _siftDown() {
        let node = 0
        while (
            (this._left(node) < this.size && this._greater(this._left(node), node)) ||
            (this._right(node) < this.size && this._greater(this._right(node), node))
        ) {
            const maxChild =
                this._right(node) < this.size && this._greater(this._right(node), this._left(node))
                    ? this._right(node)
                    : this._left(node)
            this._swap(node, maxChild)
            node = maxChild
        }
    }
}

export function reverseDictionary(data: any) {
    // https://ultimatecourses.com/blog/reverse-object-keys-and-values-in-javascript
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]))
}

const BYTES_TO_UNICODE = (() => {
    // Returns list of utf-8 byte and a mapping to unicode strings.
    // We specifically avoids mapping to whitespace/control characters
    // the bpe code barfs on.

    const bs = [
        ...Array.from(
            { length: '~'.charCodeAt(0) - '!'.charCodeAt(0) + 1 },
            (_, i) => i + '!'.charCodeAt(0)
        ),
        ...Array.from(
            { length: '¬'.charCodeAt(0) - '¡'.charCodeAt(0) + 1 },
            (_, i) => i + '¡'.charCodeAt(0)
        ),
        ...Array.from(
            { length: 'ÿ'.charCodeAt(0) - '®'.charCodeAt(0) + 1 },
            (_, i) => i + '®'.charCodeAt(0)
        ),
    ]
    const cs = bs.slice()
    let n = 0
    for (let b = 0; b < 256; ++b) {
        if (!bs.includes(b)) {
            bs.push(b)
            cs.push(256 + n)
            n += 1
        }
    }
    const ccs = cs.map((n) => String.fromCharCode(n))
    return Object.fromEntries(bs.map((b, i) => [b, ccs[i]]))
})()

const UNICODE_TO_BYTES = reverseDictionary(BYTES_TO_UNICODE)

function truncateHelper(item: any, length: number) {
    // Setting .length to a lower value truncates the array in-place:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/length
    for (const key of Object.keys(item)) {
        item[key].length = length
    }
}

function max(arr: number[]) {
    if (arr.length === 0) throw Error('Array must not be empty')
    let max = arr[0]
    let indexOfMax = 0
    for (let i = 1; i < arr.length; ++i) {
        if (arr[i] > max) {
            max = arr[i]
            indexOfMax = i
        }
    }
    return [Number(max), indexOfMax]
}

function min(arr: number[]) {
    if (arr.length === 0) throw Error('Array must not be empty')
    let min = arr[0]
    let indexOfMin = 0
    for (let i = 1; i < arr.length; ++i) {
        if (arr[i] < min) {
            min = arr[i]
            indexOfMin = i
        }
    }
    return [min, indexOfMin]
}

export function mergeArrays(...arrs: any[]) {
    return Array.prototype.concat.apply([], arrs)
}

export function round(num: number, decimals: number) {
    const pow = Math.pow(10, decimals)
    return Math.round(num * pow) / pow
}

function padHelper(
    item: Record<string, any[]>,
    length: number,
    value_fn: (key: string) => any,
    side: 'right' | 'left'
) {
    for (const key of Object.keys(item)) {
        const diff = length - item[key].length
        const value = value_fn(key)

        const padData = new Array(diff).fill(value)
        item[key] =
            side === 'right' ? mergeArrays(item[key], padData) : mergeArrays(padData, item[key])
    }
}

function remove_accents(text: string) {
    return text.replace(/[\u0300-\u036f]/g, '')
}

/**
 * Helper function to lowercase a string and remove accents.
 * @param {string} text The text to lowercase and remove accents from.
 * @returns {string} The lowercased text with accents removed.
 */
function lowercase_and_remove_accent(text: string) {
    return remove_accents(text.toLowerCase())
}

class AddedToken {
    content: any
    id: any
    special: any
    single_word: any
    lstrip: any
    rstrip: any
    normalized: any
    /**
     * Creates a new instance of AddedToken.
     * @param {Object} config Added token configuration object.
     * @param {string} config.content The content of the added token.
     * @param {number} config.id The id of the added token.
     * @param {boolean} [config.single_word=false] Whether this token must be a single word or can break words.
     * @param {boolean} [config.lstrip=false] Whether this token should strip whitespaces on its left.
     * @param {boolean} [config.rstrip=false] Whether this token should strip whitespaces on its right.
     * @param {boolean} [config.normalized=false] Whether this token should be normalized.
     * @param {boolean} [config.special=false] Whether this token is special.
     */
    constructor(config: any) {
        this.content = config.content
        this.id = config.id
        this.single_word = config.single_word ?? false
        this.lstrip = config.lstrip ?? false
        this.rstrip = config.rstrip ?? false
        this.special = config.special ?? false
        this.normalized = config.normalized ?? null
    }
}

export class PreTrainedTokenizer extends Callable {
    return_token_type_ids = false
    _tokenizer_config: any
    _default_chat_template = `{% for message in messages %}{{'<|im_start|>' + message['role'] + '\n' + message['content'] + '<|im_end|>' + '\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\n' }}{% endif %}`
    normalizer: any
    pre_tokenizer: PreTokenizer | null
    model: TokenizerModel | null
    post_processor: PostProcessor | null
    //decoder: any
    special_tokens: any[]
    all_special_ids: any[]
    added_tokens: AddedToken[]
    additional_special_tokens: any
    added_tokens_regex: RegExp | null
    mask_token: any
    mask_token_id: any
    pad_token: any
    pad_token_id: any
    sep_token: any
    sep_token_id: any
    unk_token: any
    unk_token_id: any
    model_max_length: any
    remove_space: any
    clean_up_tokenization_spaces: any
    do_lowercase_and_remove_accent: any
    padding_side: 'left' | 'right'
    legacy: boolean
    chat_template: any
    _compiled_template_cache: Map<any, any>
    _warned_about_chat_template: any

    /**
     * Create a new PreTrainedTokenizer instance.
     * @param {Object} tokenizerJSON The JSON of the tokenizer.
     * @param {Object} tokenizerConfig The config of the tokenizer.
     */
    constructor(tokenizerJSON: any, tokenizerConfig: any) {
        super()

        this._tokenizer_config = tokenizerConfig

        // Construct parts of the tokenizer from the JSON
        this.normalizer = Normalizer.fromConfig(tokenizerJSON.normalizer)
        this.pre_tokenizer = PreTokenizer.fromConfig(tokenizerJSON.pre_tokenizer)
        this.model = TokenizerModel.fromConfig(tokenizerJSON.model, tokenizerConfig)
        if (!this.model) throw new Error('Model Invalid')
        this.post_processor = PostProcessor.fromConfig(tokenizerJSON.post_processor)
        //this.decoder = Decoder.fromConfig(tokenizerJSON.decoder)

        // Add added_tokens to model
        this.special_tokens = []
        this.all_special_ids = []

        /** @type {AddedToken[]} */
        this.added_tokens = []
        for (const addedToken of tokenizerJSON.added_tokens) {
            const token = new AddedToken(addedToken)
            this.added_tokens.push(token)

            this.model.tokens_to_ids.set(token.content, token.id)
            this.model.vocab[token.id] = token.content

            if (token.special) {
                this.special_tokens.push(token.content)
                this.all_special_ids.push(token.id)
            }
        }

        // Update additional_special_tokens
        this.additional_special_tokens = tokenizerConfig.additional_special_tokens ?? []
        this.special_tokens.push(...this.additional_special_tokens)
        this.special_tokens = [...new Set(this.special_tokens)] // Remove duplicates

        /*if (this.decoder) {
            // Slight hack, but it prevents code duplication:
            this.decoder.added_tokens = this.added_tokens

            // Another slight hack to add `end_of_word_suffix` (if present) to the decoder
            // This is needed for cases where BPE model and ByteLevel decoder are used
            // For more information, see https://github.com/xenova/transformers.js/issues/74
            // TODO: save this to the decoder when exporting?
            this.decoder.end_of_word_suffix = this.model.end_of_word_suffix
        }*/

        this.added_tokens_regex =
            this.added_tokens.length > 0
                ? new RegExp(
                      this.added_tokens
                          .map(
                              (x) =>
                                  `${x.lstrip ? '\\s*' : ''}(${escapeRegExp(x.content)})${x.rstrip ? '\\s*' : ''}`
                          )
                          .join('|')
                  )
                : null

        // Set mask token if present (otherwise will be undefined, which is fine)
        this.mask_token = this.getToken('mask_token')
        this.mask_token_id = this.model.tokens_to_ids.get(this.mask_token)

        this.pad_token = this.getToken('pad_token', 'eos_token')
        this.pad_token_id = this.model.tokens_to_ids.get(this.pad_token)

        this.sep_token = this.getToken('sep_token')
        this.sep_token_id = this.model.tokens_to_ids.get(this.sep_token)

        this.unk_token = this.getToken('unk_token')
        this.unk_token_id = this.model.tokens_to_ids.get(this.unk_token)

        this.model_max_length = tokenizerConfig.model_max_length

        /** @type {boolean} Whether or not to strip the text when tokenizing (removing excess spaces before and after the string). */
        this.remove_space = tokenizerConfig.remove_space

        this.clean_up_tokenization_spaces = tokenizerConfig.clean_up_tokenization_spaces ?? true
        this.do_lowercase_and_remove_accent =
            tokenizerConfig.do_lowercase_and_remove_accent ?? false

        // TODO allow user to change this
        /** @type {'right'|'left'} */
        this.padding_side = 'right'

        this.legacy = false

        this.chat_template = tokenizerConfig.chat_template ?? null
        if (Array.isArray(this.chat_template)) {
            // Chat templates are stored as lists of dicts with fixed key names,
            // we reconstruct that into a single dict while loading them.
            const chat_template = Object.create(null)
            for (const { name, template } of this.chat_template) {
                if (typeof name !== 'string' || typeof template !== 'string') {
                    throw new Error(
                        'Chat template must be a list of objects with "name" and "template" properties'
                    )
                }
                chat_template[name] = template
            }
            this.chat_template = chat_template
        }
        this._compiled_template_cache = new Map()
    }

    /**
     * Returns the value of the first matching key in the tokenizer config object.
     * @param {...string} keys One or more keys to search for in the tokenizer config object.
     * @returns {string|null} The value associated with the first matching key, or null if no match is found.
     * @throws {Error} If an object is found for a matching key and its __type property is not "AddedToken".
     */
    getToken(...keys: any) {
        for (const key of keys) {
            const item = this._tokenizer_config[key]

            if (!item) continue

            if (typeof item === 'object') {
                if (item.__type === 'AddedToken') {
                    return item.content
                } else {
                    throw Error(`Unknown token: ${item}`)
                }
            } else {
                return item
            }
        }
        return null
    }

    /**
     * Loads a pre-trained tokenizer from the given `pretrained_model_name_or_path`.
     *
     * @param {string} pretrained_model_name_or_path The path to the pre-trained tokenizer.
     * @param {PretrainedTokenizerOptions} options Additional options for loading the tokenizer.
     *
     * @throws {Error} Throws an error if the tokenizer.json or tokenizer_config.json files are not found in the `pretrained_model_name_or_path`.
     * @returns {Promise<PreTrainedTokenizer>} A new instance of the `PreTrainedTokenizer` class.
     */
    static async from_pretrained(
        pretrained_model_name_or_path: string,
        {
            progress_callback = null,
            config = null,
            cache_dir = null,
            local_files_only = false,
            revision = 'main',
            legacy = null,
        } = {}
    ) {
        const info = await loadTokenizer(pretrained_model_name_or_path, {
            progress_callback,
            config,
            cache_dir,
            local_files_only,
            revision,
            legacy,
        })

        // @ts-ignore
        return new this(...info)
    }

    /**
     * @typedef {number[]|number[][]|Tensor} BatchEncodingItem
     *
     * @typedef {Object} BatchEncoding Holds the output of the tokenizer's call function.
     * @property {BatchEncodingItem} input_ids List of token ids to be fed to a model.
     * @property {BatchEncodingItem} attention_mask List of indices specifying which tokens should be attended to by the model.
     * @property {BatchEncodingItem} [token_type_ids] List of token type ids to be fed to a model.
     */

    /**
     * Encode/tokenize the given text(s).
     * @param {string|string[]} text The text to tokenize.
     * @param {Object} options An optional object containing the following properties:
     * @param {string|string[]} [options.text_pair=null] Optional second sequence to be encoded. If set, must be the same type as text.
     * @param {boolean|'max_length'} [options.padding=false] Whether to pad the input sequences.
     * @param {boolean} [options.add_special_tokens=true] Whether or not to add the special tokens associated with the corresponding model.
     * @param {boolean} [options.truncation=null] Whether to truncate the input sequences.
     * @param {number} [options.max_length=null] Maximum length of the returned list and optionally padding length.
     * @param {boolean} [options.return_tensor=true] Whether to return the results as Tensors or arrays.
     * @returns {BatchEncoding} Object to be passed to the model.
     */
    _call(
        // Required positional arguments
        text: string,

        // Optional keyword arguments
        {
            text_pair = null,
            add_special_tokens = true,
            padding = false,
            truncation = null,
            max_length = null,
            return_tensor = true, // Different to HF
        }: {
            text_pair?: any
            add_special_tokens?: boolean
            padding?: any
            truncation?: any
            max_length?: any
            return_tensor?: boolean
        } = {}
    ) {
        const isBatched = Array.isArray(text)

        /** @type {EncodingSingle[]} */
        let encodedTokens: any

        if (isBatched) {
            if (text.length === 0) {
                throw Error('text array must be non-empty')
            }

            if (text_pair !== null) {
                if (!Array.isArray(text_pair)) {
                    throw Error('text_pair must also be an array')
                } else if (text.length !== text_pair.length) {
                    throw Error('text and text_pair must have the same length')
                }

                encodedTokens = text.map((t, i) =>
                    this._encode_plus(t, text_pair[i], { add_special_tokens })
                )
            } else {
                encodedTokens = text.map((x) => this._encode_plus(x, null, { add_special_tokens }))
            }
        } else {
            if (text === null || text === undefined) {
                throw Error('text may not be null or undefined')
            }

            if (Array.isArray(text_pair)) {
                throw Error(
                    'When specifying `text_pair`, since `text` is a string, `text_pair` must also be a string (i.e., not an array).'
                )
            }

            // For single input, we just wrap in an array, and then unwrap later.
            encodedTokens = [this._encode_plus(text, text_pair, { add_special_tokens })]
        }
        // At this point, tokens is batched: [batch_size, tokens]
        // However, array may be jagged. So, we pad to max_length

        if (max_length === null) {
            if (padding === 'max_length') {
                max_length = this.model_max_length
            } else {
                // Calculate max length from sequences
                max_length = max(encodedTokens.map((x: any) => x.input_ids.length))[0]
            }
        } else {
            if (!truncation) {
                console.warn(
                    `Truncation was not explicitly activated but \`max_length\` is provided a specific value, please use \`truncation=true\` to explicitly truncate examples to max length.`
                )
            }
        }

        // Ensure it is less than model max length
        max_length = Math.min(max_length, this.model_max_length)

        if (padding || truncation) {
            // Perform padding and/or truncation
            for (let i = 0; i < encodedTokens.length; ++i) {
                if (encodedTokens[i].input_ids.length === max_length) {
                    continue
                } else if (encodedTokens[i].input_ids.length > max_length) {
                    // possibly truncate
                    if (truncation) {
                        truncateHelper(encodedTokens[i], max_length)
                    }
                } else {
                    // t.length < max_length
                    // possibly pad
                    if (padding) {
                        padHelper(
                            encodedTokens[i],
                            max_length,
                            (key) => (key === 'input_ids' ? this.pad_token_id : 0),
                            this.padding_side
                        )
                    }
                }
            }
        }

        const result: any = {}

        if (return_tensor) {
            if (!(padding && truncation)) {
                // Not, guaranteed that all items have same length, so
                // we perform additional check

                if (
                    encodedTokens.some((x: any) => {
                        for (const key of Object.keys(x)) {
                            if (x[key].length !== encodedTokens[0][key]?.length) {
                                return true
                            }
                        }
                        return false
                    })
                ) {
                    throw Error(
                        'Unable to create tensor, you should probably activate truncation and/or padding ' +
                            "with 'padding=true' and 'truncation=true' to have batched tensors with the same length."
                    )
                }
            }

            // Now we actually convert to tensor
            // NOTE: In the same way as the python library, we return a batched tensor, regardless of
            // whether we have a single input or multiple inputs.
            const dims = [encodedTokens.length, encodedTokens[0].input_ids.length]

            for (const key of Object.keys(encodedTokens[0])) {
                result[key] = new Tensor(
                    'int64',
                    BigInt64Array.from(encodedTokens.flatMap((x: any) => x[key]).map(BigInt)),
                    dims
                )
            }
        } else {
            for (const key of Object.keys(encodedTokens[0])) {
                result[key] = encodedTokens.map((x: any) => x[key])
            }

            // If not returning a tensor, we match the input type
            if (!isBatched) {
                // Input was not batched, so we unwrap
                for (const key of Object.keys(result)) {
                    result[key] = result[key][0]
                }
            }
        }

        return /** @type {BatchEncoding} */ result
    }

    /**
     * Encodes a single text using the preprocessor pipeline of the tokenizer.
     *
     * @param {string|null} text The text to encode.
     * @returns {string[]|null} The encoded tokens.
     */
    _encode_text(text: string) {
        if (text === null) return null

        // Actual function which does encoding, for a single text
        // First, we take care of special tokens. Needed to avoid issues arising from
        // normalization and/or pretokenization (which may not preserve special tokens)
        const sections = this.added_tokens_regex
            ? text.split(this.added_tokens_regex).filter((x: any) => x)
            : [text]

        const tokens = sections
            .map((x: any, section_index: any) => {
                const addedToken = this.added_tokens.find((t) => t.content === x)
                if (addedToken !== undefined) {
                    // Ignore added tokens
                    return x
                } else {
                    if (this.remove_space === true) {
                        x = x.trim().split(/\s+/).join(' ')
                    }
                    if (this.do_lowercase_and_remove_accent) {
                        x = lowercase_and_remove_accent(x)
                    }

                    if (this.normalizer !== null) {
                        x = this.normalizer(x)
                    }

                    // If, after normalization, this section is empty (e.g., trimming whitespace),
                    // we return an empty array
                    if (x.length === 0) {
                        return []
                    }

                    const sectionTokens =
                        this.pre_tokenizer !== null
                            ? this.pre_tokenizer.pre_tokenize_text(x, {
                                  section_index,
                              })
                            : [x]
                    if (!this.model) throw new Error('Something bad happened')
                    const tokens = this.model.encode(sectionTokens)

                    return tokens
                }
            })
            .flat()

        return tokens
    }

    /**
     * Encodes a single text or a pair of texts using the model's tokenizer.
     *
     * @param {string} text The text to encode.
     * @param {string|null} text_pair The optional second text to encode.
     * @param {Object} options An optional object containing the following properties:
     * @param {boolean} [options.add_special_tokens=true] Whether or not to add the special tokens associated with the corresponding model.
     * @returns {EncodingSingle} An object containing the encoded text.
     * @private
     */
    _encode_plus(text: string, text_pair: any = null, { add_special_tokens = true } = {}) {
        if (!this.model) throw new Error('Model Invalid')
        // Function called by users to encode possibly multiple texts
        const tokens = this._encode_text(text)
        const tokens2 = this._encode_text(text_pair)

        const combinedTokens = this.post_processor
            ? this.post_processor.post_process(tokens, tokens2, { add_special_tokens })
            : { tokens: mergeArrays(tokens ?? [], tokens2 ?? []) }

        const input_ids = this.model.convert_tokens_to_ids(combinedTokens.tokens)

        const result: any = {
            input_ids,
            attention_mask: new Array(input_ids.length).fill(1),
        }
        if (this.return_token_type_ids && combinedTokens.token_type_ids) {
            result.token_type_ids = combinedTokens.token_type_ids
        }
        return result
    }

    /**
     * Encodes a single text or a pair of texts using the model's tokenizer.
     *
     * @param {string} text The text to encode.
     * @param {string|null} text_pair The optional second text to encode.
     * @param {Object} options An optional object containing the following properties:
     * @param {boolean} [options.add_special_tokens=true] Whether or not to add the special tokens associated with the corresponding model.
     * @returns {number[]} An array of token IDs representing the encoded text(s).
     */
    encode(text: string, text_pair = null, { add_special_tokens = true } = {}) {
        const { input_ids } = this._encode_plus(text, text_pair, {
            add_special_tokens,
        })
        return input_ids
    }

    /**
     * Decode a batch of tokenized sequences.
     * @param {number[][]|Tensor} batch List/Tensor of tokenized input sequences.
     * @param {Object} decode_args (Optional) Object with decoding arguments.
     * @returns {string[]} List of decoded sequences.
     */
    /*
    batch_decode(batch : any, decode_args = {}) {
        if (batch instanceof Tensor) {
            
            batch = batch.tolist()
        }
        return batch.map((x) => this.decode(x, decode_args))
    }*/

    /**
     * Decodes a sequence of token IDs back to a string.
     *
     * @param {number[]|Tensor} token_ids List/Tensor of token IDs to decode.
     * @param {Object} [decode_args={}]
     * @param {boolean} [decode_args.skip_special_tokens=false] If true, special tokens are removed from the output string.
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=true] If true, spaces before punctuations and abbreviated forms are removed.
     *
     * @returns {string} The decoded string.
     * @throws {Error} If `token_ids` is not a non-empty array of integers.
     */
    /*
    decode(token_ids, decode_args = {}) {
        if (token_ids instanceof Tensor) {
            token_ids = prepareTensorForDecode(token_ids)
        }

        if (
            !Array.isArray(token_ids) ||
            token_ids.length === 0 ||
            !isIntegralNumber(token_ids[0])
        ) {
            throw Error('token_ids must be a non-empty array of integers.')
        }

        return this.decode_single(token_ids, decode_args)
    }*/

    /**
     * Decode a single list of token ids to a string.
     * @param {number[]} token_ids List of token ids to decode
     * @param {Object} decode_args Optional arguments for decoding
     * @param {boolean} [decode_args.skip_special_tokens=false] Whether to skip special tokens during decoding
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=null] Whether to clean up tokenization spaces during decoding.
     * If null, the value is set to `this.decoder.cleanup` if it exists, falling back to `this.clean_up_tokenization_spaces` if it exists, falling back to `true`.
     * @returns {string} The decoded string
     */
    /*
    decode_single(token_ids, { skip_special_tokens = false, clean_up_tokenization_spaces = null }) {
        let tokens = this.model.convert_ids_to_tokens(token_ids)
        if (skip_special_tokens) {
            tokens = tokens.filter((x) => !this.special_tokens.includes(x))
        }

        // If `this.decoder` is null, we just join tokens with a space:
        // https://github.com/huggingface/tokenizers/blob/8edec536a737cb04494b454805be16c020abb14f/tokenizers/src/tokenizer/mod.rs#L835
        /** @type {string} */
    /*
        let decoded = this.decoder ? this.decoder(tokens) : tokens.join(' ')

        // Slight hack, but prevents having to pass `skip_special_tokens` to
        // each call to `decode`, which would lead to code duplication.
        if (this.decoder && this.decoder.end_of_word_suffix) {
            decoded = decoded.replaceAll(this.decoder.end_of_word_suffix, ' ')
            if (skip_special_tokens) {
                decoded = decoded.trim()
            }
        }

        if (clean_up_tokenization_spaces ?? this.clean_up_tokenization_spaces) {
            decoded = clean_up_tokenization(decoded)
        }

        return decoded
    }*/

    get default_chat_template() {
        if (!this._warned_about_chat_template) {
            console.warn(
                'No chat template is defined for this tokenizer - using a default chat template ' +
                    'that implements the ChatML format. If the default is not appropriate for ' +
                    'your model, please set `tokenizer.chat_template` to an appropriate template. ' +
                    'See https://huggingface.co/docs/transformers/main/chat_templating for more information.'
            )
            this._warned_about_chat_template = true // TODO move to logger.warning_once()
        }

        return this._default_chat_template
    }

    /**
     * Converts a list of message objects with `"role"` and `"content"` keys to a list of token
     * ids. This method is intended for use with chat models, and will read the tokenizer's chat_template attribute to
     * determine the format and control tokens to use when converting. When chat_template is None, it will fall back
     * to the default_chat_template specified at the class level.
     *
     * See [here](https://huggingface.co/docs/transformers/chat_templating) for more information.
     *
     * **Example:** Applying a chat template to a conversation.
     *
     * ```javascript
     * import { AutoTokenizer } from "@xenova/transformers";
     *
     * const tokenizer = await AutoTokenizer.from_pretrained("Xenova/mistral-tokenizer-v1");
     *
     * const chat = [
     *   { "role": "user", "content": "Hello, how are you?" },
     *   { "role": "assistant", "content": "I'm doing great. How can I help you today?" },
     *   { "role": "user", "content": "I'd like to show off how chat templating works!" },
     * ]
     *
     * const text = tokenizer.apply_chat_template(chat, { tokenize: false });
     * // "<s>[INST] Hello, how are you? [/INST]I'm doing great. How can I help you today?</s> [INST] I'd like to show off how chat templating works! [/INST]"
     *
     * const input_ids = tokenizer.apply_chat_template(chat, { tokenize: true, return_tensor: false });
     * // [1, 733, 16289, 28793, 22557, 28725, 910, 460, 368, 28804, 733, 28748, 16289, 28793, 28737, 28742, 28719, 2548, 1598, 28723, 1602, 541, 315, 1316, 368, 3154, 28804, 2, 28705, 733, 16289, 28793, 315, 28742, 28715, 737, 298, 1347, 805, 910, 10706, 5752, 1077, 3791, 28808, 733, 28748, 16289, 28793]
     * ```
     *
     * @param {Message[]} conversation A list of message objects with `"role"` and `"content"` keys.
     * @param {Object} options An optional object containing the following properties:
     * @param {string} [options.chat_template=null] A Jinja template to use for this conversion. If
     * this is not passed, the model's default chat template will be used instead.
     * @param {boolean} [options.add_generation_prompt=false] Whether to end the prompt with the token(s) that indicate
     * the start of an assistant message. This is useful when you want to generate a response from the model.
     * Note that this argument will be passed to the chat template, and so it must be supported in the
     * template for this argument to have any effect.
     * @param {boolean} [options.tokenize=true] Whether to tokenize the output. If false, the output will be a string.
     * @param {boolean} [options.padding=false] Whether to pad sequences to the maximum length. Has no effect if tokenize is false.
     * @param {boolean} [options.truncation=false] Whether to truncate sequences to the maximum length. Has no effect if tokenize is false.
     * @param {number} [options.max_length=null] Maximum length (in tokens) to use for padding or truncation. Has no effect if tokenize is false.
     * If not specified, the tokenizer's `max_length` attribute will be used as a default.
     * @param {boolean} [options.return_tensor=true] Whether to return the output as a Tensor or an Array. Has no effect if tokenize is false.
     * @param {Object} [options.tokenizer_kwargs={}] Additional options to pass to the tokenizer.
     * @returns {string | Tensor | number[]| number[][]} The tokenized output.
     */
    /*
    apply_chat_template(
        conversation,
        {
            chat_template = null,
            add_generation_prompt = false,
            tokenize = true,
            padding = false,
            truncation = false,
            max_length = null,
            return_tensor = true,
            tokenizer_kwargs = {},
            ...kwargs
        } = {}
    ) {
        // First, handle the cases when the model has a dict of multiple templates
        if (
            (this.chat_template && typeof this.chat_template === 'object') ||
            (this.chat_template === null &&
                this.default_chat_template &&
                typeof this.default_chat_template === 'object')
        ) {
            const template_dict = this.chat_template ?? this.default_chat_template // Guaranteed to be a non-null object

            if (chat_template !== null && Object.hasOwn(template_dict, chat_template)) {
                // The user can pass the name of a template to the chat template argument instead of an entire template
                chat_template = template_dict[chat_template]
            } else if (chat_template === null && 'default' in template_dict) {
                chat_template = template_dict['default']
            } else if (chat_template === null) {
                throw Error(
                    `This model has multiple chat templates with no default specified! Please either pass a chat ` +
                        `template or the name of the template you wish to use to the 'chat_template' argument. Available ` +
                        `template names are ${Object.keys(template_dict).sort()}.`
                )
            }
        } else {
            // These are the cases when the model has a single template
            // priority: `chat_template` argument > `tokenizer.chat_template` > `tokenizer.default_chat_template
            chat_template ??= this.chat_template ?? this.default_chat_template
        }
        if (typeof chat_template !== 'string') {
            throw Error(`chat_template must be a string, but got ${typeof chat_template}`)
        }

        // Compilation function uses a cache to avoid recompiling the same template
        let compiledTemplate = this._compiled_template_cache.get(chat_template)
        if (compiledTemplate === undefined) {
            compiledTemplate = new Template(chat_template)
            this._compiled_template_cache.set(chat_template, compiledTemplate)
        }

        const special_tokens_map = Object.create(null)
        for (const key of SPECIAL_TOKEN_ATTRIBUTES) {
            const value = this.getToken(key)
            if (value) {
                special_tokens_map[key] = value
            }
        }

        const rendered = compiledTemplate.render({
            messages: conversation,
            add_generation_prompt: add_generation_prompt,

            ...special_tokens_map,
            ...kwargs,
        })

        if (tokenize) {
            return this._call(rendered, {
                add_special_tokens: false,
                padding,
                truncation,
                max_length,
                return_tensor,
                ...tokenizer_kwargs,
            }).input_ids
        }

        return rendered
    }*/
}

/**
 * Helper function to fuse consecutive values in an array equal to the specified value.
 * @param {string[]} arr The input array
 * @param {any} value The value to fuse on.
 * @param {Map<string, any>} mapping The mapping from input domain to value.
 */
function fuse(arr: any[], value: any, mapping: any) {
    const fused = []
    let i = 0
    while (i < arr.length) {
        fused.push(arr[i])
        if ((mapping.get(arr[i]) ?? value) !== value) {
            ++i
            continue
        }

        while (i < arr.length && (mapping.get(arr[i]) ?? value) === value) {
            ++i
        }
    }

    return fused
}

class Normalizer extends Callable {
    config: any
    /**
     * @param {Object} config The configuration object for the normalizer.
     */
    constructor(config: any) {
        super()
        this.config = config
    }

    /**
     * Factory method for creating normalizers from config objects.
     * @static
     * @param {Object} config The configuration object for the normalizer.
     * @returns {Normalizer} A Normalizer object.
     * @throws {Error} If an unknown Normalizer type is specified in the config.
     */
    static fromConfig(config: any) {
        if (config === null) return null
        switch (config.type) {
            case 'BertNormalizer':
                return new BertNormalizer(config)
            /*case 'Precompiled':
                return new Precompiled(config)
            case 'Sequence':
                return new NormalizerSequence(config)
            case 'Replace':
                return new Replace(config)
            case 'NFC':
                return new NFC(config)
            case 'NFKC':
                return new NFKC(config)
            case 'NFKD':
                return new NFKD(config)
            case 'Strip':
                return new StripNormalizer(config)
            case 'StripAccents':
                return new StripAccents(config)
            case 'Lowercase':
                return new Lowercase(config)
            case 'Prepend':
                return new Prepend(config)*/
            default:
                throw new Error(`Unknown Normalizer type: ${config.type}`)
        }
    }

    /**
     * Normalize the input text.
     * @abstract
     * @param {string} text The text to normalize.
     * @returns {string} The normalized text.
     * @throws {Error} If this method is not implemented in a subclass.
     */
    normalize(text: string) {
        throw Error('normalize should be implemented in subclass.')
    }

    /**
     * Alias for {@link Normalizer#normalize}.
     * @param {string} text The text to normalize.
     * @returns {string} The normalized text.
     */
    _call(text: string) {
        return this.normalize(text)
    }
}

class BertNormalizer extends Normalizer {
    /**
     * Adds whitespace around any CJK (Chinese, Japanese, or Korean) character in the input text.
     *
     * @param {string} text The input text to tokenize.
     * @returns {string} The tokenized text with whitespace added around CJK characters.
     */
    _tokenize_chinese_chars(text: any) {
        /* Adds whitespace around any CJK character. */
        const output = []
        for (let i = 0; i < text.length; ++i) {
            const char = text[i]
            const cp = char.charCodeAt(0)
            if (this._is_chinese_char(cp)) {
                output.push(' ')
                output.push(char)
                output.push(' ')
            } else {
                output.push(char)
            }
        }
        return output.join('')
    }

    /**
     * Checks whether the given Unicode codepoint represents a CJK (Chinese, Japanese, or Korean) character.
     *
     * A "chinese character" is defined as anything in the CJK Unicode block:
     * https://en.wikipedia.org/wiki/CJK_Unified_Ideographs_(Unicode_block)
     *
     * Note that the CJK Unicode block is NOT all Japanese and Korean characters, despite its name.
     * The modern Korean Hangul alphabet is a different block, as is Japanese Hiragana and Katakana.
     * Those alphabets are used to write space-separated words, so they are not treated specially
     * and are handled like all other languages.
     *
     * @param {number} cp The Unicode codepoint to check.
     * @returns {boolean} True if the codepoint represents a CJK character, false otherwise.
     */
    _is_chinese_char(cp: any) {
        return (
            (cp >= 0x4e00 && cp <= 0x9fff) ||
            (cp >= 0x3400 && cp <= 0x4dbf) ||
            (cp >= 0x20000 && cp <= 0x2a6df) ||
            (cp >= 0x2a700 && cp <= 0x2b73f) ||
            (cp >= 0x2b740 && cp <= 0x2b81f) ||
            (cp >= 0x2b820 && cp <= 0x2ceaf) ||
            (cp >= 0xf900 && cp <= 0xfaff) ||
            (cp >= 0x2f800 && cp <= 0x2fa1f)
        )
    }
    /**
     * Strips accents from the given text.
     * @param {string} text The text to strip accents from.
     * @returns {string} The text with accents removed.
     */
    stripAccents(text: string) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }

    /**
     * Checks whether `char` is a control character.
     * @param {string} char The character to check.
     * @returns {boolean} Whether `char` is a control character.
     * @private
     */
    _is_control(char: string) {
        switch (char) {
            case '\t':
            case '\n':
            case '\r':
                // These are technically control characters but we count them as whitespace characters.
                return false

            default:
                // Check if unicode category starts with C:
                // Cc - Control
                // Cf - Format
                // Co - Private Use
                // Cs - Surrogate
                return /^\p{Cc}|\p{Cf}|\p{Co}|\p{Cs}$/u.test(char)
        }
    }

    /**
     * Performs invalid character removal and whitespace cleanup on text.
     * @param {string} text The text to clean.
     * @returns {string} The cleaned text.
     * @private
     */
    _clean_text(text: string) {
        const output = []
        for (const char of text) {
            const cp = char.charCodeAt(0)
            if (cp === 0 || cp === 0xfffd || this._is_control(char)) {
                continue
            }
            if (/^\s$/.test(char)) {
                // is whitespace
                output.push(' ')
            } else {
                output.push(char)
            }
        }
        return output.join('')
    }
    /**
     * Normalizes the given text based on the configuration.
     * @param {string} text The text to normalize.
     * @returns {string} The normalized text.
     */
    normalize(text: string) {
        if (this.config.clean_text) {
            text = this._clean_text(text)
        }

        if (this.config.handle_chinese_chars) {
            text = this._tokenize_chinese_chars(text)
        }

        if (this.config.lowercase) {
            text = text.toLowerCase()

            if (this.config.strip_accents !== false) {
                text = this.stripAccents(text)
            }
        } else if (this.config.strip_accents) {
            text = this.stripAccents(text)
        }

        return text
    }
}

class PreTokenizer extends Callable {
    /**
     * Factory method that returns an instance of a subclass of `PreTokenizer` based on the provided configuration.
     *
     * @static
     * @param {Object} config A configuration object for the pre-tokenizer.
     * @returns {PreTokenizer} An instance of a subclass of `PreTokenizer`.
     * @throws {Error} If the provided configuration object does not correspond to any known pre-tokenizer.
     */
    static fromConfig(config: any) {
        if (config === null) return null

        switch (config.type) {
            /*case 'BertPreTokenizer':
                return new BertPreTokenizer(config)
            
            case 'Whitespace':
                return new WhitespacePreTokenizer(config)
            case 'WhitespaceSplit':
                return new WhitespaceSplit(config)
            case 'Metaspace':
                return new MetaspacePreTokenizer(config)*/

            case 'ByteLevel':
                return new ByteLevelPreTokenizer(config)

            case 'Sequence':
                return new PreTokenizerSequence(config)

            case 'Split':
                return new SplitPreTokenizer(config)
            /*
            case 'Punctuation':
                return new PunctuationPreTokenizer(config)
            case 'Digits':
                return new DigitsPreTokenizer(config)
            case 'Replace':
                return new ReplacePreTokenizer(config)*/
            default:
                throw new Error(`Unknown PreTokenizer type: ${config.type}`)
        }
    }

    /**
     * Method that should be implemented by subclasses to define the specific pre-tokenization logic.
     *
     * @abstract
     * @param {string} text The text to pre-tokenize.
     * @param {Object} [options] Additional options for the pre-tokenization logic.
     * @returns {string[]} The pre-tokenized text.
     * @throws {Error} If the method is not implemented in the subclass.
     */
    pre_tokenize_text(text: string, options: any): any {
        throw Error('pre_tokenize_text should be implemented in subclass.')
    }

    /**
     * Tokenizes the given text into pre-tokens.
     * @param {string|string[]} text The text or array of texts to pre-tokenize.
     * @param {Object} [options] Additional options for the pre-tokenization logic.
     * @returns {string[]} An array of pre-tokens.
     */
    pre_tokenize(text: string, options: any) {
        return (
            Array.isArray(text)
                ? text.map((x) => this.pre_tokenize_text(x, options))
                : this.pre_tokenize_text(text, options)
        ).flat()
    }

    /**
     * Alias for {@link PreTokenizer#pre_tokenize}.
     * @param {string|string[]} text The text or array of texts to pre-tokenize.
     * @param {Object} [options] Additional options for the pre-tokenization logic.
     * @returns {string[]} An array of pre-tokens.
     */
    _call(text: any, options: any) {
        return this.pre_tokenize(text, options)
    }
}

class PreTokenizerSequence extends PreTokenizer {
    tokenizers: any
    /**
     * Creates an instance of PreTokenizerSequence.
     * @param {Object} config The configuration object for the pre-tokenizer sequence.
     * @param {Object[]} config.pretokenizers An array of pre-tokenizer configurations.
     */
    constructor(config: any) {
        super()
        this.tokenizers = config.pretokenizers.map((x: any) => PreTokenizer.fromConfig(x))
    }

    /**
     * Applies each pre-tokenizer in the sequence to the input text in turn.
     * @param {string} text The text to pre-tokenize.
     * @param {Object} [options] Additional options for the pre-tokenization logic.
     * @returns {string[]} The pre-tokenized text.
     */
    pre_tokenize_text(text: string, options: any) {
        // Use reduce to apply each tokenizer to the text
        return this.tokenizers.reduce(
            (preTokenizedText: string, tokenizer: any) => {
                return tokenizer.pre_tokenize(preTokenizedText, options)
            },
            [text]
        )
    }
}

class ByteLevelPreTokenizer extends PreTokenizer {
    config: any
    add_prefix_space: any
    trim_offsets: any
    use_regex: any
    pattern: RegExp
    byte_encoder: any
    text_encoder: any
    /**
     * Creates a new instance of the `ByteLevelPreTokenizer` class.
     * @param {Object} config The configuration object.
     */
    constructor(config: any) {
        super()
        this.config = config

        /**
         * @type {boolean} Whether to add a leading space to the first word.
         * This allows to treat the leading word just as any other word.
         */
        this.add_prefix_space = this.config.add_prefix_space

        /**
         * @type {boolean} Whether the post processing step should trim offsets
         * to avoid including whitespaces.
         * @todo Use this in the pretokenization step.
         */
        this.trim_offsets = this.config.trim_offsets

        /**
         * @type {boolean} Whether to use the standard GPT2 regex for whitespace splitting.
         * Set it to False if you want to use your own splitting. Defaults to true.
         */
        this.use_regex = this.config.use_regex ?? true
        this.pattern =
            /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu

        this.byte_encoder = BYTES_TO_UNICODE
        this.text_encoder = new TextEncoder()
    }

    /**
     * Tokenizes a single piece of text using byte-level tokenization.
     * @param {string} text The text to tokenize.
     * @param {Object} [options] Additional options for the pre-tokenization logic.
     * @returns {string[]} An array of tokens.
     */
    pre_tokenize_text(text: string, options: any): any {
        // Add a leading space if the option is enabled
        if (this.add_prefix_space && !text.startsWith(' ')) {
            text = ' ' + text
        }

        // Split on whitespace and punctuation
        const tokens = this.use_regex ? text.match(this.pattern) || [] : [text]

        // Maps all our bytes to unicode strings, avoiding control tokens of the BPE (spaces in our case)
        return tokens.map((token) =>
            Array.from(
                this.text_encoder.encode(token),
                (byte: any) => this.byte_encoder[byte]
            ).join('')
        )
    }
}

class SplitPreTokenizer extends PreTokenizer {
    [x: string]: any
    /**
     * @param {Object} config The configuration options for the pre-tokenizer.
     * @param {Object} config.pattern The pattern used to split the text. Can be a string or a regex object.
     * @param {string|undefined} config.pattern.String The string to use for splitting. Only defined if the pattern is a string.
     * @param {string|undefined} config.pattern.Regex The regex to use for splitting. Only defined if the pattern is a regex.
     * @param {SplitDelimiterBehavior} config.behavior The behavior to use when splitting.
     * @param {boolean} config.invert Whether to split (invert=false) or match (invert=true) the pattern.
     */
    constructor(config: any) {
        super()
        this.config = config
        // TODO support all behaviours (config.behavior)

        this.pattern = createPattern(this.config.pattern, this.config.invert)
    }

    /**
     * Tokenizes text by splitting it using the given pattern.
     * @param {string} text The text to tokenize.
     * @param {Object} [options] Additional options for the pre-tokenization logic.
     * @returns {string[]} An array of tokens.
     */
    pre_tokenize_text(text: string, options: any) {
        if (this.pattern === null) {
            return []
        }

        if (this.config.invert) {
            return text.match(this.pattern) || []
        } else {
            return regexSplit(text, this.pattern)
        }
    }
}

export class TokenizerModel extends Callable {
    config: any
    vocab: any[]
    tokens_to_ids: Map<any, any>
    unk_token_id: undefined
    unk_token: undefined
    end_of_word_suffix: undefined
    fuse_unk: any
    /**
     * Creates a new instance of TokenizerModel.
     * @param {Object} config The configuration object for the TokenizerModel.
     */
    constructor(config: any) {
        super()
        this.config = config

        /** @type {string[]} */
        this.vocab = []

        /**
         * A mapping of tokens to ids.
         * @type {Map<string, number>}
         */
        this.tokens_to_ids = new Map()

        this.unk_token_id = undefined
        this.unk_token = undefined
        this.end_of_word_suffix = undefined

        /** @type {boolean} Whether to fuse unknown tokens when encoding. Defaults to false. */
        this.fuse_unk = this.config.fuse_unk ?? false
    }

    /**
     * Instantiates a new TokenizerModel instance based on the configuration object provided.
     * @param {Object} config The configuration object for the TokenizerModel.
     * @param {...*} args Optional arguments to pass to the specific TokenizerModel constructor.
     * @returns {TokenizerModel} A new instance of a TokenizerModel.
     * @throws Will throw an error if the TokenizerModel type in the config is not recognized.
     */
    static fromConfig(config: any, ...args: any) {
        switch (config.type) {
            /* case 'WordPiece':
                return new WordPieceTokenizer(config)
            case 'Unigram':
                // @ts-ignore
                return new Unigram(config, ...args)*/

            case 'BPE':
                return new BPE(config)

            default:
                if (config.vocab) {
                    // @ts-ignore
                    return new LegacyTokenizerModel(config, ...args)
                }
                throw new Error(`Unknown TokenizerModel type: ${config.type}`)
        }
    }

    /**
     * Internal function to call the TokenizerModel instance.
     * @param {string[]} tokens The tokens to encode.
     * @returns {string[]} The encoded token IDs.
     */
    _call(tokens: any) {
        let ids = this.encode(tokens)
        if (this.fuse_unk) {
            // Fuse unknown tokens
            ids = fuse(ids, this.unk_token_id, this.tokens_to_ids)
        }
        return ids
    }

    /**
     * Encodes a list of tokens into a list of token IDs.
     * @param {string[]} tokens The tokens to encode.
     * @returns {string[]} The encoded tokens.
     * @throws Will throw an error if not implemented in a subclass.
     */
    encode(tokens: any): any {
        throw Error('encode should be implemented in subclass.')
    }

    /**
     * Converts a list of tokens into a list of token IDs.
     * @param {string[]} tokens The tokens to convert.
     * @returns {number[]} The converted token IDs.
     */
    convert_tokens_to_ids(tokens: any) {
        return tokens.map((t: any) => this.tokens_to_ids.get(t) ?? this.unk_token_id)
    }

    /**
     * Converts a list of token IDs into a list of tokens.
     * @param {number[]} ids The token IDs to convert.
     * @returns {string[]} The converted tokens.
     */
    convert_ids_to_tokens(ids: any) {
        return ids.map((i: any) => this.vocab[i] ?? this.unk_token)
    }
}

class BPE extends TokenizerModel {
    BPE_SPLIT_TOKEN: string
    bpe_ranks: Map<unknown, unknown>
    merges: string[]
    continuing_subword_suffix: any
    byte_fallback: any
    text_encoder: any
    ignore_merges: any
    cache: Map<any, any>
    /**
     * Create a BPE instance.
     * @param {Object} config The configuration object for BPE.
     * @param {Object} config.vocab A mapping of tokens to ids.
     * @param {string[]} config.merges An array of BPE merges as strings.
     * @param {string} config.unk_token The unknown token used for out of vocabulary words.
     * @param {string} config.end_of_word_suffix The suffix to place at the end of each word.
     * @param {string} [config.continuing_subword_suffix] The suffix to insert between words.
     * @param {boolean} [config.byte_fallback=false] Whether to use spm byte-fallback trick (defaults to False)
     * @param {boolean} [config.ignore_merges=false] Whether or not to match tokens with the vocab before using merges.
     */
    constructor(config: any) {
        super(config)

        this.BPE_SPLIT_TOKEN = ' '

        /** @type {Map<string, number>} */
        this.tokens_to_ids = new Map(Object.entries(config.vocab))

        this.unk_token_id = this.tokens_to_ids.get(config.unk_token)
        this.unk_token = config.unk_token

        this.vocab = new Array(this.tokens_to_ids.size)
        for (const [key, value] of this.tokens_to_ids) {
            this.vocab[value] = key
        }

        this.bpe_ranks = new Map(config.merges.map((x: any, i: any) => [x, i]))
        this.merges = config.merges.map((x: any) => x.split(this.BPE_SPLIT_TOKEN))

        this.end_of_word_suffix = config.end_of_word_suffix

        // NOTE: `continuing_subword_suffix` is custom (to support `BlenderbotSmallTokenizer`)
        this.continuing_subword_suffix = config.continuing_subword_suffix ?? null

        this.byte_fallback = this.config.byte_fallback ?? false

        if (this.byte_fallback) {
            this.text_encoder = new TextEncoder()
        }

        this.ignore_merges = this.config.ignore_merges ?? false

        /** @type {Map<string, string[]>} */
        this.cache = new Map()
    }

    /**
     * Apply Byte-Pair-Encoding (BPE) to a given token. Efficient heap-based priority
     * queue implementation adapted from https://github.com/belladoreai/llama-tokenizer-js.
     * @param {string} token The token to encode.
     * @returns {string[]} The BPE encoded tokens.
     */
    bpe(token: any) {
        if (token.length === 0) {
            return []
        }

        const cached = this.cache.get(token)
        if (cached !== undefined) {
            return cached
        }

        const word = Array.from(token)
        if (this.end_of_word_suffix) {
            word[word.length - 1] += this.end_of_word_suffix
        }

        let result = []
        if (word.length > 1) {
            // Create a priority queue to store the nodes that will be merged.
            // The comparator function compares the scores of the nodes.
            const queue = new PriorityQueue((a: any, b: any) => a.score < b.score)

            // Construct a doubly-linked list of nodes that will be inserted into the priority queue,
            // starting with the individual characters. We also populate each node with a positional
            // bias to break ties in the priority queue.
            let startingNode = {
                token: word[0],
                bias: 0,
                prev: null,
                next: null,
            }

            let previousNode = startingNode
            for (let i = 1; i < word.length; ++i) {
                const currentNode = {
                    bias: i / word.length, // Add fractional component to break ties
                    token: word[i],
                    prev: previousNode,
                    next: null,
                }
                //@ts-expect-error
                previousNode.next = currentNode
                this._add_node(queue, previousNode)
                //@ts-expect-error
                previousNode = currentNode
            }

            while (!queue.isEmpty()) {
                // Get the next node with the highest priority
                const node = queue.pop()

                // Check that this merge is still possible
                if (node.deleted || !node.next || node.next.deleted) continue

                // Here, we mark the current node (left side of the merge) and the next node (right side of the merge) as deleted.
                // This is because they will both be replaced by a new node representing the merge result.
                node.deleted = true
                node.next.deleted = true

                // Next, we fix the node that comes before the current node (i.e., left side of the merge).
                if (node.prev) {
                    // Make a shallow copy of the previous node
                    const newPreviousNode = { ...node.prev }

                    // Mark the old previous node as deleted. This avoids erroneous merges later,
                    // because there may still be references to this node in the priority queue.
                    node.prev.deleted = true
                    node.prev = newPreviousNode

                    // Update the reference of the previous node, by pointing its previous node to this new previous node.
                    if (newPreviousNode.prev) {
                        newPreviousNode.prev.next = newPreviousNode
                    } else {
                        // If the previous of the previous node does not exist, it means that
                        // `newPreviousNode` must be the new `startingNode`.
                        startingNode = newPreviousNode
                    }
                }

                // Create a new node which represents the result of the merge.
                const merged = {
                    token: node.token + node.next.token,
                    bias: node.bias,
                    prev: node.prev,
                    next: node.next.next,
                }

                // We now consider where we can add the new merged node to the priority queue:
                // 1. prev <-> merged
                if (merged.prev) {
                    merged.prev.next = merged
                    this._add_node(queue, merged.prev)
                } else {
                    // If `merged.prev` does not exist, then `merged` must be the new `startingNode`.
                    startingNode = merged
                }

                // 2. merged <-> next
                if (merged.next) {
                    merged.next.prev = merged
                    this._add_node(queue, merged)
                }
            }

            // Traverse the linked list, starting from the `startingNode`, and collect the tokens.
            for (
                let currentNode = startingNode;
                currentNode !== null;
                //@ts-expect-error
                currentNode = currentNode.next
            ) {
                result.push(currentNode.token)
            }
        } else {
            result = word
        }

        // Possibly append suffix
        if (this.continuing_subword_suffix) {
            // Do not append suffix to the last token
            for (let i = 0; i < result.length - 1; ++i) {
                result[i] += this.continuing_subword_suffix
            }
        }

        // Save the result to the cache
        this.cache.set(token, result)

        return result
    }

    /**
     * Helper function to add a node to the priority queue.
     * @param {PriorityQueue} queue
     * @param {BPENode} node
     * @private
     */
    _add_node(queue: any, node: any) {
        // `score` is a measure of the merge priority: lower means higher priority
        // We use the BPE rank as a measure of priority (i.e., the local of the merge in the merges list)
        // We also add a fractional component to the score to break ties (with the earlier character having higher priority)
        const rank = this.bpe_ranks.get(node.token + this.BPE_SPLIT_TOKEN + node.next.token)
        if (rank !== undefined) {
            node.score = rank + node.bias
            queue.push(node)
        }
    }

    /**
     * Encodes the input sequence of tokens using the BPE algorithm and returns the resulting subword tokens.
     * @param {string[]} tokens The input sequence of tokens to encode.
     * @returns {string[]} The resulting subword tokens after applying the BPE algorithm to the input sequence of tokens.
     */
    encode(tokens: any) {
        const outputTokens = []

        for (const token of tokens) {
            if (this.ignore_merges && this.tokens_to_ids.has(token)) {
                outputTokens.push(token)
                continue
            }
            const bpe_token_list = this.bpe(token)

            for (const t of bpe_token_list) {
                if (this.tokens_to_ids.has(t)) {
                    outputTokens.push(t)
                } else {
                    if (this.byte_fallback) {
                        outputTokens.push(
                            ...Array.from(this.text_encoder.encode(t)).map(
                                (x: any) => `<0x${x.toString(16).toUpperCase().padStart(2, '0')}>`
                            )
                        )
                    } else {
                        outputTokens.push(this.unk_token)
                    }
                }
            }
        }

        return outputTokens
    }
}

class PostProcessor extends Callable {
    config: any
    /**
     * @param {Object} config The configuration for the post-processor.
     */
    constructor(config: any) {
        super()
        this.config = config
    }

    /**
     * Factory method to create a PostProcessor object from a configuration object.
     *
     * @param {Object} config Configuration object representing a PostProcessor.
     * @returns {PostProcessor} A PostProcessor object created from the given configuration.
     * @throws {Error} If an unknown PostProcessor type is encountered.
     */
    static fromConfig(config: any) {
        if (config === null) return null
        switch (config.type) {
            /*
            case 'TemplateProcessing':
                return new TemplateProcessing(config)

            case 'ByteLevel':
                return new ByteLevelPostProcessor(config)*/

            case 'RobertaProcessing':
                return new RobertaProcessing(config)
            case 'BertProcessing':
                return new BertProcessing(config)

            default:
                throw new Error(`Unknown PostProcessor type: ${config.type}`)
        }
    }

    /**
     * Method to be implemented in subclass to apply post-processing on the given tokens.
     *
     * @param {Array} tokens The input tokens to be post-processed.
     * @param {...*} args Additional arguments required by the post-processing logic.
     * @returns {PostProcessedOutput} The post-processed tokens.
     * @throws {Error} If the method is not implemented in subclass.
     */
    post_process(tokens: any, ...args: any): any {
        throw Error('post_process should be implemented in subclass.')
    }

    /**
     * Alias for {@link PostProcessor#post_process}.
     * @param {Array} tokens The text or array of texts to post-process.
     * @param {...*} args Additional arguments required by the post-processing logic.
     * @returns {PostProcessedOutput} The post-processed tokens.
     */
    _call(tokens: any, ...args: any) {
        return this.post_process(tokens, ...args)
    }
}

class BertProcessing extends PostProcessor {
    cls: any
    sep: any
    /**
     * @param {Object} config The configuration for the post-processor.
     * @param {string[]} config.cls The special tokens to add to the beginning of the input.
     * @param {string[]} config.sep The special tokens to add to the end of the input.
     */
    constructor(config: any) {
        super(config)
        // TODO use all of config: add_prefix_space, trim_offsets

        this.cls = config.cls[0]
        this.sep = config.sep[0]
    }

    /**
     * Adds the special tokens to the beginning and end of the input.
     * @param {string[]} tokens The input tokens.
     * @param {string[]} [tokens_pair=null] An optional second set of input tokens.
     * @returns {PostProcessedOutput} The post-processed tokens with the special tokens added to the beginning and end.
     */
    post_process(tokens: any, tokens_pair: any = null, { add_special_tokens = true } = {}) {
        if (add_special_tokens) {
            tokens = mergeArrays([this.cls], tokens, [this.sep])
        }

        let token_type_ids = new Array(tokens.length).fill(0)
        if (tokens_pair !== null) {
            // NOTE: It is intended to add 2 EOS tokens after the first set of tokens
            // https://github.com/huggingface/tokenizers/issues/983
            const middle = add_special_tokens && this instanceof RobertaProcessing ? [this.sep] : []
            const after = add_special_tokens ? [this.sep] : []

            tokens = mergeArrays(tokens, middle, tokens_pair, after)
            token_type_ids = mergeArrays(
                token_type_ids,
                new Array(tokens_pair.length + middle.length + after.length).fill(1)
            )
        }
        return { tokens, token_type_ids }
    }
}
class RobertaProcessing extends BertProcessing {} // NOTE: extends BertProcessing

class Decoder extends Callable {
    config: any
    added_tokens: never[]
    end_of_word_suffix: null
    trim_offsets: any
    /**
     * Creates an instance of `Decoder`.
     *
     * @param {Object} config The configuration object.
     */
    constructor(config: any) {
        super()
        this.config = config

        /** @type {AddedToken[]} */
        this.added_tokens = []
        this.end_of_word_suffix = null
        this.trim_offsets = config.trim_offsets
    }

    /**
     * Creates a decoder instance based on the provided configuration.
     *
     * @param {Object} config The configuration object.
     * @returns {Decoder} A decoder instance.
     * @throws {Error} If an unknown decoder type is provided.
     */
    static fromConfig(config: any) {
        if (config === null) return null
        switch (config.type) {
            /*
            case 'WordPiece':
                return new WordPieceDecoder(config)
            case 'Metaspace':
                return new MetaspaceDecoder(config)*/
            case 'ByteLevel':
                return new ByteLevelDecoder(config)

            /*case 'Replace':
                return new ReplaceDecoder(config)
            case 'ByteFallback':
                return new ByteFallback(config)
            case 'Fuse':
                return new FuseDecoder(config)
            case 'Strip':
                return new StripDecoder(config)

            case 'Sequence':
                return new DecoderSequence(config)

            case 'CTC':
                return new CTCDecoder(config)
            case 'BPEDecoder':
                return new BPEDecoder(config)*/
            default:
                throw new Error(`Unknown Decoder type: ${config.type}`)
        }
    }

    /**
     * Calls the `decode` method.
     *
     * @param {string[]} tokens The list of tokens.
     * @returns {string} The decoded string.
     */
    _call(tokens: any) {
        return this.decode(tokens)
    }

    /**
     * Decodes a list of tokens.
     * @param {string[]} tokens The list of tokens.
     * @returns {string} The decoded string.
     */
    decode(tokens: any) {
        return this.decode_chain(tokens).join('')
    }

    /**
     * Apply the decoder to a list of tokens.
     *
     * @param {string[]} tokens The list of tokens.
     * @returns {string[]} The decoded list of tokens.
     * @throws {Error} If the `decode_chain` method is not implemented in the subclass.
     */
    decode_chain(tokens: any): any {
        throw Error('`decode_chain` should be implemented in subclass.')
    }
}

class ByteLevelDecoder extends Decoder {
    byte_decoder: any
    text_decoder: any
    /**
     * Create a `ByteLevelDecoder` object.
     * @param {Object} config Configuration object.
     */
    constructor(config: any) {
        super(config)

        this.byte_decoder = UNICODE_TO_BYTES
        this.text_decoder = new TextDecoder('utf-8', {
            fatal: false,
            ignoreBOM: true,
        })

        this.end_of_word_suffix = null
    }

    /**
     * Convert an array of tokens to string by decoding each byte.
     * @param {string[]} tokens Array of tokens to be decoded.
     * @returns {string} The decoded string.
     */
    convert_tokens_to_string(tokens: any) {
        const text = tokens.join('')
        const byteArray = new Uint8Array([...text].map((c) => this.byte_decoder[c]))
        const decoded_text = this.text_decoder.decode(byteArray)
        return decoded_text
    }

    /** @type {Decoder['decode_chain']} */
    decode_chain(tokens: any) {
        // TODO move to base class (like HF)
        // tokens === filtered_tokens

        // To avoid mixing byte-level and unicode for byte-level BPT
        // we need to build string separately for added tokens and byte-level tokens
        // cf. https://github.com/huggingface/transformers/issues/1133
        const sub_texts = []
        let current_sub_text = []
        for (const token of tokens) {
            // tokens sent here are already filtered, so we don't need to do this
            // if (skip_special_tokens && this.all_special_ids.includes(token)) {
            //     continue;
            // }

            if (this.added_tokens.find((x: any) => x.content === token) !== undefined) {
                if (current_sub_text.length > 0) {
                    sub_texts.push(this.convert_tokens_to_string(current_sub_text))
                    current_sub_text = []
                }
                sub_texts.push(token)
            } else {
                current_sub_text.push(token)
            }
        }
        if (current_sub_text.length > 0) {
            sub_texts.push(this.convert_tokens_to_string(current_sub_text))
        }

        // TODO add spaces_between_special_tokens and clean_up_tokenization_spaces options

        return sub_texts
    }
}

async function loadTokenizer(name: string, { ...stuff }) {
    if (name === 'roberta')
        return [require('./Roberta/tokenizer.json'), require('./Roberta/tokenizer_config.json')]
    if (name === 'llama3')
        return [require('./Llama3/tokenizer.json'), require('./Llama3/tokenizer_config.json')]
}

//export const RobertaTokenizer = PreTrainedTokenizer.from_pretrained('roberta')
//export const Llama3Tokenizer = PreTrainedTokenizer.from_pretrained('llama3')
