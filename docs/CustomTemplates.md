# Custom API Configurations

This is a guide to adding custom API Configurations to ChatterUI.

To add a custom API template, create a json file containing a configuration, such as [exampleTemplate.json](https://github.com/Vali-98/ChatterUI/blob/master/docs/exampleTemplate.json)

The Typescript definition can be found in [APIBuilder.types.ts](https://github.com/Vali-98/ChatterUI/blob/master/lib/engine/API/APIBuilder.types.ts)

To create your own API configuration, create a JSON that matches the Typescript spec above (or just use example.json as a template)

Below is an explanation of what each field does:

-   `UISettings` - These fields control the content which can be edited in the API Manager
    -   `editableCompletionPath: boolean` - Whether or not a user can edit the completion URL
    -   `editableModelPath: boolean` - Whether or not a user can edit the model URL
    -   `selectableModel: boolean` - Whether or not a user can select which model to use in the UI. Requires `APIModelFormat` to be defined.
-   `APIValues` - These fields are the values that differentiate the templates
    -   `endpoint: string` - URL for completion
    -   `modelEndpoint: string` - URL for retrieving the model list
    -   `prefill: string` - prefill value (only used for Claude)
    -   `firstMessage: string` - firstMessage preamble (only used for Claude)
    -   `key: string` - API key for authorized backends
    -   `model: any` - generic model object or object array retrieved from the modelEndpoint
    -   `configName: string` - (only internally in ChatterUI) name of the template to be used
-   `APIFeatures` - These are self explanatory
    -   `usePrefill: boolean`
    -   `useFirstMessage: boolean`
    -   `useKey: boolean`
    -   `useModel: boolean`
    -   `multipleModels: boolean` - This isn't really used aside Horde
-   `APIRequestFormat` - This controls how the final API request is structured and sent
    -   `requestType: 'stream' | 'horde'` - All responses are streamed, horde requires a unique handler due to not using a SSE stream
    -   `samplerFields: APISampler[]` - This is an array mapping a sampler to a value in the request body, for example:
        -   `{ "externalName": "max_context_length", "samplerID": "max_length" }`
            -   In the request body, this will result in `"max_context_length": <value of max_length>`
            -   `externalName` - The name used by the API
            -   `samplerID` - Internal sampler name in ChatterUI. Refer to the `Key` values in the Sampler table below
    -   `useStop: boolean` - Whether or not to add a `stop sequence` field
    -   `stopKey: string` - The key of the stop sequence in the request body
        -   For example, if defined as "stop", the stop sequence will be added as `"stop" : <stop sequence>`
    -   `promptKey: string` - The key of the prompt value
        -   For example, if defined as "messages", the prompt will be added as `"messages" : <prompt>`
    -   `completionType` - currently supports ChatCompletions and TextCompletions
        -   Refer to [ContextBuilder.ts](https://github.com/Vali-98/ChatterUI/blob/master/lib/engine/API/ContextBuilder.ts) to see how the prompts are built.
        -   `type: chatCompletions` - Though the fields below can be customized, most APIs use the same values as OpenAI
            -   `userRole: string` - the name of the [USER] role
            -   `systemRole: string` the name of the [SYSTEM] role
            -   `assistantRole: string` - the name of the [ASSISTANT] role
            -   `contentName: string` - the key of the [CONTENT] field
        -   `type: textCompletions` - Use this if the API uses text completions
    -   `authHeader: 'Authorization' | 'X-API-KEY' | string` - The header key for authorization
    -   `authPrefix: 'Bearer ' | string` - A prefix before the API key value in the authorization header
    -   `removeLength: boolean` - when `max_length` is defined as a sampler, it can be used for controlling context size client-side, even if the API used doesn't support it. This allows you to remove the `max_length` field from the final request body in case the API used does not allow unsupported fields.
    -   `removeSeedifNegative?: boolean` - Some APIs only allow seed values of at least 0, and prefer an undefined seed for random seed values. This will remove the seed value if it is `-1` from the final request body.
-   `APIPayloadFormat` - Refer to [RequestBuilder.ts](https://github.com/Vali-98/ChatterUI/blob/master/lib/engine/API/RequestBuilder.ts) for how the request body is constructed
    -   `type: 'openai' | 'ollama' | 'cohere' | 'horde'`
        -   openai - This is the general case request body type, that simply throws all the fields into the base object
        -   ollama - This wraps the samplers and stop sequence in an `options` object
        -   cohere - This is a unique structure for Cohere, however they also support the OpenAI spec, so it isn't actually used.
        -   horde - Only used for horde, do not use otherwise
    -   `type: custom`
        -   `customPayload: string` - This is a very experimental feature, it allows you to define a string with macros that will define the JSON body of the request.
            -   This payload supports sampler macros as listed below in the Samplers table using the `Macro` values.
            -   It also supports a few special macros for values not covered by samplers:
                -   `{{prompt}}` - for the message prompt
                -   `{{model}}` - for the model name field
                -   `{{stop}}` - for the stop sequence
-   `APIModelFormat`

    -   `useModelContextLength: boolean` - Whether or not to use a model's context length. Uses the `max_length` sampler otherwise.
    -   `nameParser: string` - Defines how we extract the model name from the Model object
        -   eg. `"data.name"` will check `model.data.name` for the model name.
    -   `contextSizeParser: string` - Defines how we extract the context size from the Model object
        -   eg. `"context_size"` will check `model.context_size` for the context size.
    -   `modelListParser` - Defines how we extract the list of models the model list API request
        -   eg. `"data"` will check `response.data` for the model list.

-   `APIConfiguration` - The main body containing the rest of the configuration
    -   `version: number` - currently version 1
    -   `name: string` - A **UNIQUE** name for this configuration. Must not overlap with other configurations
    -   `defaultValues: Omit<APIValues, 'configName'>` - the default values when creating a new API entry with this template
    -   `features: APIFeatures` - as defined above
    -   `request: APIRequestFormat` - as defined above
    -   `payload: APIPayloadFormat` - as defined above
    -   `model: APIModelForma` - as defined above
    -   `ui: UISettings` - as defined above

#### Sampler Fields:

| Name                       |         Key          |          Macro          |
| :------------------------- | :------------------: | :---------------------: |
| Max Context                |      max_length      | {{max_context_length}}  |
| Streaming                  |      streaming       |       {{stream}}        |
| Generated Tokens           |        genamt        |   {{generted_length}}   |
| Temperature                |         temp         |        {{temp}}         |
| Dynamic Temperature Range  |    dynatemp_range    |   {{dynatemp_range}}    |
| Min P                      |        min_p         |        {{min_p}}        |
| XTC Probability            |   xtc_probability    |        {{xtc_p}}        |
| XTC Threshold              |    xtc_threshold     |        {{xtc_t}}        |
| Top P                      |        top_p         |        {{top_p}}        |
| Top A                      |        top_a         |        {{top_a}}        |
| Top K                      |        top_k         |        {{top_k}}        |
| Repetition Penalty         |       rep_pen        |       {{rep_pen}}       |
| Repetition Penalty Range   |    rep_pen_range     |    {{rep_pen_range}}    |
| Repetition Penalty Slope   |    rep_pen_slope     |    {{rep_pen_slope}}    |
| Encoder Repetition Penalty |   encoder_rep_pen    |     {{enc_rep_pen}}     |
| Frequency Penalty          |       freq_pen       |      {{freq_pen}}       |
| Presence Penalty           |     presence_pen     |      {{pres_pen}}       |
| No Repeat Ngram Size       | no_repeat_ngram_size | {{nrepeat_ngram_size}}  |
| Minimum Length             |      min_length      |     {{min_length}}      |
| Smoothing Factor           |   smoothing_factor   |    {{smooth_factor}}    |
| Typical Sampling           |       typical        |         {{typ}}         |
| Tail-Free Sampling         |         tfs          |         {{tfs}}         |
| Epsilon Cutoff             |    epsilon_cutoff    |     {{eps_cutoff}}      |
| Eta Cutoff                 |      eta_cutoff      |     {{eta_cutoff}}      |
| Mirostat Mode              |    mirostat_mode     |      {{miro_mode}}      |
| Mirostat Tau               |     mirostat_tau     |      {{miro_tau}}       |
| Mirostat Eta               |     mirostat_eta     |      {{miro_eta}}       |
| Include Reasoning          |  include_reasoning   |  {{include_reasoning}}  |
| Ban EOS tokens             |    ban_eos_token     |       {{ban_eos}}       |
| Add BOS Token              |    add_bos_token     |       {{add_bos}}       |
| Do Sample                  |      do_sample       |      {{do_sample}}      |
| Skip Special Token         | skip_special_tokens  |    {{skip_special}}     |
| Single Line                |     single_line      |     {{single_line}}     |
| Grammar                    |    grammar_string    |       {{grammar}}       |
| Seed                       |         seed         |        {{seed}}         |
| Keep Alive Duration        | keep_alive_duration  | {{keep_alive_duration}} |
| Banned Tokens              |    banned_tokens     |    {{banned_tokens}}    |
| CFG Scale                  |    guidance_scale    |   {{guidance_scale}}    |
| Negative Prompt            |   negative_prompt    |   {{negative_prompt}}   |
| Number of Beams            |      num_beams       |      {{num_beams}}      |
| Early Stopping             |    early_stopping    |   {{early_stopping}}    |
| Length Penalty             |    length_penalty    |     {{length_pen}}      |
| Penalty Alpha              |    penalty_alpha     |      {{alpha_pen}}      |
| Dry Multiplier             |    dry_multiplier    |      {{dry_mult}}       |
| Dry Base                   |       dry_base       |      {{dry_base}}       |
| Dry Allowed Length         |  dry_allowed_length  |     {{dry_length}}      |
| Dry Sequence Break         |  dry_sequence_break  |      {{dry_break}}      |
| Dry Penalty Last N         |  dry_penalty_last_n  | {{dry_penalty_last_n}}  |
