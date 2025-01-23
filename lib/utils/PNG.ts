import { atob } from 'react-native-quick-base64'

export const getPngChunkText = (filedata: string) => {
    const binaryString = atob(filedata)
    const bytes = Uint8Array.from(binaryString, (a) => a.charCodeAt(0))
    const chunk = extractChunks(bytes)
    const raw = atob(utf8Decode(decodePNG(chunk).text))
    return JSON.parse(utf8Decode(Uint8Array.from(raw, (a) => a.charCodeAt(0))))
}

/// PNG DATA

function extractChunks(data: Uint8Array) {
    if (data[0] !== 0x89 || data[1] !== 0x50 || data[2] !== 0x4e || data[3] !== 0x47)
        throw new Error('Invalid .png file header')

    if (data[4] !== 0x0d || data[5] !== 0x0a || data[6] !== 0x1a || data[7] !== 0x0a)
        throw new Error(
            'Invalid .png file header: possibly caused by DOS-Unix line ending conversion?'
        )

    let idx = 8

    let firstiter = true
    const uint8 = new Uint8Array(4)
    const int32 = new Int32Array(uint8.buffer)
    const uint32 = new Uint32Array(uint8.buffer)

    while (idx < data.length) {
        uint8[3] = data[idx++]
        uint8[2] = data[idx++]
        uint8[1] = data[idx++]
        uint8[0] = data[idx++]

        const length = uint32[0] + 4
        const chunk = new Uint8Array(length)

        chunk[0] = data[idx++]
        chunk[1] = data[idx++]
        chunk[2] = data[idx++]
        chunk[3] = data[idx++]

        // Get the name in ASCII for identification.

        const name =
            String.fromCharCode(chunk[0]) +
            String.fromCharCode(chunk[1]) +
            String.fromCharCode(chunk[2]) +
            String.fromCharCode(chunk[3])
        // The IHDR header MUST come first.

        if (firstiter && name !== 'IHDR') {
            throw new Error('IHDR header missing')
        } else {
            firstiter = false
        }
        // for cui, we only want the tEXt chunk
        if (name !== 'tEXt') {
            idx += length
            continue
        }

        for (let i = 4; i < length; i++) {
            chunk[i] = data[idx++]
        }

        // Read out the CRC value for comparison.

        // It's stored as an Int32.

        uint8[3] = data[idx++]
        uint8[2] = data[idx++]
        uint8[1] = data[idx++]
        uint8[0] = data[idx++]

        const crcActual = int32[0]

        const crcExpect = crc32_buf(chunk)
        if (crcExpect !== crcActual) {
            throw new Error(
                'CRC values for ' + name + ' header do not match, PNG file is likely corrupted'
            )
        }
        // skip the rest of the chunks
        return new Uint8Array(chunk.buffer.slice(4))
    }

    throw new Error('No tEXt chunk found!')
}

function decodePNG(data: Uint8Array) {
    const index = data.indexOf(0)

    const name = data.slice(0, index)
    const textUint8Array = data.slice(index + 1)
    return {
        keyword: name,
        text: textUint8Array,
    }
}

function signed_crc_table() {
    let c = 0
    const table = new Array(256)

    for (let n = 0; n !== 256; ++n) {
        c = n
        c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1
        c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1
        c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1
        c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1
        c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1
        c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1
        c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1
        c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1
        table[n] = c
    }

    return new Int32Array(table)
}

const T0 = signed_crc_table()

function slice_by_16_tables(T: Int32Array) {
    let c = 0,
        v = 0,
        n = 0
    const table = new Int32Array(4096)

    for (n = 0; n !== 256; ++n) table[n] = T[n]

    for (n = 0; n !== 256; ++n) {
        v = T[n]

        for (c = 256 + n; c < 4096; c += 256) {
            v = (v >>> 8) ^ T[v & 0xff]
            table[c] = v
        }
    }

    const out = []

    for (n = 1; n !== 16; ++n) out[n - 1] = table.subarray(n * 256, n * 256 + 256)

    return out
}

const TT = slice_by_16_tables(T0)

const [T1, T2, T3, T4, T5, T6, T7, T8, T9, Ta, Tb, Tc, Td, Te, Tf, ..._] = TT

function crc32_buf(B: Uint8Array) {
    let C = -1,
        L = B.length - 15,
        i = 0

    for (; i < L; )
        C =
            Tf[B[i++] ^ (C & 255)] ^
            Te[B[i++] ^ ((C >> 8) & 255)] ^
            Td[B[i++] ^ ((C >> 16) & 255)] ^
            Tc[B[i++] ^ (C >>> 24)] ^
            Tb[B[i++]] ^
            Ta[B[i++]] ^
            T9[B[i++]] ^
            T8[B[i++]] ^
            T7[B[i++]] ^
            T6[B[i++]] ^
            T5[B[i++]] ^
            T4[B[i++]] ^
            T3[B[i++]] ^
            T2[B[i++]] ^
            T1[B[i++]] ^
            T0[B[i++]]

    L += 15

    while (i < L) C = (C >>> 8) ^ T0[(C ^ B[i++]) & 0xff]

    return ~C
}

const utf8Decode = (bytes: Uint8Array): string => {
    let string = ''
    let i = 0

    while (i < bytes.length) {
        const byte1 = bytes[i++]
        if (byte1 < 0x80) {
            string += String.fromCharCode(byte1)
        } else if (byte1 < 0xe0) {
            const byte2 = bytes[i++]
            string += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f))
        } else if (byte1 < 0xf0) {
            const byte2 = bytes[i++]
            const byte3 = bytes[i++]
            string += String.fromCharCode(
                ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
            )
        } else {
            const byte2 = bytes[i++]
            const byte3 = bytes[i++]
            const byte4 = bytes[i++]
            const codepoint =
                (((byte1 & 0x07) << 18) |
                    ((byte2 & 0x3f) << 12) |
                    ((byte3 & 0x3f) << 6) |
                    (byte4 & 0x3f)) -
                0x10000
            string += String.fromCharCode(
                ((codepoint >> 10) & 0x3ff) | 0xd800,
                (codepoint & 0x3ff) | 0xdc00
            )
        }
    }

    return string
}
