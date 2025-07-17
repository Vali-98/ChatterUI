import { rawdb } from '@db'
import { LlamaConfig } from '@lib/engine/Local/LlamaLocal'
import { Theme } from '@lib/theme/ThemeManager'
import { initLlama, LlamaContext } from 'cui-llama.rn'
import { NativeEmbeddingResult } from 'cui-llama.rn/lib/typescript/NativeRNLlama'
import { documentDirectory } from 'expo-file-system'
import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { create } from 'zustand'

/*const insertRandomData = async () => {
    const input = Array(8)
        .fill(0)
        .map((item) => Math.random())
    const id = await ddb
        .insert(vec_table)
        .values({ sample_embedding: input })
        .returning({ id: vec_table.id })
    console.log(id)
}*/

const EmbeddingScreen = () => {
    const { color } = Theme.useTheme()
    const { loadModel, getEmbed } = EmbeddingState.useEmbedding((state) => ({
        loadModel: state.loadModel,
        getEmbed: state.getEmbedding,
    }))

    const getData = async () => {
        const now = performance.now()
        const input = `[${Array(8)
            .fill(0)
            .map((item) => 2 * (Math.random() - 0.5))}]`
        //const input = `[-0.200, 0.250, 0.341, -0.211, 0.645, 0.935, -0.316, -0.924]`
        const data = await rawdb.getAllAsync(`select
        id,
        distance
        from vec_examples
        where sample_embedding match '${input}'
        order by distance
      limit 1`)
        console.log(input)

        console.log(data)
        console.log('Time taken:', performance.now() - now)
    }

    const [t1, sett1] = useState<string>('')
    const [t2, sett2] = useState<string>('')
    const [output, setoutput] = useState<string>('')
    return (
        <View style={{ margin: 8 }}>
            <Text>Embedding</Text>
            <TouchableOpacity
                onPress={() => {
                    console.log('Reimplement if needed')
                }}>
                <Text style={{ color: color.text._100 }}>Load Model</Text>
            </TouchableOpacity>
            <TextInput
                value={t1}
                onChangeText={sett1}
                style={{
                    color: color.text._100,
                    margin: 8,
                    padding: 2,
                    borderRadius: 2,
                    borderColor: color.text._400,
                    borderWidth: 1,
                }}
            />
            <TextInput
                value={t2}
                onChangeText={sett2}
                style={{
                    color: color.text._100,
                    margin: 8,
                    padding: 2,
                    borderRadius: 2,
                    borderColor: color.text._400,
                    borderWidth: 1,
                }}
            />
            <TouchableOpacity
                onPress={async () => {
                    const v1 = await getEmbed(t1)
                    const v2 = await getEmbed(t2)
                    if (!v1 || !v2) return
                    let s1 = 0
                    let s2 = 0
                    let dotprod = 0
                    v1?.embedding.forEach((item, index) => {
                        dotprod += v1.embedding[index] * v2.embedding[index]
                        s1 += v1.embedding[index] * v1.embedding[index]
                        s2 += v2.embedding[index] * v2.embedding[index]
                    })
                    setoutput(`Score: ${dotprod / (Math.sqrt(s1) * Math.sqrt(s2))}`)
                }}>
                <Text style={{ color: color.text._100 }}>Test Embedding</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={async () => {
                    sett1('')
                    sett2('')
                }}>
                <Text style={{ color: color.text._100 }}>CLEAR</Text>
            </TouchableOpacity>
            <Text style={{ color: color.text._100 }}>{output}</Text>
            <View style={{ margin: 16 }} />
            <TouchableOpacity
                onPress={async () => {
                    deleteTables()
                }}>
                <Text style={{ color: color.text._100 }}>Delete DB</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={async () => {
                    createTables()
                }}>
                <Text style={{ color: color.text._100 }}>Make DB</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={async () => {
                    insertData()
                }}>
                <Text style={{ color: color.text._100 }}>Insert data</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={async () => {
                    getData()
                }}>
                <Text style={{ color: color.text._100 }}>Query</Text>
            </TouchableOpacity>
        </View>
    )
}

export default EmbeddingScreen

const deleteTables = async () => {
    rawdb.execSync(`drop table if exists vec_examples`)
}

const createTables = async () => {
    rawdb
        .execAsync(
            `create virtual table vec_examples using vec0(
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    sample_embedding float[8] distance_metric=cosine
  );`
        )
        .catch((e) => console.log(e))
}

const insertData = async () => {
    const embedsize = 384
    const batchsize = 10000
    const batches = 1
    /*
    for (let i = 0; i < batches; i++) {
      const input = Array(batchsize)
        .fill(0)
        .map((item, index) => {
          return {
            sample_embedding: Array(embedsize)
              .fill(1)
              .map((item2) => Math.random() * 20 - 10),
          };
        });
  
    }*/
    //const input : number[] = [-0.200, 0.250, 0.341, -0.211, 0.645, 0.935, -0.316, -0.924]

    //await ddb.insert(vec_table).values([input]);

    rawdb.runSync(`insert into vec_examples(id, sample_embedding)
    values
      (1, '[-0.200, 0.250, 0.341, -0.211, 0.645, 0.935, -0.316, -0.924]'),
      (2, '[0.443, -0.501, 0.355, -0.771, 0.707, -0.708, -0.185, 0.362]'),
      (3, '[0.716, -0.927, 0.134, 0.052, -0.669, 0.793, -0.634, -0.162]'),
      (4, '[-0.710, 0.330, 0.656, 0.041, -0.990, 0.726, 0.385, -0.958]');`)
}

type EmbeddingStoreState = {
    model: undefined | LlamaContext
    loadModel: (preset: LlamaConfig) => Promise<void>
    getEmbedding: (text: string) => Promise<NativeEmbeddingResult | undefined>
}

export namespace EmbeddingState {
    export const useEmbedding = create<EmbeddingStoreState>()((set, get) => ({
        model: undefined,
        loadModel: async (preset: LlamaConfig) => {
            const model = await initLlama({
                model: documentDirectory + 'models/allminifp16.gguf',
                n_threads: preset.threads,
                n_batch: preset.batch,
                embedding: true,
            })
            if (!model) return
            set((state) => ({
                ...state,
                model: model,
            }))
        },
        getEmbedding: async (text: string) => {
            return await get()?.model?.embedding(text)
        },
    }))
}
