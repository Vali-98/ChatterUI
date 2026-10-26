# Completion flow

## Entry points

```text
submitMessage(chatId, { text, attachmentUris })
├─ runtime.beginGeneration()          reserve capacity + lock chat mutations
├─ captureGenerationInputs()         capture cards, model, samplers, formatting, macros
└─ runGenerationTask()               start/join native background service
   ├─ Chats.actions.createTurn()      stage attachments; insert both messages atomically
   ├─ attachGenerationSwipe()         assign the assistant swipe to the generation
   └─ startGenerationTask()
      └─ runGenerationTask()          register the selected runner
         ├─ remote: chatInferenceStream()
         └─ local:  localInference()
```

`regenerateResponse()` and `continueResponse()` reserve/capture through `Inference.beginGeneration()`, then call `startGenerationTask()` directly. Regenerate starts with an empty buffer or retained prefix; Continue starts with the existing response. Neither overwrites saved text at startup.

## Remote call chain

```text
chatInferenceStream(generationId, inputs)
├─ obtainFields()                     Inference.ts
│  └─ prepareGenerationContext()      token counts, formatting, messages, data sources
└─ buildAndSendRequest()
   ├─ buildContext() → collectContext()
   ├─ buildRequest()                  provider payload + sampler mapping
   └─ readableStreamResponse() → SSEFetch.start()
      OR hordeResponse()             submit + poll

stream callbacks
├─ onData() → appendGeneration()     output belongs to this generation/swipe
└─ stopGenerating(reason) → finishGeneration()
```

Successful remote output can schedule a title task after persistence. The title inherits the parent's inputs and completed conversation, with title-specific sampler overrides.

Example with remote concurrency enabled:

```text
Chat A: Model A / User 1 → stream A ─────────→ save A → deferred title A
Chat B: Model B / User 2 →      stream B ─────────────→ save B

Title A still uses Model A / User 1.
Stopping Chat A aborts its foreground controller; Chat B continues.
```

## Local call chain

```text
localInference(generationId, inputs)
├─ verifyModelLoaded()               load linked/last model if required
│  └─ model.load() → runLocalModelOperation()
├─ activateLocalTokenizer()
├─ buildLocalPayload()
│  ├─ obtainFields()                 LocalInference.ts; uses prepareGenerationContext()
│  └─ buildChatCompletionContext() + native model template
│     OR buildTextCompletionContext()
├─ optional KV validation/load       wait for mismatch confirmation if required
├─ runLocalCompletion()
│  └─ model.completion()
│     ├─ token callback → stop filter → appendGeneration()
│     ├─ completion callback → timings
│     └─ optional KV save
└─ finally → finishGeneration(reason)
```

Example:

```text
Load model A → prepare Chat A → native completion → save → release generation
                               ↑
                    Chat B local request is blocked
```

Loads/unloads use a separate serial queue to limit allocation overlap. A model switch unloads the old model and loads the new model/projector within one queue entry.

## Shared persistence and display handoff

```text
finishGeneration()
└─ saveGeneration()
   ├─ updateSwipe()                  save output/timings; preserve original if no output
   ├─ publishDatabaseChanges()       synchronously refresh affected live-query snapshots
   ├─ removeGenerationOutput()       UI now reads committed database text
   └─ releaseGenerationRuntime()     release chat lease and resolve runtime.done
```

Save failure retains output and the lease for retry. Completion requires no UI acknowledgment, repaint delay, or text comparison.

`abortGeneration(chatId)` aborts that chat's controller. Local execution also calls `stopCompletion()` when native completion is running. Partial output is saved.

## Deferred tasks and service lifetime

```text
scheduleDeferredTask(chatId, run, { mode, kind })
├─ create reactive task record       pending
└─ runGenerationTask()               register queue time with native service
   └─ runPendingDeferredTasks()
      ├─ no capacity: remain pending
      └─ capacity available: running → execute → terminal status
```

-   Pending tasks consume no inference capacity. Foreground requests take priority over pending tasks.
-   Cancellation signals the task. Running work remains `cancelling` and retains capacity until it settles.
-   Execution timeout defaults to two minutes; queue timeout is optional.
-   `useDeferredTasks(chatId)` lists records. `useDeferredTask(id)` exposes the record, cancellation, and dismissal.
-   `service.ts` tracks promises covering queued and executing work. It stops the native service after all registered work settles.

## Capacity and ownership

-   One foreground generation per chat, including chats sharing a character.
-   Remote concurrency defaults on; local generation remains limited to one.
-   Foreground requests are blocked when capacity is unavailable.
-   Engine generation code owns execution, output, and cancellation. Chat code owns persistence and mutation leases; it does not import the engine.
