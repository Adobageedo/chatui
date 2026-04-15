# Feature Spaces Implementation Guide

This document provides a comprehensive senior-level implementation plan for two new feature spaces to be added to ChatUI:

1. **DataGrid Space** - Customizable table and detail view system
2. **Document Management Space** - SharePoint/Finder-like file system with vector embeddings

---

## Table of Contents

- [Overview](#overview)
- [Space 1: DataGrid System](#space-1-datagrid-system)
  - [Database Schema](#datagrid-database-schema)
  - [File Structure](#datagrid-file-structure)
  - [Component Architecture](#datagrid-component-architecture)
  - [Key Features](#datagrid-key-features)
- [Space 2: Document Management System](#space-2-document-management-system)
  - [Database Schema](#documents-database-schema)
  - [Qdrant Integration](#qdrant-integration)
  - [File Structure](#documents-file-structure)
  - [Component Architecture](#documents-component-architecture)
  - [Key Features](#documents-key-features)
- [Dependencies](#dependencies)
- [Configuration](#configuration)
- [Implementation Phases](#implementation-phases)
- [Security Considerations](#security-considerations)
- [Performance Optimization](#performance-optimization)

---

## Overview

### Current Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: OpenAI GPT-4o
- **State Management**: Zustand
- **Chat UI**: assistant-ui

### Architecture Patterns

- Service Layer Pattern - Business logic separated from API routes
- Adapter Pattern - Components abstract external integrations
- Centralized Configuration - All constants in `config/` directory
- Type Safety - Full TypeScript coverage with strict types
- Error Handling - Custom error classes and centralized handling

---

## Space 1: DataGrid System

A customizable table and detail view system allowing users to create collections with custom columns, manage rows with various data types, and view detailed information.

### DataGrid Database Schema

```sql
-- DataGrid Collections
CREATE TABLE datagrid_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DataGrid Columns
CREATE TABLE datagrid_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES datagrid_collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'text', 'number', 'date', 'link', 'email', 'select', 'multiselect', 'boolean', 'file', 'user'
  config JSONB, -- {options: [], format: '', validation: {}}
  is_primary BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  order_index INTEGER,
  width INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DataGrid Rows
CREATE TABLE datagrid_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES datagrid_collections(id) ON DELETE CASCADE,
  data JSONB NOT NULL, -- {column_id: value}
  metadata JSONB, -- {tags: [], priority: '', status: ''}
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DataGrid Views
CREATE TABLE datagrid_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES datagrid_collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'table', -- 'table', 'grid', 'kanban', 'calendar'
  filters JSONB, -- {column_id: {operator: '', value: ''}}
  sorts JSONB, -- [{column_id: '', direction: 'asc'|'desc'}]
  visible_columns JSONB, -- [column_ids]
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_datagrid_collections_user ON datagrid_collections(user_id);
CREATE INDEX idx_datagrid_columns_collection ON datagrid_columns(collection_id);
CREATE INDEX idx_datagrid_rows_collection ON datagrid_rows(collection_id);
CREATE INDEX idx_datagrid_views_collection ON datagrid_views(collection_id);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE datagrid_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE datagrid_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE datagrid_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE datagrid_views ENABLE ROW LEVEL SECURITY;

-- Collections
CREATE POLICY "Users can view own collections"
  ON datagrid_collections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own collections"
  ON datagrid_collections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own collections"
  ON datagrid_collections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own collections"
  ON datagrid_collections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Columns (inherited from collection ownership)
CREATE POLICY "Users can view columns of own collections"
  ON datagrid_columns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM datagrid_collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify columns of own collections"
  ON datagrid_columns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM datagrid_collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

-- Rows (inherited from collection ownership)
CREATE POLICY "Users can view rows of own collections"
  ON datagrid_rows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM datagrid_collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify rows of own collections"
  ON datagrid_rows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM datagrid_collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

-- Views (inherited from collection ownership)
CREATE POLICY "Users can view views of own collections"
  ON datagrid_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM datagrid_collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify views of own collections"
  ON datagrid_views FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM datagrid_collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );
```

### DataGrid File Structure

```
app/
├── (spaces)/
│   ├── layout.tsx                   # Shared layout with navigation
│   └── datagrid/
│       ├── page.tsx                 # Collections list
│       ├── [collectionId]/
│       │   ├── page.tsx             # Table view
│       │   ├── row/
│       │   │   └── [rowId]/
│       │   │       └── page.tsx     # Row detail page
│       │   └── settings/
│       │       └── page.tsx         # Collection settings
│       └── new/
│           └── page.tsx             # Create collection
├── api/
│   └── datagrid/
│       ├── collections/
│       │   ├── route.ts             # GET, POST collections
│       │   └── [id]/
│       │       ├── route.ts         # GET, PATCH, DELETE
│       │       ├── columns/
│       │       │   └── route.ts     # Manage columns
│       │       └── rows/
│       │           ├── route.ts     # GET, POST rows
│       │           └── [rowId]/
│       │               └── route.ts # PATCH, DELETE row
│       └── views/
│           └── route.ts             # Manage views
components/
└── datagrid/
    ├── CollectionCard.tsx           # Collection card
    ├── DataTable.tsx                # Main table component
    ├── DataTableToolbar.tsx         # Filters, search, actions
    ├── DataTableRow.tsx             # Table row component
    ├── ColumnEditor.tsx             # Column configuration
    ├── CellRenderer.tsx             # Render different cell types
    ├── CellEditor.tsx               # Inline cell editing
    ├── RowDetailView.tsx            # Detail page layout
    ├── ViewSelector.tsx             # Switch between views
    └── CreateCollectionDialog.tsx   # New collection modal
hooks/
└── datagrid/
    ├── useCollections.ts            # Collections CRUD
    ├── useRows.ts                   # Rows CRUD
    ├── useColumns.ts                # Columns management
    └── useViews.ts                  # Views management
lib/
└── datagrid/
    ├── collection.service.ts        # Collection operations
    ├── row.service.ts               # Row operations
    └── view.service.ts              # View operations
service/api/
└── datagrid/
    ├── collection.service.ts        # Business logic
    ├── collection.repository.ts    # DB operations
    ├── collection.types.ts          # Type definitions
    ├── row.service.ts
    ├── row.repository.ts
    ├── row.types.ts
    ├── view.service.ts
    ├── view.repository.ts
    └── view.types.ts
config/
└── datagrid.config.ts               # DataGrid settings
types/
└── datagrid.types.ts                # Global DataGrid types
```

### DataGrid Component Architecture

#### CollectionCard
```typescript
interface CollectionCardProps {
  collection: Collection;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}
```
- Displays collection summary (name, description, icon, color)
- Shows row count
- Quick actions (edit, delete, open)

#### DataTable
```typescript
interface DataTableProps<T> {
  columns: Column[];
  data: T[];
  view: View;
  onRowClick: (row: T) => void;
  onCellEdit: (rowId: string, columnId: string, value: any) => void;
}
```
- Built with `@tanstack/react-table`
- Virtual scrolling for large datasets
- Column resizing and reordering
- Inline cell editing
- Row selection for bulk actions

#### CellRenderer
```typescript
interface CellRendererProps {
  type: ColumnType;
  value: any;
  config: ColumnConfig;
  onEdit: (value: any) => void;
}
```
- Renders different cell types based on column configuration
- Type-specific editors (date picker, select dropdown, etc.)
- Validation based on column config

#### RowDetailView
```typescript
interface RowDetailViewProps {
  row: Row;
  collection: Collection;
  onEdit: (data: any) => void;
}
```
- Displays all row data in a detail view
- Customizable layout based on user preferences
- Shows primary fields prominently
- Supports related data display

### DataGrid Key Features

#### 1. Column Types
- **Text**: Simple text input with validation
- **Number**: Number input with formatting options
- **Date**: Date picker with time support
- **Link**: Clickable URLs with validation
- **Email**: Email validation and mailto links
- **Select**: Single select dropdown
- **Multiselect**: Tag-based multi-select
- **Boolean**: Checkbox toggle
- **File**: File attachment with preview
- **User**: User picker from auth.users

#### 2. Advanced Filtering
- Multi-column filters
- Operators: equals, contains, greater than, less than, between, is null
- Filter presets
- Saved filter combinations in views

#### 3. Sorting
- Multi-column sorting
- Sort direction indicators
- Sort persistence in views

#### 4. Views System
- Save custom view configurations
- Include filters, sorts, column visibility
- Set default views
- Share views between users (future)

#### 5. Export
- Export to CSV, Excel, JSON
- Column selection for export
- Row limit configuration
- Batch export for large datasets

#### 6. Bulk Actions
- Select multiple rows
- Bulk delete
- Bulk update
- Bulk export

#### 7. Virtual Scrolling
- Performance optimization for >100 rows
- Windowed rendering
- Lazy loading

---

## Space 2: Document Management System

A SharePoint/Finder-like file management system with folder hierarchy, file versioning, metadata management, and semantic search using Qdrant vector embeddings.

### Documents Database Schema

```sql
-- Document Folders
CREATE TABLE dm_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES dm_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  path TEXT NOT NULL, -- Materialized path: "/folder1/folder2"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Files
CREATE TABLE dm_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES dm_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  metadata JSONB, -- {tags: [], custom_fields: {}}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Versions
CREATE TABLE dm_file_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES dm_files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Embeddings (Qdrant Reference)
CREATE TABLE dm_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES dm_files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  qdrant_point_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Shares
CREATE TABLE dm_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL, -- 'file' or 'folder'
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with UUID REFERENCES auth.users(id),
  share_token TEXT UNIQUE,
  permissions JSONB, -- {read: true, write: false, delete: false}
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dm_folders_user ON dm_folders(user_id);
CREATE INDEX idx_dm_folders_parent ON dm_folders(parent_id);
CREATE INDEX idx_dm_folders_path ON dm_folders(path);
CREATE INDEX idx_dm_files_user ON dm_files(user_id);
CREATE INDEX idx_dm_files_folder ON dm_files(folder_id);
CREATE INDEX idx_dm_embeddings_file ON dm_embeddings(file_id);
CREATE INDEX idx_dm_shares_resource ON dm_shares(resource_id, resource_type);
CREATE INDEX idx_dm_shares_token ON dm_shares(share_token);
```

### Documents RLS Policies

```sql
-- Enable RLS
ALTER TABLE dm_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_shares ENABLE ROW LEVEL SECURITY;

-- Folders
CREATE POLICY "Users can view own folders"
  ON dm_folders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own folders"
  ON dm_folders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own folders"
  ON dm_folders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own folders"
  ON dm_folders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Files
CREATE POLICY "Users can view own files"
  ON dm_files FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own files"
  ON dm_files FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own files"
  ON dm_files FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own files"
  ON dm_files FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- File Versions (inherited from file ownership)
CREATE POLICY "Users can view versions of own files"
  ON dm_file_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dm_files
      WHERE id = file_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions of own files"
  ON dm_file_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dm_files
      WHERE id = file_id AND user_id = auth.uid()
    )
  );

-- Embeddings (inherited from file ownership)
CREATE POLICY "Users can view embeddings of own files"
  ON dm_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dm_files
      WHERE id = file_id AND user_id = auth.uid()
    )
  );

-- Shares
CREATE POLICY "Users can view shares they created"
  ON dm_shares FOR SELECT
  TO authenticated
  USING (shared_by = auth.uid());

CREATE POLICY "Users can create shares"
  ON dm_shares FOR INSERT
  TO authenticated
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Users can update shares they created"
  ON dm_shares FOR UPDATE
  TO authenticated
  USING (shared_by = auth.uid());

CREATE POLICY "Users can delete shares they created"
  ON dm_shares FOR DELETE
  TO authenticated
  USING (shared_by = auth.uid());
```

### Qdrant Integration

#### Collection Setup

```typescript
// Qdrant collection configuration
{
  collection_name: "document_embeddings",
  vectors: {
    size: 1536, // OpenAI text-embedding-3-small
    distance: "Cosine"
  },
  payload_schema: {
    file_id: "keyword",
    user_id: "keyword",
    chunk_index: "integer",
    content: "text",
    file_name: "text",
    mime_type: "keyword",
    created_at: "datetime"
  }
}
```

#### Qdrant Service Architecture

```typescript
// service/api/documents/qdrant.service.ts
export class QdrantService {
  private client: QdrantClient;
  
  async initializeCollection() {
    // Create collection if not exists
  }
  
  async upsertEmbedding(fileId: string, chunks: TextChunk[]) {
    // Generate embeddings using OpenAI
    const embeddings = await this.generateEmbeddings(chunks);
    
    // Upsert to Qdrant
    await this.client.upsert('document_embeddings', {
      points: embeddings.map((embedding, idx) => ({
        id: `${fileId}_${idx}`,
        vector: embedding.vector,
        payload: {
          file_id: fileId,
          user_id: chunks[idx].userId,
          chunk_index: idx,
          content: chunks[idx].content,
          file_name: chunks[idx].fileName,
          mime_type: chunks[idx].mimeType,
          created_at: new Date().toISOString(),
        },
      })),
    });
  }
  
  async semanticSearch(query: string, userId: string, limit = 20) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    return this.client.search('document_embeddings', {
      vector: queryEmbedding,
      filter: {
        must: [{ key: 'user_id', match: { value: userId } }],
      },
      limit,
      with_payload: true,
    });
  }
  
  async deleteFileEmbeddings(fileId: string) {
    // Delete all embeddings for a file
  }
  
  async hybridSearch(query: string, userId: string, limit = 20) {
    // Combine semantic search with keyword search
    const semanticResults = await this.semanticSearch(query, userId, limit);
    const keywordResults = await this.keywordSearch(query, userId, limit);
    
    // Merge and re-rank results
    return this.mergeResults(semanticResults, keywordResults);
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    // Call OpenAI embedding API
  }
  
  private async generateEmbeddings(chunks: TextChunk[]): Promise<Embedding[]> {
    // Batch generate embeddings
  }
  
  private async keywordSearch(query: string, userId: string, limit: number) {
    // Postgres full-text search
  }
  
  private mergeResults(semantic: any[], keyword: any[]): any[] {
    // Combine and re-rank using hybrid weight
  }
}
```

### Documents File Structure

```
app/
├── (spaces)/
│   └── documents/
│       ├── page.tsx                 # Root/All files view
│       ├── folder/
│       │   └── [folderId]/
│       │       └── page.tsx         # Folder view
│       ├── file/
│       │   └── [fileId]/
│       │       └── page.tsx         # File preview/details
│       └── search/
│           └── page.tsx             # Semantic search interface
├── api/
│   └── documents/
│       ├── folders/
│       │   ├── route.ts             # GET, POST folders
│       │   └── [id]/
│       │       ├── route.ts         # GET, PATCH, DELETE
│       │       └── move/
│       │           └── route.ts     # Move folder
│       ├── files/
│       │   ├── route.ts             # GET, POST files
│       │   ├── upload/
│       │   │   └── route.ts         # Multipart upload
│       │   └── [id]/
│       │       ├── route.ts         # GET, PATCH, DELETE
│       │       ├── download/
│       │       │   └── route.ts     # Download file
│       │       └── versions/
│       │           └── route.ts     # Version history
│       ├── search/
│       │   └── route.ts             # Semantic + keyword search
│       └── embeddings/
│           └── generate/
│               └── route.ts         # Generate embeddings
components/
└── documents/
    ├── FileExplorer.tsx             # Main file browser
    ├── FolderTree.tsx               # Sidebar folder tree
    ├── FileGrid.tsx                 # Grid view of files
    ├── FileList.tsx                 # List view of files
    ├── FilePreview.tsx              # File preview modal
    ├── FileUploader.tsx             # Drag & drop uploader
    ├── FileMetadataEditor.tsx       # Edit file metadata
    ├── SearchBar.tsx                # Search interface
    ├── SearchResults.tsx            # Search results display
    ├── ShareDialog.tsx              # Sharing configuration
    └── BreadcrumbNav.tsx            # Path navigation
hooks/
└── documents/
    ├── useFolders.ts                # Folders CRUD
    ├── useFiles.ts                  # Files CRUD
    ├── useFileUpload.ts             # Upload with progress
    ├── useSemanticSearch.ts         # Vector search
    └── useFileVersions.ts           # Version control
lib/
├── documents/
│   ├── folder.service.ts            # Folder operations
│   ├── file.service.ts              # File operations
│   ├── search.service.ts            # Search operations
│   └── embedding.service.ts         # Embedding operations
└── qdrant/
    └── client.ts                    # Qdrant SDK wrapper
service/api/
└── documents/
    ├── folder.service.ts            # Business logic
    ├── folder.repository.ts         # DB operations
    ├── folder.types.ts              # Type definitions
    ├── file.service.ts              # Business logic
    ├── file.repository.ts           # DB operations
    ├── file.types.ts                # Type definitions
    ├── embedding.service.ts         # Embedding generation
    ├── embedding.repository.ts      # DB operations
    ├── embedding.types.ts           # Type definitions
    ├── search.service.ts            # Hybrid search
    ├── qdrant.service.ts            # Qdrant operations
    └── text-extractor.service.ts    # Extract text from files
config/
└── documents.config.ts              # Document settings
types/
└── documents.types.ts               # Global Document types
```

### Documents Component Architecture

#### FileExplorer
```typescript
interface FileExplorerProps {
  currentFolder?: Folder;
  viewMode: 'grid' | 'list';
  onFolderSelect: (folder: Folder) => void;
  onFileSelect: (file: File) => void;
  onUpload: (files: File[]) => void;
}
```
- Main file browser component
- Grid and list view modes
- Drag & drop file upload
- Context menu for actions

#### FolderTree
```typescript
interface FolderTreeProps {
  folders: Folder[];
  currentFolder?: Folder;
  onFolderSelect: (folder: Folder) => void;
  onCreateFolder: (parentId: string) => void;
}
```
- Hierarchical folder tree
- Expandable/collapsible nodes
- Drag & drop folder reorganization
- Context menu for folder actions

#### FileGrid / FileList
```typescript
interface FileViewProps {
  files: File[];
  folders: Folder[];
  viewMode: 'grid' | 'list';
  onFileSelect: (file: File) => void;
  onFolderSelect: (folder: Folder) => void;
}
```
- Display files and folders
- Grid view with thumbnails
- List view with details
- Selection for bulk actions

#### FilePreview
```typescript
interface FilePreviewProps {
  file: File;
  version?: FileVersion;
  onClose: () => void;
}
```
- In-browser file preview
- Support for images, PDFs, text files
- Version selector
- Download button

#### FileUploader
```typescript
interface FileUploaderProps {
  folderId?: string;
  onUploadComplete: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
}
```
- Drag & drop upload zone
- Progress indicators
- File type validation
- Chunked upload for large files

#### SearchBar
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showFilters?: boolean;
}
```
- Search input with debouncing
- Filter toggles (semantic, keyword, hybrid)
- Search history
- Advanced filters

#### SearchResults
```typescript
interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onResultClick: (result: SearchResult) => void;
}
```
- Display search results
- Highlight matched text
- Show relevance score
- Filter by type

### Documents Key Features

#### 1. Folder Hierarchy
- Unlimited nested folders
- Materialized path for efficient queries
- Drag & drop reorganization
- Folder color and icon customization

#### 2. File Upload
- Drag & drop interface
- Multi-file upload
- Chunked upload for large files
- Progress tracking
- File type validation
- Duplicate handling

#### 3. File Versioning
- Automatic version tracking
- Version history
- Restore previous versions
- Version comparison
- Max version limit configuration

#### 4. Semantic Search
- Vector similarity search using Qdrant
- OpenAI embeddings (text-embedding-3-small)
- Intelligent document chunking
- Result highlighting

#### 5. Hybrid Search
- Combine vector + keyword search
- Configurable weight between methods
- Re-ranking of results
- Faceted search filters

#### 6. File Preview
- In-browser preview for:
  - Images (JPEG, PNG, GIF, WebP, SVG)
  - PDFs (with page limits)
  - Text files
  - Code files with syntax highlighting
- Thumbnail generation
- Download option

#### 7. Metadata Management
- Custom metadata fields
- Tag system
- File properties display
- Bulk metadata editing

#### 8. Sharing
- Share with specific users
- Public share links with tokens
- Permission levels (read, write, delete)
- Expiration dates
- Share management

#### 9. Activity Tracking
- Track file access
- Track modifications
- Track downloads
- Activity log per file

#### 10. Smart Chunking
- Intelligent document chunking for embeddings
- Respect sentence boundaries
- Configurable chunk size and overlap
- Special handling for different file types

---

## Dependencies

### New Packages to Install

```bash
npm install @qdrant/js-client-rest @tanstack/react-table react-dropzone \
  react-virtualized-auto-sizer react-window file-saver mime-types \
  pdf-lib mammoth xlsx

npm install -D @types/file-saver @types/mime-types @types/react-window
```

### Package Details

| Package | Purpose |
|---------|---------|
| `@qdrant/js-client-rest` | Qdrant vector database client |
| `@tanstack/react-table` | High-performance table component |
| `react-dropzone` | Drag & drop file upload |
| `react-virtualized-auto-sizer` | Auto-sizing for virtual lists |
| `react-window` | Virtual scrolling for large lists |
| `file-saver` | Client-side file downloads |
| `mime-types` | MIME type detection |
| `pdf-lib` | PDF manipulation |
| `mammoth` | Word document parsing |
| `xlsx` | Excel file parsing |

---

## Configuration

### DataGrid Configuration

```typescript
// config/datagrid.config.ts
export const DATAGRID_CONFIG = {
  columns: {
    types: [
      'text', 'number', 'date', 'link', 'email', 
      'select', 'multiselect', 'boolean', 'file', 'user'
    ],
    defaultWidth: 150,
    minWidth: 80,
    maxWidth: 500,
  },
  rows: {
    defaultPageSize: 50,
    maxPageSize: 200,
    virtualizationThreshold: 100,
  },
  views: {
    types: ['table', 'grid', 'kanban', 'calendar'],
    defaultType: 'table',
  },
  export: {
    formats: ['csv', 'xlsx', 'json'],
    maxRows: 10000,
  },
} as const;
```

### Documents Configuration

```typescript
// config/documents.config.ts
export const DOCUMENTS_CONFIG = {
  upload: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 10,
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    allowedTypes: [
      'image/*', 
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.*',
      'application/msword',
      'text/*',
    ],
  },
  embedding: {
    chunkSize: 1000, // characters
    chunkOverlap: 200,
    model: 'text-embedding-3-small',
    batchSize: 100,
  },
  storage: {
    bucket: 'documents-storage',
    maxVersions: 10,
  },
  search: {
    maxResults: 50,
    minScore: 0.7,
    hybridWeight: 0.5, // Balance between vector and keyword search
  },
  preview: {
    supportedTypes: ['image', 'pdf', 'text', 'video', 'audio'],
    imageMaxSize: 5 * 1024 * 1024,
    pdfMaxPages: 50,
  },
} as const;
```

### Environment Variables

Add to `.env.example`:

```env
# Qdrant Configuration
NEXT_PUBLIC_QDRANT_URL=your_qdrant_url
NEXT_PUBLIC_QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=document_embeddings

# Document Storage
DOCUMENTS_STORAGE_BUCKET=documents-storage
DOCUMENTS_MAX_FILE_SIZE=104857600
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goals:**
- Set up database schemas
- Install dependencies
- Create configuration files
- Set up Qdrant connection
- Create base types and interfaces

**Tasks:**
1. Create Supabase migration files for all tables
2. Set up RLS policies
3. Install new npm packages
4. Create configuration files (datagrid.config.ts, documents.config.ts)
5. Set up Qdrant client wrapper
6. Create base type definitions
7. Set up environment variables

**Deliverables:**
- Database migration files
- Updated package.json
- Configuration files
- Type definitions
- Qdrant client setup

### Phase 2: DataGrid Core (Week 2)

**Goals:**
- Implement collections CRUD
- Implement columns management
- Build basic table view with react-table
- Implement row CRUD operations
- Implement simple cell types

**Tasks:**
1. Create collection service and repository
2. Create column service and repository
3. Create row service and repository
4. Build CollectionCard component
5. Build DataTable component with react-table
6. Implement basic cell renderers (text, number, date)
7. Create API routes for collections, columns, rows
8. Create hooks (useCollections, useColumns, useRows)
9. Build collections list page
10. Build table view page

**Deliverables:**
- Working collections CRUD
- Working columns management
- Basic table view
- Row CRUD operations
- 3 basic cell types

### Phase 3: DataGrid Advanced (Week 3)

**Goals:**
- Implement advanced cell types
- Add filtering and sorting
- Implement views system
- Add export functionality
- Build row detail page

**Tasks:**
1. Implement advanced cell types (link, select, multiselect, boolean, file, user)
2. Add column resizing
3. Add column reordering
4. Implement filtering system
5. Implement multi-column sorting
6. Build views service and repository
7. Create ViewSelector component
8. Implement export to CSV, Excel, JSON
9. Build RowDetailView component
10. Create row detail page
11. Add bulk actions (delete, update, export)
12. Implement virtual scrolling

**Deliverables:**
- All 10 cell types working
- Filtering and sorting
- Views system
- Export functionality
- Row detail page
- Bulk actions
- Virtual scrolling

### Phase 4: Documents Core (Week 4)

**Goals:**
- Implement folder structure
- Implement file upload with progress
- Build basic file listing
- Implement file preview
- Add metadata management

**Tasks:**
1. Create folder service and repository
2. Create file service and repository
3. Build FolderTree component
4. Build FileGrid component
5. Build FileList component
6. Build FileUploader component with progress
7. Implement drag & drop upload
8. Create file preview modal
9. Build FilePreview component for images, PDFs, text
10. Implement metadata editing
11. Build FileMetadataEditor component
12. Create folder and file pages
13. Build BreadcrumbNav component

**Deliverables:**
- Working folder hierarchy
- File upload with progress
- File listing (grid and list)
- File preview
- Metadata management
- Navigation

### Phase 5: Documents Advanced (Week 5)

**Goals:**
- Implement embedding generation pipeline
- Integrate with Qdrant
- Implement semantic search
- Implement hybrid search
- Add file versioning

**Tasks:**
1. Create text extractor service (extract text from PDF, Word, etc.)
2. Implement smart chunking algorithm
3. Create embedding service
4. Integrate with Qdrant
5. Implement semantic search
6. Implement keyword search (Postgres full-text)
7. Implement hybrid search with re-ranking
8. Build SearchBar component
9. Build SearchResults component
10. Create search page
11. Implement file versioning
12. Build version history interface
13. Add restore functionality

**Deliverables:**
- Text extraction from files
- Embedding generation
- Qdrant integration
- Semantic search
- Hybrid search
- File versioning

### Phase 6: Polish & Integration (Week 6)

**Goals:**
- Implement sharing functionality
- Add activity tracking
- Optimize performance
- Ensure mobile responsiveness
- Testing and bug fixes

**Tasks:**
1. Implement sharing (user and public links)
2. Build ShareDialog component
3. Add permission management
4. Implement activity tracking
5. Build activity log interface
6. Optimize database queries
7. Add caching where appropriate
8. Implement lazy loading
9. Ensure mobile responsiveness
10. Add loading states
11. Add error boundaries
12. Write unit tests
13. Write integration tests
14. Bug fixes and polish

**Deliverables:**
- Sharing functionality
- Activity tracking
- Performance optimizations
- Mobile responsive
- Test coverage
- Production-ready code

---

## Security Considerations

### 1. Row-Level Security (RLS)
- All tables must have RLS enabled
- Policies must verify user ownership
- Use `auth.uid()` for user identification
- Test policies thoroughly

### 2. File Access Control
- Validate user permissions before file access
- Use signed URLs for file downloads
- Implement temporary signed URLs with expiration
- Validate file types on upload

### 3. Qdrant Isolation
- Filter by `user_id` in all vector searches
- Never expose embeddings from other users
- Implement tenant isolation in Qdrant
- Use separate collections per tenant if needed

### 4. Input Validation
- Validate all user inputs server-side
- Sanitize file names
- Validate file sizes
- Validate MIME types
- Use Zod for runtime validation

### 5. Rate Limiting
- Limit API calls for expensive operations
- Implement rate limiting on:
  - Embedding generation
  - File uploads
  - Search queries
- Use exponential backoff for retries

### 6. File Scanning
- Scan uploaded files for malware
- Implement virus scanning integration
- Quarantine suspicious files
- Log security events

### 7. Signed URLs
- Use temporary signed URLs for downloads
- Set appropriate expiration times
- Include user context in signatures
- Revoke URLs when permissions change

### 8. Data Encryption
- Encrypt sensitive metadata
- Use TLS for all communications
- Encrypt data at rest (Supabase handles this)
- Consider client-side encryption for sensitive files

---

## Performance Optimization

### Database Optimization

1. **Indexing**
   - Create indexes on frequently queried columns
   - Use composite indexes for multi-column queries
   - Monitor index usage with `pg_stat_user_indexes`

2. **Query Optimization**
   - Use `EXPLAIN ANALYZE` for slow queries
   - Avoid N+1 queries
   - Use joins efficiently
   - Implement pagination for large datasets

3. **Connection Pooling**
   - Supabase provides connection pooling
   - Monitor connection usage
   - Adjust pool size if needed

### Frontend Optimization

1. **Virtual Scrolling**
   - Use `react-window` for large lists
   - Implement virtualized table rows
   - Lazy load images

2. **Code Splitting**
   - Use dynamic imports for heavy components
   - Split by route
   - Load components on demand

3. **Caching**
   - Cache API responses
   - Use SWR or React Query for data fetching
   - Implement cache invalidation strategy

4. **Image Optimization**
   - Use Next.js Image component
   - Generate thumbnails on upload
   - Serve appropriate sizes

### Backend Optimization

1. **Batch Operations**
   - Batch database writes
   - Batch embedding generation
   - Use transactions for consistency

2. **Background Jobs**
   - Move embedding generation to background
   - Use Supabase Edge Functions for async tasks
   - Implement job queue for long-running tasks

3. **CDN Usage**
   - Serve static files from CDN
   - Cache API responses
   - Use Supabase CDN for storage

### Qdrant Optimization

1. **Indexing Strategy**
   - Use HNSW index for fast similarity search
   - Tune index parameters (ef, m)
   - Monitor index performance

2. **Payload Filtering**
   - Use efficient payload filters
   - Index filter fields
   - Avoid complex filter queries

3. **Batch Operations**
   - Batch upsert operations
   - Batch search queries
   - Use streaming for large result sets

---

## Testing Strategy

### Unit Tests

- Test all service layer functions
- Test repository methods with mock DB
- Test component rendering
- Test utility functions

### Integration Tests

- Test API routes end-to-end
- Test database operations
- Test file upload flow
- Test embedding generation

### E2E Tests

- Test user flows (create collection, add rows, etc.)
- Test file upload and preview
- Test search functionality
- Test sharing functionality

### Performance Tests

- Load test file uploads
- Stress test search queries
- Test with large datasets
- Monitor memory usage

---

## Deployment Checklist

### Database
- [ ] Run all migration files
- [ ] Verify RLS policies
- [ ] Create storage buckets
- [ ] Set up storage policies
- [ ] Test database connections

### Qdrant
- [ ] Set up Qdrant instance
- [ ] Create collections
- [ ] Test connection
- [ ] Configure authentication
- [ ] Test embedding operations

### Environment
- [ ] Set all environment variables
- [ ] Configure CORS
- [ ] Set up rate limiting
- [ ] Configure logging
- [ ] Set up monitoring

### Application
- [ ] Build application
- [ ] Run tests
- [ ] Deploy to Vercel
- [ ] Configure domain
- [ ] Set up SSL
- [ ] Test production deployment

---

## Monitoring and Maintenance

### Metrics to Monitor

- Database query performance
- API response times
- File upload success rates
- Embedding generation times
- Search query performance
- Error rates
- User engagement

### Logging

- Log all file operations
- Log search queries
- Log errors with stack traces
- Log security events
- Log performance metrics

### Backups

- Regular database backups (Supabase handles this)
- Backup Qdrant collections
- Backup file storage
- Test restore procedures

### Maintenance Tasks

- Clean up old file versions
- Clean up unused embeddings
- Optimize database indexes
- Update dependencies
- Review security policies

---

## Future Enhancements

### DataGrid Enhancements
- Real-time collaboration (multi-user editing)
- Formulas and calculated columns
- Conditional formatting
- Data validation rules
- Import from CSV/Excel
- Advanced charting and visualization
- API access to collections
- Webhooks for data changes

### Documents Enhancements
- OCR for scanned documents
- Audio/video transcription
- Advanced image recognition
- Document comparison
- E-signature integration
- Workflow automation
- Advanced permissions (roles, groups)
- Integration with external services (Google Drive, Dropbox)
- Advanced analytics (usage patterns, popular files)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding two powerful feature spaces to ChatUI. The architecture follows existing patterns in the codebase, maintains type safety, and prioritizes performance and security.

The phased approach allows for incremental delivery and validation at each stage. By following this plan, you can build robust, scalable features that integrate seamlessly with the existing application.

---

**Document Version:** 1.0  
**Last Updated:** April 12, 2026  
**Author:** Implementation Plan
