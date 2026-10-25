# Rework chunks and naming decisions

This is a working plan for organizing the app a piece at a time. Each chunk gives you one area to think about, a small set of terms to settle, and a concrete stopping point. Suggested names are editable proposals.

Start with chunk 1. Leave later decisions open until you reach that area. The chunks describe future work; this document does not change application code. Onboarding remains outside the scope.

## A local pattern to reuse: the lorebooks split

**Yes: the current `lib/state/lorebooks/` structure is a practical starting point for the other large state modules.** You do not need to adopt a new folder taxonomy or rename everything to repositories first. Start by separating responsibilities using the pattern already present in the app.

Reading the current files, the useful separation is:

| File | Current responsibility | Rule for applying it elsewhere |
| --- | --- | --- |
| `db.ts` | SQLite queries, mutations, and query builders for live reads | Own persistent record access; avoid pickers, navigation, toasts, and selection-store reads |
| `state.ts` | Zustand insertion preferences, persisted through MMKV | Own observable state and direct state actions; MMKV persistence can stay here |
| `schema.ts` | Lorebook import validation and associated types | Own external input validation; this is separate from the SQLite schema in `db/schema.ts` |
| `index.ts` | Exposes `Lorebooks.db` and coordinates picking, validation, import, export, and feedback | Provide the feature entry point and a few named workflows |

Call the last category **operations**, rather than “general functions.” `importFromJSON` is a specific workflow: pick a file → validate → persist → report the result. That gives it a clear home. Pure transformations, database writes, and unrelated helpers should not all accumulate in the index.

### Two refinements before copying it

First, keep dependencies pointing inward. UI can call the feature entry point; operations can call `db.ts`, `state.ts`, and schemas. Internal files should import siblings directly rather than importing their own `index.ts`. In lorebooks, `exportToJSON` currently uses the sibling `db` import while import uses `Lorebooks.db`; consistently using `dbInternal` inside these workflows would make the internal dependency clearer. The public `Lorebooks.db` API can remain.

Second, keep `index.ts` small. Its current two workflows are understandable there. When workflows grow, move them into `operations.ts` or focused files such as `importLorebook.ts`, and export them through the index. This is a size/responsibility decision, not a requirement to turn every index into an empty barrel.

The existing `db.query` / `db.mutate` / `db.live` grouping is reasonable to retain. Here, `live` returns query builders for the hooks; it does not itself own subscriptions. Reuse shared query definitions where useful so immediate reads and live reads do not become separately maintained versions of the same query.

### Where the pattern fits

| Existing module | Small next rework | What to avoid |
| --- | --- | --- |
| `Characters.ts` | `characters/db.ts`, `state.ts`, `schema.ts`, and import/export operations behind `index.ts` | Moving all image, conversion, and workflow code into another huge index |
| `Chat.ts` | `chat/db.ts`, `state.ts`, and a small public entry point | Treating generation lifecycle and notifications as generic chat-state helpers; give them separate owners in chunk 3 |
| `Instructs.ts` | Separate database access, selected-format state, and import/export operations | Combining prompt construction with persistence just because both use formatting data |
| `AuthorNotes.ts` | Keep the database module focused; group its existing editor state from `state/components/AuthorNotes.tsx` only if that clarifies ownership | Inventing empty state/schema/operation files to match a template |
| `CharacterLinks.ts` | Keep as a focused database module, or place under its owning feature | Splitting a small, single-purpose module into several layers |
| `SamplerState.ts` / connection state | Separate Zustand/MMKV state from import and cross-feature operations | Adding `db.ts` for records that are actually persisted by the store in MMKV |

A store action that updates one preference belongs in `state.ts`. An action that removes a sampling preset **and** repairs character links crosses storage/feature boundaries and is better expressed as a named operation calling both modules. State actions may still load data through `db.ts` where useful; the goal is explicit ownership, not a ban on asynchronous store actions.

### First small change to try

Apply the lorebooks pattern to **chat database access only**. Create `lib/state/chat/db.ts`, move the existing database namespace, and keep the current public API available through an adapter. Stop there and assess whether navigation through the code is easier. No directory-wide renaming or feature-root migration is necessary for this experiment.

**Your decisions:**

- Reuse `db.ts` / `state.ts` / `schema.ts` where needed: **[yes / adjust]**
- Keep the namespaced public API, such as `Chats.db`: **[keep for now / change later]**
- Workflow placement: **[small workflows in index; extract as they grow / always operations.ts]**

The chunks below use this as their starting pattern. “Repository” describes the role of `db.ts`; it does not require a file literally named `chatRepository.ts`.

## 1. Give chat storage its own home

**Problem:** `lib/state/Chat.ts` contains database access alongside selection state, generation state, and notifications. It is difficult to find the right place for a chat change.

**Rework:** Extract the existing chat queries and mutations into `lib/state/chat/db.ts`, following lorebooks. Keep their behavior and existing names initially. Leave selection and generation state where they are until later chunks. A repository here just means a module containing persistent reads and writes.

Settle only these terms:

| Concept | Suggested name | Meaning |
| --- | --- | --- |
| Saved exchange | Chat | One saved exchange associated with a character |
| Contribution in that exchange | Message | A participant's message, which can contain alternative versions |
| Alternative version | Swipe | One version of a message; one swipe is selected |

Keeping **chat** and **swipe** is a reasonable default because they are already established in the app. Renaming them to conversation and variant is optional, not a prerequisite for extraction.

**Your decisions:**

- Chat or conversation: **[choose]**
- Swipe or variant: **[choose]**
- Database module: **[chat/db.ts, matching lorebooks / other]**

**Done when:** Database operations have one obvious home, and callers can use them without importing generation state. Any structural defects discovered during extraction become separate fixes.

## 2. Put sending a message behind one operation

**Problem:** The chat input component coordinates persistence and starts generation. Its name also describes a text field more narrowly than the interface it contains.

**Rework:** Extract a `sendMessage` operation from `ChatInput/index.tsx`. Let the component collect input and invoke it. Keep rendering, attachment picking, and keyboard handling in the UI for this chunk.

Use these terms:

- **Composer:** The complete interface for writing a message, attaching media, and sending it.
- **Draft:** Text and selected attachments before submission.
- **Send message:** The application operation that saves the submitted message and starts the response workflow.

**Your decisions:**

- Whole component name: **[ChatComposer / keep ChatInput / other]**
- Draft ownership: **[component state / dedicated store]**

**Done when:** The UI has one send entry point, and the sequence of work is readable in one place. Existing submission-ordering issues from `REVIEW.md` can be addressed in a focused follow-up or explicitly included in this rework.

**Depends on:** Chunk 1, so the operation has a clear persistence API to call.

## 3. Give one generation an owner

**Problem:** `Inference.ts`, `LocalInference.ts`, and `useInference` divide responsibility for request preparation, output, cancellation, and saving. It is hard to tell which part owns a running response.

**Rework:** Introduce one generation coordinator shared by local and remote execution. Move lifecycle ownership into it while retaining provider-specific payload and execution code in their existing modules at first.

Use these terms:

- **Generation:** Producing model output for one request.
- **Generation session:** The running operation, including its target chat/swipe, captured inputs, output, and status.
- **Cancel:** Ask execution to stop.
- **Finalize:** Save the outcome and release the session after success, cancellation, or failure.

**Your decisions:**

- General term: **[generation / inference]**
- Owner name: **[generationCoordinator / other]**
- Session state name: **[GenerationSessionState / other]**

**Done when:** A reader can identify who starts, cancels, and finalizes a generation without tracing callbacks through the entire app. This is a larger chunk: do request capture first, output ownership second, and terminal handling third, as separate reviewable changes.

**Depends on:** A clear submission entry point from chunk 2.

## 4. Separate saved connections from provider templates

**Problem:** `APIValues`, `APIConfiguration`, and `APIManagerState` use “API” for several different concepts.

**Rework:** Clarify the connection module's types and exports. Separate saved connection state from the default/custom template definitions. Leave transport and prompt construction alone in this chunk.

| Concept | Suggested name | Example |
| --- | --- | --- |
| Saved endpoint, credentials, and model selection | Connection | A configured server the user can select |
| Reusable request/authentication/parsing rules | Provider template | Rules for talking to a supported service |
| Implementation that runs requests | Provider adapter | Remote transport or local runtime integration |

**Your decisions:**

- `APIValues` becomes: **[ConnectionSettings / other]**
- `APIConfiguration` becomes: **[ProviderTemplate / other]**
- Store filename becomes: **[connectionStore.ts / other]**

**Done when:** You can distinguish a saved connection from its template by reading the type names. Preserve persisted keys and imported/exported format fields; changing those requires a separate compatibility decision.

This chunk can be done independently of the chat reworks.

## 5. Separate character selection from character data

**Problem:** `Characters.ts` combines database operations, selected identities, image handling, and import/export.

**Rework:** First extract `characters/db.ts` and `characters/state.ts`, following lorebooks. Keep a compatible public entry point. Then move import/export into operations and validation into `schema.ts` in a second change. Keep image behavior intact until its ownership is explicitly addressed.

Use these terms:

- **Character:** The configured participant the model portrays.
- **User persona:** The configured identity representing the human participant.
- **Character card:** The portable character definition used for import/export.
- **Character record:** The stored application representation, including database identity and relationships.

**Your decisions:**

- Human identity term: **[user / persona / user persona]**
- Does “card” also name an editable stored record? **[yes / reserve for interchange]**

**Done when:** Loading a selected character, saving a record, and importing a card have distinct entry points and module names. There is no need to redesign the shared user/character schema as part of this extraction.

## 6. Make prompt construction a distinct area

**Problem:** Formatting, macros, token budgets, and added context are spread across engine, state, and utility modules. “Context” can mean model input or a native runtime instance.

**Rework:** Group prompt construction together. Start by choosing one macro implementation entry point and giving builders explicit inputs. Keep lorebooks and author notes as existing data-source implementations; avoid redesigning their editors here.

| Term | Meaning |
| --- | --- |
| Prompt format | Rules for turning content into structured messages or formatted text |
| Input budget | Tokens available for input after the required reservations |
| Output limit | Maximum requested generated tokens |
| Data source | A contributor of extra prompt content, such as lore or author notes |

**Your decisions:**

- `Instructs` becomes: **[PromptFormat / InstructTemplate / keep existing term]**
- Use “prompt context” for model input and “runtime context” for the native instance? **[decide]**
- Saved sampling settings are called: **[sampling preset / generation preset]**

**Done when:** Prompt builders, macro expansion, and data sources have a discoverable home, with vocabulary that distinguishes input content from runtime state.

## 7. Clean up routes and shared UI

**Problem:** Route entries, screen implementations, and reusable components all live under `app/`.

**Rework:** Move one screen's implementation outside the route tree and retain a thin wrapper at its existing route. Repeat screen by screen. Move shared controls together; keep feature-specific components beside their feature.

Settle these distinctions:

- **Route:** A navigable entry or layout.
- **Screen:** The view rendered by a route.
- **Shared control:** A reusable component with no dependency on a particular feature's state.

**Your decisions:**

- Feature implementation root: **[features/ / src/features/ / other]**
- Shared UI location: **[shared/ui/ / components/ / other]**

**Done when:** Route paths remain stable and implementation files have a predictable home. Start with one small screen before moving chat. This chunk can run independently once you choose the destination folders.

## Leave these for later

Broad casing changes, acronym spelling, replacing every `index.ts`, renaming every list item, and reorganizing all utilities can wait. Apply a simple convention when touching files: component names in PascalCase, hook names beginning with `use`, and other modules named for their responsibility.

Lorebook scan semantics, attachment ownership, backup behavior, and migration safety require their own focused reworks. Keep those in the architecture review backlog rather than turning this naming document into another full audit.

## Current working decision

Only fill in the chunk you are working on:

- **Chunk:** [number]
- **Goal for this change:** [one sentence]
- **Names settled:** [terms and definitions]
- **Files included:** [short list]
- **Deferred work:** [items deliberately left for another change]
- **Finished when:** [observable stopping point]
