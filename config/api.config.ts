/**
 * API Routes Configuration
 * Centralized API endpoint paths
 */

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

export default API_ROUTES;
