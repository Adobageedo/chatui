# Contributing Guide

Welcome! This guide will help you understand how to develop, extend, and contribute to the ChatUI project.

## Table of Contents

- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Adding New Features](#adding-new-features)
- [Common Tasks](#common-tasks)
- [Best Practices](#best-practices)
- [Debugging](#debugging)

## Development Setup

### Prerequisites

```bash
# Required
Node.js 18+
npm or yarn
Git

# Recommended
VS Code with extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
```

### First-Time Setup

1. **Clone and install**
```bash
git clone <repo-url>
cd chatui/chatui
npm install
```

2. **Configure environment**
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

3. **Set up Supabase**
- Follow database setup in README.md
- Configure storage bucket
- Set up Row Level Security policies

4. **Start development server**
```bash
npm run dev
```

### Development Workflow

```bash
# Start dev server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Run production build locally
npm start
```

## Code Standards

### TypeScript

- **Strict mode enabled** - All code must pass TypeScript strict checks
- **Explicit types** - Avoid `any`, use proper types
- **Interface over type** - Use interfaces for object shapes
- **Type exports** - Export types from `*.types.ts` files

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### File Organization

```typescript
// Service file structure
import statements
import { CONFIG } from '@/config'; // Config first
import types
import utilities

class MyService {
  private readonly config;
  
  constructor() { }
  
  // Public methods first
  async publicMethod() { }
  
  // Private methods last
  private privateMethod() { }
}

export const myService = MyService.getInstance();
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AuthGuard.tsx` |
| Hooks | camelCase with 'use' prefix | `useAuth.ts` |
| Services | camelCase.service.ts | `thread.service.ts` |
| Types | camelCase.types.ts | `auth.types.ts` |
| Config | camelCase.config.ts | `app.config.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Functions | camelCase | `createThread()` |
| Variables | camelCase | `userId` |

### Imports

```typescript
// Order: External → Internal → Types → Styles
import { useState } from 'react';
import { NextRequest } from 'next/server';

import { API_ROUTES, APP_CONFIG } from '@/config';
import { threadService } from '@/lib/api/thread.service';
import { authService } from '@/lib/auth/auth.service';

import type { User } from '@/lib/auth/auth.types';

import './styles.css';
```

### Error Handling

```typescript
// ✅ Use custom error classes
throw new ValidationError("Invalid input");
throw new UnauthorizedError("Not authenticated");

// ✅ Catch and log properly
try {
  await operation();
} catch (error) {
  console.error("Operation failed:", error);
  throw error; // Re-throw if not handled
}

// ❌ Don't swallow errors silently
try {
  await operation();
} catch (error) {
  // Silent fail - bad!
}
```

## Adding New Features

### Step-by-Step Guide

#### 1. Define the Feature

Create a brief spec:
- What does it do?
- What data does it need?
- What APIs are required?
- What UI changes are needed?

#### 2. Add Configuration (if needed)

```typescript
// config/app.config.ts
export const APP_CONFIG = {
  // ...existing config
  myFeature: {
    enabled: true,
    maxItems: 100,
  }
}
```

#### 3. Define Types

```typescript
// lib/myfeature/myfeature.types.ts
export interface MyFeature {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateMyFeatureRequest {
  name: string;
}

export interface MyFeatureResponse {
  feature: MyFeature;
}
```

#### 4. Create Server Service

```typescript
// service/api/myfeature/myfeature.service.ts
import { APP_CONFIG } from '@/config';
import { ValidationError } from '../shared/api-error';
import type { CreateMyFeatureRequest, MyFeature } from './myfeature.types';

export class MyFeatureService {
  private static instance: MyFeatureService | null = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new MyFeatureService();
    }
    return this.instance;
  }

  async createFeature(
    userId: string,
    request: CreateMyFeatureRequest
  ): Promise<MyFeature> {
    // Validation
    this.validateRequest(request);
    
    // Business logic
    const feature = await this.saveToDatabase(userId, request);
    
    return feature;
  }

  private validateRequest(request: CreateMyFeatureRequest): void {
    if (!request.name) {
      throw new ValidationError("Name is required");
    }
  }

  private async saveToDatabase(
    userId: string,
    request: CreateMyFeatureRequest
  ): Promise<MyFeature> {
    // Database operations
  }
}

export const myFeatureService = MyFeatureService.getInstance();
```

#### 5. Create API Route

```typescript
// app/api/myfeature/route.ts
import { NextResponse } from 'next/server';
import { myFeatureService } from '@/service/api/myfeature/myfeature.service';
import { AuthMiddleware } from '@/service/api/shared/auth.middleware';
import { ApiError } from '@/service/api/shared/api-error';

export async function POST(req: Request) {
  try {
    // Auth
    const auth = await AuthMiddleware.verifyAuth();
    
    // Parse request
    const body = await req.json();
    
    // Delegate to service
    const feature = await myFeatureService.createFeature(auth.userId, body);
    
    return NextResponse.json({ feature });
  } catch (error) {
    console.error("MyFeature API error:", error);
    
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### 6. Add API Route to Config

```typescript
// config/api.config.ts
export const API_ROUTES = {
  // ...existing routes
  myFeature: {
    base: "/api/myfeature",
    byId: (id: string) => `/api/myfeature/${id}`,
  }
}
```

#### 7. Create Client Service

```typescript
// lib/api/myfeature.service.ts
import { apiClient } from './api-client';
import { API_ROUTES } from '@/config';
import type { MyFeature, CreateMyFeatureRequest } from '@/lib/myfeature/myfeature.types';

class MyFeatureService {
  private static instance: MyFeatureService | null = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new MyFeatureService();
    }
    return this.instance;
  }

  async createFeature(data: CreateMyFeatureRequest): Promise<MyFeature> {
    const response = await apiClient.post<{ feature: MyFeature }>(
      API_ROUTES.myFeature.base,
      data
    );
    return response.feature;
  }

  async getFeature(id: string): Promise<MyFeature> {
    return apiClient.get<MyFeature>(API_ROUTES.myFeature.byId(id));
  }
}

export const myFeatureService = MyFeatureService.getInstance();
```

#### 8. Create Custom Hook (optional)

```typescript
// hooks/useMyFeature.ts
import { useState } from 'react';
import { myFeatureService } from '@/lib/api/myfeature.service';
import type { MyFeature, CreateMyFeatureRequest } from '@/lib/myfeature/myfeature.types';

export function useMyFeature() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFeature = async (data: CreateMyFeatureRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const feature = await myFeatureService.createFeature(data);
      return feature;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createFeature,
    loading,
    error,
  };
}
```

#### 9. Create UI Component

```typescript
// components/myfeature/MyFeatureForm.tsx
'use client';

import { useState } from 'react';
import { useMyFeature } from '@/hooks/useMyFeature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function MyFeatureForm() {
  const [name, setName] = useState('');
  const { createFeature, loading, error } = useMyFeature();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createFeature({ name });
      setName('');
      // Success handling
    } catch (err) {
      // Error is already in hook state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter name"
        disabled={loading}
      />
      
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </Button>
      
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
```

#### 10. Add Database Table (if needed)

```sql
-- Run in Supabase SQL editor
CREATE TABLE my_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_my_features_user_id ON my_features(user_id);

-- Add RLS policies
ALTER TABLE my_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own features"
ON my_features FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own features"
ON my_features FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

## Common Tasks

### Adding a New API Route

1. Create route file in `app/api/[route]/route.ts`
2. Add auth middleware
3. Delegate to service layer
4. Handle errors
5. Add route to `config/api.config.ts`

### Adding a New Configuration Value

1. Add to appropriate config file (`config/app.config.ts`, etc.)
2. Update type definitions
3. Use via import: `import { APP_CONFIG } from '@/config'`

### Adding a New Component

1. Create in `components/[category]/ComponentName.tsx`
2. Use TypeScript for props
3. Use shadcn/ui components when possible
4. Add 'use client' if needed

### Adding Database Migration

1. Write SQL in Supabase dashboard
2. Test thoroughly
3. Document in migration file or PR
4. Update type definitions

### Adding Environment Variable

1. Add to `.env.local.example`
2. Add to `config/env.config.ts`
3. Update README.md
4. Add to deployment platform

## Best Practices

### Security

```typescript
// ✅ Always verify auth on API routes
export async function POST(req: Request) {
  const auth = await AuthMiddleware.verifyAuth();
  // Now auth.userId is safe to use
}

// ✅ Validate all inputs
private validateRequest(request: CreateRequest): void {
  if (!request.name || request.name.length > 100) {
    throw new ValidationError("Invalid name");
  }
}

// ✅ Use RLS policies in Supabase
-- Don't rely only on server-side checks

// ❌ Never trust client data
const { userId } = await req.json(); // BAD!
```

### Performance

```typescript
// ✅ Use proper indexes
CREATE INDEX idx_threads_user_id ON threads(user_id);

// ✅ Stream large responses
export async function POST(req: Request) {
  return streamChat(messages); // Don't buffer entire response
}

// ✅ Limit query results
SELECT * FROM threads WHERE user_id = $1 LIMIT 100;

// ❌ Don't fetch everything
SELECT * FROM threads; // Potentially huge!
```

### Error Messages

```typescript
// ✅ Helpful, safe error messages
throw new ValidationError("Email is required");
throw new NotFoundError("Thread not found");

// ❌ Expose sensitive info
throw new Error(`Database error: ${dbError.stack}`);
throw new Error(`Failed for user ${email}`);
```

### Code Organization

```typescript
// ✅ Small, focused functions
async function createThread(userId: string, data: CreateThreadRequest) {
  this.validateRequest(data);
  const thread = await this.saveToDb(userId, data);
  await this.notifyUser(userId, thread);
  return thread;
}

// ❌ Giant functions doing everything
async function createThread() {
  // 200 lines of mixed concerns
}
```

### Type Safety

```typescript
// ✅ Explicit return types
async function getUser(id: string): Promise<User> {
  // ...
}

// ✅ Proper error handling
try {
  await operation();
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
  } else {
    // Handle other errors
  }
}

// ❌ Implicit any
async function getData(id) {
  return fetch(url);
}
```

## Debugging

### Server-Side Debugging

```typescript
// Add detailed logging
console.log('Creating thread:', { userId, data });

// Check auth context
console.log('Auth context:', auth);

// Log errors with context
console.error('Thread creation failed:', {
  userId,
  error: error.message,
  stack: error.stack
});
```

### Client-Side Debugging

```typescript
// React DevTools - inspect component state
// Network tab - check API calls
// Console - check for errors

// Add debugging hooks
useEffect(() => {
  console.log('State changed:', { user, loading });
}, [user, loading]);
```

### Common Issues

**Issue: API route returns 401**
- Check auth middleware is called
- Verify Supabase credentials
- Check browser cookies

**Issue: Type errors**
- Run `npm run type-check`
- Check import paths
- Verify type definitions

**Issue: Database errors**
- Check RLS policies
- Verify user permissions
- Check foreign key constraints

**Issue: Build failures**
- Clear `.next` folder
- Run `npm install`
- Check for syntax errors

### Development Tools

```bash
# Type checking
npm run type-check

# Find unused exports
npx ts-prune

# Bundle analysis
npm run build
npx @next/bundle-analyzer

# Check dependencies
npm outdated
npm audit
```

## Testing

### Unit Tests (Future)

```typescript
// Example test structure
describe('ThreadService', () => {
  describe('createThread', () => {
    it('should create thread with valid data', async () => {
      const thread = await threadService.createThread(userId, validData);
      expect(thread).toHaveProperty('id');
      expect(thread.user_id).toBe(userId);
    });

    it('should throw ValidationError on invalid data', async () => {
      await expect(
        threadService.createThread(userId, invalidData)
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

## Pull Request Guidelines

1. **Create feature branch**
```bash
git checkout -b feature/my-feature
```

2. **Make focused commits**
```bash
git commit -m "feat: add myfeature service"
git commit -m "feat: add myfeature API route"
git commit -m "feat: add myfeature UI component"
```

3. **Write clear PR description**
- What does it do?
- Why is it needed?
- How to test?
- Any breaking changes?

4. **Ensure quality**
- TypeScript passes
- No console errors
- Tested manually
- Updated documentation

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Questions?** Check [ARCHITECTURE.md](./ARCHITECTURE.md) or create an issue.
