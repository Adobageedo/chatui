/**
 * Application Configuration
 * Centralized configuration for the entire application
 */

export const APP_CONFIG = {
  // Application Info
  app: {
    name: "ChatUI",
    description: "AI-powered chat assistant",
  },

  // Session & Auth
  auth: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
    activityCheckInterval: 60 * 1000, // 1 minute in milliseconds
    redirectUrls: {
      login: "/login",
      signup: "/signup",
      chat: "/chat",
      onboarding: "/onboarding",
      authCallback: "/auth/callback",
      forgotPassword: "/forgot-password",
      resetPassword: "/auth/reset-password",
    },
    publicRoutes: ["/login", "/signup", "/auth/callback", "/forgot-password"],
  },

  // File Upload
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB in bytes
    maxFileSizeMB: "50mb",
    acceptedFileTypes: "image/*,application/pdf,.txt,.doc,.docx",
    acceptedImageTypes: "image/*",
    acceptedDocumentTypes: "application/pdf,.txt,.doc,.docx",
    maxContentLength: 10000, // Max document content length to prevent context overflow
  },

  // AI Model
  ai: {
    defaultModel: "gpt-4o",
    maxSteps: 10,
    maxDuration: 30, // seconds
  },

  // Storage
  storage: {
    bucket: "documents",
  },
} as const;

export default APP_CONFIG;
