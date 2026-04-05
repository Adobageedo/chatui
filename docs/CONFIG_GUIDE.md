# Configuration Guide

Complete guide to the ChatUI configuration system - how it works, how to use it, and how to extend it.

## Overview

All configuration is centralized in the `config/` directory for maintainability and type safety.

```
config/
├── app.config.ts      # Application settings
├── api.config.ts      # API route definitions
├── env.config.ts      # Environment variables
└── index.ts           # Central exports
```

## Configuration Files

### app.config.ts - Application Settings

Contains all application-wide settings and constants.

```typescript
export const APP_CONFIG = {
  // Application metadata
  app: {
    name: "ChatUI",
    description: "AI-powered chat assistant",
  },

  // Authentication & Session
  auth: {
    sessionTimeout: 30 * 60 * 1000,        // 30 minutes in ms
    activityCheckInterval: 60 * 1000,       // 1 minute in ms
    redirectUrls: {
      login: "/login",
      signup: "/signup",
      chat: "/chat",
      onboarding: "/onboarding",
      authCallback: "/auth/callback",
      forgotPassword: "/forgot-password",
      resetPassword: "/auth/reset-password",
    },
    publicRoutes: [
      "/login",
      "/signup", 
      "/auth/callback",
      "/forgot-password"
    ],
  },

  // File Upload
  upload: {
    maxFileSize: 50 * 1024 * 1024,         // 50MB in bytes
    maxFileSizeMB: "50mb",                 // String format for Next.js
    acceptedFileTypes: "image/*,application/pdf,.txt,.doc,.docx",
    acceptedImageTypes: "image/*",
    acceptedDocumentTypes: "application/pdf,.txt,.doc,.docx",
  },

  // AI Model
  ai: {
    defaultModel: "gpt-4o",
    maxSteps: 10,
    maxDuration: 30,                       // seconds
  },

  // Storage
  storage: {
    bucket: "documents",
  },
} as const;
```

**Usage:**
```typescript
import { APP_CONFIG } from '@/config';

// Access values
const timeout = APP_CONFIG.auth.sessionTimeout;
const maxSize = APP_CONFIG.upload.maxFileSize;
const model = APP_CONFIG.ai.defaultModel;
```

### api.config.ts - API Routes

Type-safe API route definitions with helper functions.

```typescript
export const API_ROUTES = {
  // Auth
  auth: {
    callback: "/auth/callback",
  },

  // Chat
  chat: "/api/chat",

  // Threads
  threads: {
    base: "/api/threads",
    byId: (threadId: string) => `/api/threads/${threadId}`,
    messages: (threadId: string) => `/api/threads/${threadId}/messages`,
    archive: (threadId: string) => `/api/threads/${threadId}/archive`,
    unarchive: (threadId: string) => `/api/threads/${threadId}/unarchive`,
    title: (threadId: string) => `/api/threads/${threadId}/title`,
    suggestions: (threadId: string) => `/api/threads/${threadId}/suggestions`,
  },

  // Upload
  upload: {
    base: "/api/upload",
    byId: (fileId: string) => `/api/upload/${encodeURIComponent(fileId)}`,
  },
} as const;
```

**Usage:**
```typescript
import { API_ROUTES } from '@/config';

// Static routes
fetch(API_ROUTES.chat);
fetch(API_ROUTES.threads.base);

// Dynamic routes
fetch(API_ROUTES.threads.byId(threadId));
fetch(API_ROUTES.threads.messages(threadId));
fetch(API_ROUTES.upload.byId(fileId));
```

**Benefits:**
- Type-safe route generation
- Centralized URL management
- Automatic URL encoding
- No magic strings

### env.config.ts - Environment Variables

Centralized, validated environment variable access.

```typescript
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
};

export const ENV = {
  // Supabase
  supabase: {
    url: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY", ""),
  },

  // Site
  site: {
    url: getEnvVar("NEXT_PUBLIC_SITE_URL"),
  },

  // OpenAI
  openai: {
    apiKey: getEnvVar("OPENAI_API_KEY", ""),
  },

  // Node Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;
```

**Usage:**
```typescript
import { ENV } from '@/config';

// Access environment variables
createClient(ENV.supabase.url, ENV.supabase.anonKey);

// Check environment
if (ENV.isDevelopment) {
  console.log('Running in development mode');
}
```

**Benefits:**
- Validation on startup
- Type-safe access
- Default values
- Clear error messages

### index.ts - Central Exports

Single import point for all configuration.

```typescript
export { APP_CONFIG } from "./app.config";
export { API_ROUTES } from "./api.config";
export { ENV } from "./env.config";
```

**Usage:**
```typescript
// Import everything
import { APP_CONFIG, API_ROUTES, ENV } from '@/config';

// Or import selectively
import { APP_CONFIG } from '@/config';
import { API_ROUTES } from '@/config';
```

## Common Use Cases

### 1. Adding a New Setting

**Step 1:** Add to appropriate config file
```typescript
// config/app.config.ts
export const APP_CONFIG = {
  // ...existing config
  myFeature: {
    enabled: true,
    maxItems: 100,
    refreshInterval: 5000, // ms
  }
}
```

**Step 2:** Use in code
```typescript
import { APP_CONFIG } from '@/config';

if (APP_CONFIG.myFeature.enabled) {
  setInterval(() => {
    refresh();
  }, APP_CONFIG.myFeature.refreshInterval);
}
```

### 2. Adding a New API Route

**Step 1:** Add to api.config.ts
```typescript
// config/api.config.ts
export const API_ROUTES = {
  // ...existing routes
  myFeature: {
    base: "/api/myfeature",
    byId: (id: string) => `/api/myfeature/${id}`,
    search: "/api/myfeature/search",
  }
}
```

**Step 2:** Use in services
```typescript
import { API_ROUTES } from '@/config';

// Client service
class MyFeatureService {
  async getFeature(id: string) {
    return apiClient.get(API_ROUTES.myFeature.byId(id));
  }
}
```

### 3. Adding a New Environment Variable

**Step 1:** Add to .env.local.example
```env
# MyFeature Configuration
MY_FEATURE_API_KEY=your_api_key_here
```

**Step 2:** Add to env.config.ts
```typescript
// config/env.config.ts
export const ENV = {
  // ...existing config
  myFeature: {
    apiKey: getEnvVar("MY_FEATURE_API_KEY", ""),
  }
}
```

**Step 3:** Use in code
```typescript
import { ENV } from '@/config';

const client = new MyFeatureClient(ENV.myFeature.apiKey);
```

### 4. Modifying Existing Settings

To change a setting:

1. Update value in config file
2. No code changes needed - change propagates automatically
3. Restart dev server to apply

Example - Change session timeout:
```typescript
// config/app.config.ts
auth: {
  sessionTimeout: 60 * 60 * 1000, // Changed from 30min to 60min
}
```

All code using `APP_CONFIG.auth.sessionTimeout` automatically uses new value.

## Configuration Best Practices

### 1. Use Constants, Not Magic Numbers

```typescript
// ❌ Bad - magic number
setTimeout(callback, 1800000);

// ✅ Good - named constant
setTimeout(callback, APP_CONFIG.auth.sessionTimeout);
```

### 2. Type Safety

```typescript
// Config is typed as const for literal types
const config = {
  mode: "dark" as const,  // Type is "dark", not string
}

// Benefit: TypeScript catches typos
if (config.mode === "ligt") {  // Error: "ligt" !== "dark"
  // ...
}
```

### 3. Environment-Specific Values

```typescript
// Use ENV for environment checks
if (ENV.isDevelopment) {
  console.log('Debug info:', data);
}

if (ENV.isProduction) {
  // Production-only code
}
```

### 4. Validation

```typescript
// Validate on import, fail fast
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing: ${key}`);  // Fails at startup
  }
  return value || defaultValue!;
};
```

### 5. Documentation

```typescript
// Add comments for complex settings
export const APP_CONFIG = {
  auth: {
    // Duration in milliseconds before auto-logout
    // Should be between 5 minutes (300000) and 2 hours (7200000)
    sessionTimeout: 30 * 60 * 1000,
  }
}
```

## Migration from Hardcoded Values

### Before (Hardcoded)
```typescript
// ❌ Scattered hardcoded values
const timeout = 30 * 60 * 1000;
fetch("/api/threads");
if (process.env.NODE_ENV === "development") { }
```

### After (Centralized)
```typescript
// ✅ Centralized configuration
import { APP_CONFIG, API_ROUTES, ENV } from '@/config';

const timeout = APP_CONFIG.auth.sessionTimeout;
fetch(API_ROUTES.threads.base);
if (ENV.isDevelopment) { }
```

### Migration Steps

1. **Identify hardcoded values**
```bash
# Search for magic numbers, URLs, etc.
grep -r "30 \* 60 \* 1000" .
grep -r '"/api/' .
grep -r 'process.env' .
```

2. **Add to config**
```typescript
// config/app.config.ts
export const APP_CONFIG = {
  myValue: 30 * 60 * 1000,
}
```

3. **Replace references**
```typescript
// Before
const timeout = 30 * 60 * 1000;

// After
import { APP_CONFIG } from '@/config';
const timeout = APP_CONFIG.auth.sessionTimeout;
```

4. **Test thoroughly**
- Run type checker
- Test all affected features
- Verify no regressions

## Advanced Patterns

### Computed Values

```typescript
export const APP_CONFIG = {
  auth: {
    sessionTimeout: 30 * 60 * 1000,
    // Computed from sessionTimeout
    get warningThreshold() {
      return this.sessionTimeout * 0.9; // Warn at 90%
    }
  }
}
```

### Nested Configurations

```typescript
export const APP_CONFIG = {
  features: {
    chat: {
      enabled: true,
      settings: {
        maxMessages: 100,
        streamingEnabled: true,
      }
    },
    upload: {
      enabled: true,
      settings: {
        maxSize: 50 * 1024 * 1024,
      }
    }
  }
}

// Access: APP_CONFIG.features.chat.settings.maxMessages
```

### Environment Overrides

```typescript
export const APP_CONFIG = {
  api: {
    timeout: ENV.isDevelopment ? 30000 : 10000,
    retries: ENV.isProduction ? 3 : 0,
  }
}
```

## Testing Configuration

### Unit Tests

```typescript
import { APP_CONFIG } from '@/config';

describe('APP_CONFIG', () => {
  it('should have valid session timeout', () => {
    expect(APP_CONFIG.auth.sessionTimeout).toBeGreaterThan(0);
    expect(APP_CONFIG.auth.sessionTimeout).toBeLessThan(7200000); // Max 2 hours
  });

  it('should have all required redirect URLs', () => {
    expect(APP_CONFIG.auth.redirectUrls.login).toBeDefined();
    expect(APP_CONFIG.auth.redirectUrls.chat).toBeDefined();
  });
});
```

### Environment Validation

```typescript
// Test in CI/CD
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required env var: ${varName}`);
  }
});
```

## Troubleshooting

### "Cannot find module '@/config'"

**Solution:** Check `tsconfig.json` paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "Property does not exist on APP_CONFIG"

**Solution:** TypeScript cache issue
```bash
# Clear cache and restart
rm -rf .next
npm run dev
```

### Environment variable is undefined

**Solution:**
1. Check `.env.local` exists and has the variable
2. Restart dev server (env vars loaded at startup)
3. Verify variable name matches exactly (case-sensitive)

### Config value not updating

**Solution:**
1. Clear browser cache
2. Restart dev server
3. Check you're importing from `@/config`, not a local copy

## Summary

### Key Benefits

1. **Single Source of Truth** - All settings in one place
2. **Type Safety** - TypeScript autocomplete and validation
3. **Maintainability** - Easy to find and update settings
4. **Validation** - Catch missing env vars at startup
5. **Documentation** - Config files are self-documenting
6. **Testing** - Easy to mock and test

### Quick Reference

```typescript
// Import
import { APP_CONFIG, API_ROUTES, ENV } from '@/config';

// App settings
APP_CONFIG.auth.sessionTimeout
APP_CONFIG.upload.maxFileSize
APP_CONFIG.ai.defaultModel

// API routes
API_ROUTES.chat
API_ROUTES.threads.byId(id)
API_ROUTES.upload.base

// Environment
ENV.supabase.url
ENV.isDevelopment
ENV.isProduction
```

---

**For more information:**
- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guide
