# ChatUI - AI-Powered Chat Assistant

A modern, full-stack AI chat application built with Next.js 14, featuring real-time AI conversations, file uploads, thread management, and robust authentication.

## 🚀 Features

- **Real-time AI Chat** - Stream responses from GPT-4o with tool calling support
- **Thread Management** - Organize conversations with full CRUD operations
- **File Uploads** - Support for images and documents with Supabase storage
- **Authentication** - Secure auth with email verification and onboarding flow
- **Auto-logout** - 30-minute inactivity timeout for security
- **Suggestions** - AI-powered follow-up suggestions
- **Protected Routes** - Server and client-side route protection
- **Modern UI** - Built with Tailwind CSS and shadcn/ui components

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- OpenAI API key
- Git

## 🛠️ Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd chatui/chatui
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

### 4. Set Up Supabase

#### Create Tables

Run these SQL commands in your Supabase SQL editor:

```sql
-- Users table (extends Supabase auth.users)
-- No additional table needed, using user_metadata

-- Threads table
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_external_id ON threads(external_id);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread_id ON messages(thread_id);
```

#### Create Storage Bucket

1. Go to Storage in Supabase dashboard
2. Create a new bucket named `documents`
3. Set it to public or configure appropriate policies

#### Set Up Storage Policies

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read their files
CREATE POLICY "Users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete their files
CREATE POLICY "Users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
chatui/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # Auth pages (login, signup, onboarding)
│   ├── api/                 # API routes
│   │   ├── chat/           # Chat streaming endpoint
│   │   ├── threads/        # Thread management endpoints
│   │   └── upload/         # File upload endpoints
│   ├── chat/               # Main chat page
│   ├── layout.tsx          # Root layout with providers
│   └── AppProviders.tsx    # Global context providers
├── components/              # React components
│   ├── assistant-ui/       # Chat UI components
│   ├── auth/               # Auth guards and wrappers
│   └── ui/                 # shadcn/ui components
├── config/                  # Centralized configuration
│   ├── app.config.ts       # App settings (auth, upload, AI)
│   ├── api.config.ts       # API route definitions
│   ├── env.config.ts       # Environment variables
│   └── index.ts            # Config exports
├── contexts/               # React contexts
│   └── AuthContext.tsx     # Authentication state
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts         # Auth operations hook
│   └── useActivityTracker.ts # Activity monitoring
├── lib/                    # Client-side libraries
│   ├── api/               # API client services
│   │   ├── api-client.ts  # HTTP client
│   │   ├── thread.service.ts # Thread operations
│   │   └── upload.service.ts # File upload
│   ├── auth/              # Auth services
│   │   ├── auth.service.ts    # Auth operations
│   │   ├── auth.types.ts      # Auth type definitions
│   │   └── session.service.ts # Session management
│   ├── chat/              # Chat adapters
│   │   ├── attachment-adapter.ts  # File handling
│   │   ├── chat-model-adapter.ts  # AI streaming
│   │   ├── thread-list-adapter.ts # Thread list
│   │   ├── thread-history-adapter.ts # Message history
│   │   └── suggestion-adapter.ts  # AI suggestions
│   ├── supabase/          # Supabase clients
│   │   ├── client.ts      # Browser client
│   │   └── server.ts      # Server client
│   └── utils.ts           # Utility functions
├── service/               # Server-side services
│   └── api/              # API business logic
│       ├── chat/         # Chat service layer
│       ├── shared/       # Shared utilities (auth middleware, errors)
│       ├── storage/      # File storage service
│       └── threads/      # Thread/message services
├── middleware.ts          # Next.js middleware (route protection)
└── next.config.ts        # Next.js configuration
```

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4o
- **Chat UI**: assistant-ui

### Key Patterns

1. **Service Layer Pattern** - Business logic separated from API routes
2. **Adapter Pattern** - Chat adapters abstract assistant-ui integration
3. **Centralized Configuration** - All constants in `config/` directory
4. **Type Safety** - Full TypeScript coverage with strict types
5. **Error Handling** - Custom error classes and centralized handling

### Data Flow

```
User Action → React Component → Hook → API Service → API Route → 
Server Service → Database/External API → Response Chain
```

## 🔒 Authentication Flow

1. **Signup** → Email verification → Onboarding → Chat
2. **Login** → Check onboarding status → Redirect appropriately
3. **Route Protection** → Middleware (server) + Guards (client)
4. **Session Management** → 30-min auto-logout on inactivity

## 🎨 Adding New Features

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development guidelines.

Quick steps:
1. Add configuration to `config/` if needed
2. Create types in appropriate `*.types.ts` file
3. Implement service layer in `service/api/`
4. Create API route in `app/api/`
5. Create client service in `lib/api/`
6. Use in components via hooks

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [CONFIG_GUIDE.md](./CONFIG_GUIDE.md) - Configuration system explained

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Ensure all environment variables from `.env.local.example` are set in your deployment platform.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📝 License

[Your License Here]

## 🆘 Support

For issues and questions:
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Review existing issues
- Create a new issue with details

---

**Built with ❤️ using Next.js and Supabase**
