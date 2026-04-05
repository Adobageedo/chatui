# Architecture Guide

A comprehensive guide to understanding the ChatUI architecture, design patterns, and codebase organization.

## Table of Contents

- [Overview](#overview)
- [Architectural Patterns](#architectural-patterns)
- [Project Structure](#project-structure)
- [Core Systems](#core-systems)
- [Data Flow](#data-flow)
- [Key Components](#key-components)
- [Configuration System](#configuration-system)
- [Security](#security)

## Overview

ChatUI is built using a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (React Components + Hooks)       │
├─────────────────────────────────────┤
│         Client Services             │
│   (API Clients + Adapters)          │
├─────────────────────────────────────┤
│           API Routes                │
│      (Next.js Route Handlers)       │
├─────────────────────────────────────┤
│        Business Logic               │
│       (Service Layer)               │
├─────────────────────────────────────┤
│         Data Layer                  │
│  (Supabase DB + Storage + Auth)     │
└─────────────────────────────────────┘
```

## Architectural Patterns

### 1. Service Layer Pattern

**Server-Side Services** (`service/api/`)
- Encapsulate business logic
- Handle data validation
- Manage database operations
- Keep API routes thin

**Client-Side Services** (`lib/api/`)
- Abstract HTTP requests
- Provide type-safe interfaces
- Handle client-side caching
- Centralize error handling

Example:
```typescript
// Server Service
class ThreadService {
  async createThread(userId: string, data: CreateThreadRequest) {
    // Validation, business logic, DB operations
  }
}

// Client Service
class ThreadService {
  async createThread(externalId: string) {
    return apiClient.post(API_ROUTES.threads.base, { localId: externalId });
  }
}
```

### 2. Adapter Pattern

Adapters (`lib/chat/*-adapter.ts`) bridge assistant-ui with our backend:

```typescript
// Adapter abstracts implementation details
export const threadListAdapter = {
  async list() {
    const { threads } = await threadService.listThreads();
    return { threads: threads.map(transformToUIFormat) };
  }
}
```

**Why?** Decouples UI library from backend implementation.

### 3. Context + Hooks Pattern

Global state managed via React Context, accessed through custom hooks:

```typescript
// Context provides state
<AuthProvider>
  <App />
</AuthProvider>

// Hooks provide interface
const { user, login, logout } = useAuth();
```

### 4. Middleware Pattern

Next.js middleware for server-side concerns:
- Authentication checks
- Route protection
- Redirect logic

```typescript
// middleware.ts - runs on every request
export async function middleware(request: NextRequest) {
  const user = await getUser();
  if (!user && isProtectedRoute) {
    return redirect('/login');
  }
}
```

## Project Structure

### Directory Organization

```
chatui/
├── app/                    # Next.js App Router (Routes + Layouts)
│   ├── (auth)/            # Auth route group
│   ├── api/               # API endpoints
│   └── chat/              # Main chat UI
├── components/            # Reusable UI components
├── config/                # Centralized configuration
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Client-side utilities
│   ├── api/              # Client API services
│   ├── auth/             # Auth client logic
│   ├── chat/             # Chat adapters
│   └── supabase/         # Supabase clients
└── service/              # Server-side services
    └── api/              # Business logic layer
```

### File Naming Conventions

- **Components**: PascalCase - `AuthGuard.tsx`
- **Services**: camelCase.service.ts - `thread.service.ts`
- **Types**: camelCase.types.ts - `auth.types.ts`
- **Hooks**: camelCase starting with 'use' - `useAuth.ts`
- **Config**: camelCase.config.ts - `app.config.ts`
- **Adapters**: kebab-case-adapter.ts - `thread-list-adapter.ts`

## Core Systems

### 1. Authentication System

**Components:**
- `lib/auth/auth.service.ts` - Client auth operations
- `service/api/shared/auth.middleware.ts` - Server auth verification
- `contexts/AuthContext.tsx` - Global auth state
- `hooks/useAuth.ts` - Auth operations hook
- `middleware.ts` - Route protection

**Flow:**
```
User Signup → Email Verification → Onboarding → Protected App
            ↓
      Session Created
            ↓
      Activity Tracked
            ↓
   30min Timeout → Auto Logout
```

**Session Management:**
```typescript
// lib/auth/session.service.ts
class SessionService {
  private INACTIVITY_TIMEOUT = APP_CONFIG.auth.sessionTimeout;
  
  startMonitoring(onTimeout: () => void) {
    // Track user activity
    // Trigger logout on inactivity
  }
}
```

### 2. Chat System

**Components:**
- `app/api/chat/route.ts` - Streaming endpoint
- `service/api/chat/chat.service.ts` - AI integration
- `lib/chat/chat-model-adapter.ts` - Stream handling
- `components/assistant-ui/` - Chat UI

**Streaming Flow:**
```
User Message → API Route → Chat Service → OpenAI API
                                            ↓
                                      Stream Response
                                            ↓
                          Adapter → UI Update (Real-time)
```

**Tool Calling:**
```typescript
// service/api/chat/chat.service.ts
const tools = {
  get_weather: tool({
    description: "Get weather for location",
    parameters: z.object({ location: z.string() }),
    execute: async ({ location }) => {
      // Tool logic
    }
  })
}
```

### 3. Thread Management

**Components:**
- `lib/api/thread.service.ts` - Client operations
- `service/api/threads/` - Server business logic
- `lib/chat/thread-list-adapter.ts` - UI integration

**Operations:**
- Create thread
- List threads (active/archived)
- Update thread (rename)
- Delete thread
- Archive/Unarchive
- Store messages

**Message History:**
```typescript
// lib/chat/thread-history-adapter.ts
export function useThreadHistoryAdapter() {
  return {
    async load() {
      // Load messages from DB
    },
    async append(message) {
      // Save message to DB
    }
  }
}
```

### 4. File Upload System

**Components:**
- `app/api/upload/route.ts` - Upload endpoint
- `service/api/storage/storage.service.ts` - Supabase storage
- `lib/api/upload.service.ts` - Client upload
- `lib/chat/attachment-adapter.ts` - File handling in chat

**Upload Flow:**
```
User Select File → Upload Service → API Route → Storage Service
                                                      ↓
                                              Supabase Storage
                                                      ↓
                                              Return URL
                                                      ↓
                                        Attach to Message
```

## Data Flow

### Request Flow Example (Create Thread)

```
1. User Action (Chat Component)
   ↓
2. Hook Call (useThread)
   ↓
3. Client Service (threadService.createThread)
   ↓
4. HTTP Request (POST /api/threads)
   ↓
5. API Route (app/api/threads/route.ts)
   ↓
6. Auth Middleware (verify user)
   ↓
7. Server Service (threadService.createThread)
   ↓
8. Database Insert (Supabase)
   ↓
9. Response Chain (reverse order)
   ↓
10. UI Update (React state)
```

### Real-time Streaming (Chat)

```
1. User sends message
   ↓
2. POST /api/chat
   ↓
3. Chat Service streams from OpenAI
   ↓
4. Response.body (ReadableStream)
   ↓
5. Chat Model Adapter reads stream
   ↓
6. UI updates in real-time (assistant-ui)
   ↓
7. Message saved to DB on completion
```

## Key Components

### API Client (`lib/api/api-client.ts`)

Centralized HTTP client with error handling:

```typescript
class ApiClient {
  async get<T>(url: string): Promise<T>
  async post<T>(url: string, data?: unknown): Promise<T>
  async put<T>(url: string, data?: unknown): Promise<T>
  async delete<T>(url: string): Promise<T>
  async postFormData<T>(url: string, formData: FormData): Promise<T>
}
```

**Features:**
- Automatic JSON parsing
- Error handling
- Type safety
- FormData support

### Auth Middleware (`service/api/shared/auth.middleware.ts`)

Server-side authentication verification:

```typescript
class AuthMiddleware {
  static async verifyAuth(): Promise<AuthContext> {
    const user = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();
    return { userId: user.id };
  }
}
```

**Usage in API routes:**
```typescript
export async function POST(req: Request) {
  const auth = await AuthMiddleware.verifyAuth();
  // auth.userId available
}
```

### Protected Route Guard (`components/auth/ProtectedRoute.tsx`)

Client-side route protection:

```typescript
export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (!user.onboarding_completed) return <Navigate to="/onboarding" />;
  
  return children;
}
```

## Configuration System

### Centralized Config (`config/`)

All constants and settings in one place:

**app.config.ts** - Application settings
```typescript
export const APP_CONFIG = {
  auth: {
    sessionTimeout: 30 * 60 * 1000,
    redirectUrls: { ... }
  },
  upload: {
    maxFileSize: 50 * 1024 * 1024,
    acceptedFileTypes: "image/*,..."
  },
  ai: {
    defaultModel: "gpt-4o",
    maxSteps: 10
  }
}
```

**api.config.ts** - API routes
```typescript
export const API_ROUTES = {
  chat: "/api/chat",
  threads: {
    base: "/api/threads",
    byId: (id: string) => `/api/threads/${id}`,
    messages: (id: string) => `/api/threads/${id}/messages`
  }
}
```

**env.config.ts** - Environment variables
```typescript
export const ENV = {
  supabase: {
    url: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
}
```

**Benefits:**
- Single source of truth
- Type-safe access
- Easy to modify
- Self-documenting

## Security

### Authentication Security

1. **Server-side validation** - All API routes protected
2. **Token verification** - `getUser()` vs `getSession()`
3. **Route protection** - Middleware + client guards
4. **Auto-logout** - 30-minute inactivity timeout

### Data Security

1. **Row Level Security (RLS)** - Supabase policies
2. **Type validation** - Zod schemas on inputs
3. **Error handling** - No sensitive data in errors
4. **HTTPS only** - In production

### Best Practices

```typescript
// ✅ Good - Server validation
const auth = await AuthMiddleware.verifyAuth();
const thread = await threadService.getThread(threadId, auth.userId);

// ❌ Bad - Trust client data
const thread = await threadService.getThread(req.body.threadId);
```

## Performance Optimizations

1. **Streaming** - Real-time AI responses without blocking
2. **Code splitting** - Route-based code splitting
3. **Client caching** - React Query (future enhancement)
4. **Database indexes** - On user_id, thread_id fields
5. **Edge runtime** - For API routes where possible

## Error Handling

### Custom Error Classes

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
  }
}
```

### Centralized Error Responses

```typescript
// service/api/shared/api-response.ts
export class ApiResponseBuilder {
  static error(message: string, statusCode: number, details?: unknown) {
    return NextResponse.json({ error: message, details }, { status: statusCode });
  }
}
```

## Testing Strategy

### Recommended Approach

1. **Unit Tests** - Service layer logic
2. **Integration Tests** - API routes
3. **E2E Tests** - Critical user flows
4. **Type Tests** - TypeScript strict mode

### Example Test Structure

```typescript
describe('ThreadService', () => {
  it('should create thread with valid data', async () => {
    const thread = await threadService.createThread(userId, data);
    expect(thread).toHaveProperty('id');
  });
  
  it('should throw on invalid data', async () => {
    await expect(
      threadService.createThread(userId, invalidData)
    ).rejects.toThrow(ValidationError);
  });
});
```

## Extension Points

### Adding a New Feature

1. **Define types** - Create `*.types.ts`
2. **Server service** - Add to `service/api/`
3. **API route** - Create in `app/api/`
4. **Client service** - Add to `lib/api/`
5. **Hook** - Create custom hook if needed
6. **Components** - Build UI
7. **Config** - Add constants to `config/`

### Adding a New AI Tool

```typescript
// service/api/chat/chat.service.ts
const myTool = tool({
  description: "My custom tool",
  parameters: z.object({ param: z.string() }),
  execute: async ({ param }) => {
    // Implementation
  }
});

// Add to tools object in streamChat method
```

### Adding a New Adapter

```typescript
// lib/chat/my-adapter.ts
export const myAdapter: AdapterType = {
  async operation() {
    const data = await myService.getData();
    return transformForUI(data);
  }
}
```

---

**For more information:**
- [README.md](./README.md) - Setup and quickstart
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [CONFIG_GUIDE.md](./CONFIG_GUIDE.md) - Configuration details
