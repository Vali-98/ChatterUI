# ChatterUI - Agent Development Guide

## Overview

ChatterUI is a sophisticated React Native mobile application for interacting with Large Language Models (LLMs) both locally and remotely. This document provides comprehensive guidance for AI agents working on this codebase, covering architecture, patterns, dependencies, and development practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [State Management](#state-management)
5. [Database Schema](#database-schema)
6. [Inference Engine Architecture](#inference-engine-architecture)
7. [UI Component Patterns](#ui-component-patterns)
8. [Development Guidelines](#development-guidelines)
9. [Key Dependencies](#key-dependencies)
10. [Common Patterns](#common-patterns)
11. [Testing & Quality](#testing--quality)

## Architecture Overview

ChatterUI follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│           UI Layer (app/)           │
│  - Screens, Components, Navigation  │
├─────────────────────────────────────┤
│        Business Logic (lib/)        │
│  - State Management, Engine, Utils  │
├─────────────────────────────────────┤
│        Data Layer (db/)             │
│  - Schema, Migrations, Queries      │
└─────────────────────────────────────┘
```

### Core Design Principles

1. **Modular Architecture**: Clear separation between UI, business logic, and data layers
2. **State-Driven**: Heavy reliance on Zustand for state management
3. **Type Safety**: Comprehensive TypeScript usage with strict mode enabled
4. **Performance**: Optimized for mobile with lazy loading and efficient rendering
5. **Extensibility**: Plugin-based API system for different LLM providers

## Technology Stack

### Core Framework
- **React Native 0.79.5**: Cross-platform mobile development
- **Expo SDK 53**: Development platform and build tools
- **TypeScript 5.8.3**: Type-safe JavaScript with strict mode
- **React 19.0.0**: Latest React with experimental compiler

### State Management
- **Zustand 5.0.4**: Lightweight state management with persistence
- **MMKV**: High-performance key-value storage for persistence
- **React Compiler**: Experimental React optimization

### Database & Storage
- **Drizzle ORM 0.36.2**: Type-safe SQL ORM
- **SQLite**: Local database via expo-sqlite
- **MMKV**: Fast key-value storage for app state

### UI & Styling
- **React Native Reanimated 4.0.0**: High-performance animations
- **React Native Gesture Handler**: Touch gesture management
- **Expo Vector Icons**: Icon library
- **Custom Theme System**: Dynamic theming with color schemes

### LLM Integration
- **cui-llama.rn 1.7.11**: Custom React Native wrapper for llama.cpp
- **Custom API Builder**: Flexible API integration system
- **Streaming Support**: Real-time response streaming

## Project Structure

```
├── app/                          # UI Layer
│   ├── components/              # Reusable UI components
│   │   ├── buttons/            # Button components
│   │   ├── input/              # Input components
│   │   ├── text/               # Text components
│   │   └── views/              # Complex view components
│   ├── screens/                # Screen components
│   │   ├── ChatScreen/         # Chat interface
│   │   ├── CharacterListScreen/ # Character management
│   │   ├── ModelManagerScreen/ # Model management
│   │   └── ...                 # Other screens
│   ├── _layout.tsx             # Root layout
│   └── index.tsx               # Entry point
├── lib/                         # Business Logic Layer
│   ├── state/                  # Zustand stores
│   ├── engine/                 # LLM inference engine
│   │   ├── API/                # Remote API integration
│   │   └── Local/              # Local inference
│   ├── theme/                  # Theming system
│   ├── storage/                # Storage utilities
│   ├── utils/                  # Utility functions
│   ├── constants/              # App constants
│   ├── hooks/                  # Custom React hooks
│   └── enums/                  # Type definitions
├── db/                          # Data Layer
│   ├── schema.ts               # Database schema
│   ├── db.ts                   # Database connection
│   └── migrations/             # Database migrations
└── assets/                      # Static assets
```

## State Management

### Zustand Pattern

The application uses **Zustand** extensively for state management with a consistent pattern:

```typescript
// Store Definition
export const useStoreName = create<StoreType>()(
    persist(
        (set, get) => ({
            // State properties
            data: initialValue,
            
            // Actions
            setData: (newData) => set({ data: newData }),
            
            // Async actions
            loadData: async () => {
                const result = await apiCall()
                set({ data: result })
            }
        }),
        {
            name: Storage.StoreName,
            storage: createMMKVStorage(),
            partialize: (state) => ({ data: state.data }),
            version: 1,
        }
    )
)

// Hook for components
export const useStoreName = () => {
    const { data, setData } = useStoreNameStore(
        useShallow((state) => ({
            data: state.data,
            setData: state.setData,
        }))
    )
    return { data, setData }
}
```

### Key State Stores

1. **Chat State** (`lib/state/Chat.ts`): Manages chat messages, swipes, and conversation flow
2. **Character State** (`lib/state/Characters.ts`): Handles character cards and metadata
3. **App Mode** (`lib/state/AppMode.ts`): Toggles between local and remote inference
4. **Theme State** (`lib/theme/ThemeManager.ts`): Manages color schemes and theming
5. **Sampler State** (`lib/state/SamplerState.ts`): LLM parameter configuration
6. **TTS State** (`lib/state/TTS.ts`): Text-to-speech functionality

### Persistence Strategy

- **MMKV**: Fast, synchronous key-value storage for app state
- **SQLite**: Structured data storage for chats, characters, and models
- **File System**: Model files and media assets

## Database Schema

### Core Entities

The database follows a **relational model** with these main entities:

#### Characters Table
```typescript
characters: {
    id: number (primary key)
    type: 'user' | 'character'
    name: string
    description: string
    first_mes: string
    mes_example: string
    system_prompt: string
    scenario: string
    personality: string
    // ... other character fields
}
```

#### Chats & Messages
```typescript
chats: {
    id: number (primary key)
    character_id: number (foreign key)
    name: string
    last_modified: timestamp
}

chat_entries: {
    id: number (primary key)
    chat_id: number (foreign key)
    is_user: boolean
    name: string
    order: number
    swipe_id: number
}

chat_swipes: {
    id: number (primary key)
    entry_id: number (foreign key)
    swipe: string
    timings: CompletionTimings
}
```

#### Models & Lorebooks
```typescript
model_data: {
    id: number (primary key)
    file: string (unique)
    name: string
    file_path: string
    context_length: number
    architecture: string
    // ... model metadata
}

lorebooks: {
    id: number (primary key)
    name: string
    description: string
    scanDepth: number
    tokenBudget: number
}
```

### Relationships

- **Characters** → **Chats** (one-to-many)
- **Chats** → **Chat Entries** (one-to-many)
- **Chat Entries** → **Chat Swipes** (one-to-many)
- **Characters** → **Tags** (many-to-many via character_tags)
- **Characters** → **Lorebooks** (many-to-many via character_lorebooks)

## Inference Engine Architecture

### Dual-Mode Architecture

The app supports two inference modes:

#### 1. Local Mode (`lib/engine/Local/`)
- **LlamaLocal.ts**: Main local inference controller
- **Model.ts**: Model management and loading
- **GGML.ts**: GGML file format handling
- Uses **cui-llama.rn** wrapper for llama.cpp

#### 2. Remote Mode (`lib/engine/API/`)
- **APIBuilder.ts**: Request construction and sending
- **ContextBuilder.ts**: Prompt context building
- **DefaultAPI.ts**: Predefined API configurations
- **RequestBuilder.ts**: HTTP request formatting

### API Integration System

The remote API system is highly flexible with:

```typescript
interface APIConfiguration {
    name: string
    defaultValues: APIValues
    features: APIFeatures
    request: RequestConfiguration
    payload: PayloadConfiguration
    model: ModelConfiguration
    ui: UIConfiguration
}
```

**Supported APIs:**
- OpenAI, Claude, Cohere
- Open Router, Mancer, AI Horde
- KoboldCPP, Text Generation WebUI, Ollama
- Generic text/chat completion endpoints

### Context Building

The `ContextBuilder` handles prompt construction with:
- **System prompts**: Character and user context
- **Message history**: Conversation context with token limits
- **Multimodal support**: Images and audio integration
- **Macro replacement**: Dynamic content substitution

## UI Component Patterns

### Component Architecture

#### 1. Screen Components
Located in `app/screens/`, each screen is self-contained with:
- Main screen component
- Sub-components in dedicated folders
- Screen-specific state management
- Navigation integration

#### 2. Reusable Components
Located in `app/components/`, organized by type:
- **views/**: Complex UI components (Alert, Drawer, PopupMenu)
- **buttons/**: Button variants (ThemedButton, HeartbeatButton)
- **input/**: Input components
- **text/**: Text display components

#### 3. Component Patterns

```typescript
// Standard component structure
const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
    const { color, spacing } = Theme.useTheme()
    const storeData = useStoreName()
    
    return (
        <View style={styles.container}>
            {/* Component content */}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        // Styles
    }
})
```

### Theming System

The app uses a sophisticated theming system:

```typescript
// Theme usage in components
const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

// Color schemes are defined in ThemeColor.ts
// Support for custom color schemes
// Dynamic theme switching
```

### Animation & Gestures

- **React Native Reanimated**: For complex animations
- **Gesture Handler**: For touch interactions
- **Keyboard Controller**: For keyboard-aware layouts

## Development Guidelines

### Code Style & Standards

1. **TypeScript Strict Mode**: All code must be type-safe
2. **ESLint Configuration**: Enforces code quality rules
3. **Prettier**: Consistent code formatting
4. **React Compiler**: Experimental optimization (enabled)

### File Naming Conventions

- **Components**: PascalCase (e.g., `ChatBubble.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useChatState`)
- **Stores**: camelCase (e.g., `useChatStore`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `GLOBAL_VALUES`)
- **Types**: PascalCase (e.g., `ChatEntry`)

### Import Organization

```typescript
// 1. React/React Native imports
import React from 'react'
import { View, Text } from 'react-native'

// 2. Third-party libraries
import { create } from 'zustand'

// 3. Internal imports (using path aliases)
import { Theme } from '@lib/theme/ThemeManager'
import { Chats } from '@lib/state/Chat'

// 4. Relative imports
import ChatBubble from './ChatBubble'
```

### Path Aliases

Configured in `tsconfig.json`:
- `@components/*` → `app/components/*`
- `@screens/*` → `app/screens/*`
- `@lib/*` → `lib/*`
- `@assets/*` → `assets/*`
- `@db` → `db/db`

## Key Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native` | 0.79.5 | Mobile framework |
| `expo` | 53.0.16 | Development platform |
| `typescript` | 5.8.3 | Type safety |
| `zustand` | 5.0.4 | State management |
| `drizzle-orm` | 0.36.2 | Database ORM |
| `react-native-mmkv` | 3.1.0 | Fast storage |
| `cui-llama.rn` | 1.7.11 | Local LLM inference |

### UI & Animation

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-reanimated` | 4.0.0 | Animations |
| `react-native-gesture-handler` | 2.24.0 | Touch gestures |
| `react-native-keyboard-controller` | 1.17.5 | Keyboard handling |
| `@shopify/flash-list` | 1.7.6 | Performance lists |
| `react-native-svg` | 15.11.2 | Vector graphics |

### Development Tools

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | 8.56.0 | Code linting |
| `prettier` | 3.2.4 | Code formatting |
| `patch-package` | 8.0.0 | Dependency patching |
| `drizzle-kit` | 0.31.1 | Database migrations |

## Common Patterns

### 1. Store Creation Pattern

```typescript
export const useStoreName = create<StoreType>()(
    persist(
        (set, get) => ({
            // State and actions
        }),
        {
            name: Storage.StoreName,
            storage: createMMKVStorage(),
            partialize: (state) => ({ /* selective persistence */ }),
            version: 1,
        }
    )
)
```

### 2. Component Hook Pattern

```typescript
export const useComponentName = () => {
    const { data, actions } = useStoreNameStore(
        useShallow((state) => ({
            data: state.data,
            actions: state.actions,
        }))
    )
    return { data, actions }
}
```

### 3. API Integration Pattern

```typescript
const apiConfig: APIConfiguration = {
    name: 'ProviderName',
    defaultValues: { /* default settings */ },
    features: { /* feature flags */ },
    request: { /* request configuration */ },
    payload: { /* payload structure */ },
    model: { /* model handling */ },
    ui: { /* UI configuration */ }
}
```

### 4. Database Query Pattern

```typescript
// Using Drizzle ORM
const result = await db.query.characters.findMany({
    with: {
        tags: true,
        chats: {
            orderBy: desc(chats.last_modified),
            limit: 10
        }
    }
})
```

### 5. Error Handling Pattern

```typescript
try {
    const result = await riskyOperation()
    return result
} catch (error) {
    Logger.error('Operation failed', error)
    Logger.errorToast('User-friendly error message')
    throw error
}
```

## Testing & Quality

### Code Quality Tools

1. **ESLint**: Enforces coding standards
2. **Prettier**: Consistent formatting
3. **TypeScript**: Compile-time type checking
4. **React Compiler**: Experimental optimization

### Development Workflow

1. **Local Development**: `npm run start` (Expo development server)
2. **Android Build**: `npm run android`
3. **iOS Build**: `npm run ios` (currently unavailable)
4. **Linting**: `npm run lint`
5. **Database Migrations**: `npm run migrate`

### Performance Considerations

1. **Lazy Loading**: Components and screens loaded on demand
2. **Memoization**: React.memo and useMemo for expensive operations
3. **Virtual Lists**: FlashList for large datasets
4. **Background Processing**: React Native Background Actions
5. **Storage Optimization**: MMKV for fast key-value operations

## Best Practices for Agents

### When Making Changes

1. **Always use TypeScript**: Ensure type safety
2. **Follow existing patterns**: Maintain consistency
3. **Update related stores**: Consider state dependencies
4. **Test thoroughly**: Verify functionality across modes
5. **Consider performance**: Mobile performance is critical

### Common Pitfalls to Avoid

1. **Direct state mutation**: Always use Zustand actions
2. **Missing error handling**: Wrap async operations
3. **Memory leaks**: Clean up subscriptions and timers
4. **Breaking changes**: Maintain backward compatibility
5. **Performance regressions**: Profile before and after changes

### Debugging Tips

1. **Use Logger**: Centralized logging system
2. **React DevTools**: For component debugging
3. **Flipper**: For network and performance debugging
4. **Expo DevTools**: For development debugging
5. **Database Studio**: For data inspection

## Conclusion

ChatterUI is a well-architected React Native application with clear separation of concerns, robust state management, and flexible LLM integration. The codebase follows modern React Native patterns and is designed for maintainability and extensibility.

When working on this codebase, prioritize:
- **Type safety** and **code quality**
- **Performance** and **user experience**
- **Consistency** with existing patterns
- **Thorough testing** of changes
- **Documentation** of new features

This architecture supports both local and remote LLM inference, making it a versatile platform for AI-powered chat applications.