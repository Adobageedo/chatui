# File Manager - Drag & Drop Upload

## Features Implemented

### 1. **New Button with Dropdown Menu**
Located in the file toolbar, the "New" button provides quick access to:
- **Create Folder** - Creates a new folder in the current directory
- **Upload File** - Opens file picker to upload one or multiple files
- **Upload Folder** - Opens folder picker to upload entire folder structures

### 2. **Drag & Drop Functionality**

#### Drop Zones
The entire file content area acts as a drop zone:
- **Empty folders** - Shows "Drop files here" message
- **Grid view** - Overlay appears when dragging files over the grid
- **List view** - Overlay appears when dragging files over the table

#### Visual Feedback
When dragging files over the drop zone:
- Semi-transparent blue overlay (`bg-primary/10`)
- Dashed border (`border-2 border-dashed border-primary`)
- Upload icon with "Drop files or folders here" message
- Overlay disappears on drop or when dragging away

#### Supported Drop Types
1. **Single file** - Uploads the file to the current folder
2. **Multiple files** - Uploads all files in parallel
3. **Folder** - Recursively uploads entire folder structure including:
   - All files in the folder
   - All subfolders and their contents
   - Maintains folder hierarchy (flattened to current folder)

### 3. **Technical Implementation**

#### Hook: `useFileDrop`
Located at `hooks/files/use-file-drop.ts`

**Responsibilities:**
- Manages drag state (`isDragging`)
- Handles drag events (enter, over, leave, drop)
- Processes dropped files/folders using `webkitGetAsEntry` API
- Recursively reads folder contents
- Uploads all files via the store's `uploadFiles` method

**Key Functions:**
- `processEntry()` - Recursively processes files and directories
- `readDirectory()` - Reads all entries from a directory
- `getFileFromEntry()` - Converts FileSystemFileEntry to File

#### Updated Component: `FileContent`
Located at `components/files/file-content.tsx`

**Changes:**
- Integrated `useFileDrop` hook
- Added drag event handlers to all view modes (empty, grid, list)
- Distinguishes between external file drops and internal item moves
- Renders overlay when `isDragging` is true

### 4. **Browser Support**

Uses the **File System Access API** (`webkitGetAsEntry`):
- ✅ Chrome/Edge (full support)
- ✅ Safari (full support)
- ✅ Firefox (partial support - may not handle folders)

**Fallback:** If browser doesn't support folder upload, users can still:
- Use the "Upload Folder" button
- Drag and drop individual files

### 5. **User Experience**

**Workflow:**
1. Navigate to any folder
2. Drag files/folders from your desktop
3. Visual overlay appears showing drop zone
4. Release to upload
5. Toast notifications show progress and completion
6. Files appear in the current folder immediately

**Error Handling:**
- If no folder is selected, shows error toast
- If upload fails, shows error toast
- Silently skips files that can't be read

## Usage Examples

### Upload a Single File
1. Navigate to target folder
2. Drag file from desktop
3. Drop on the file manager area

### Upload Multiple Files
1. Select multiple files on desktop
2. Drag them all together
3. Drop on the file manager area

### Upload an Entire Folder
1. Drag a folder from desktop
2. Drop on the file manager area
3. All files and subfolders will be uploaded (flattened)

**Note:** Currently, the folder structure is flattened, meaning all files from subfolders are uploaded to the current folder. To preserve hierarchy, you'd need to create folders via the API first, then upload files to the appropriate folders.

## Future Enhancements

- **Preserve folder hierarchy** - Create nested folders before uploading files
- **Upload progress indicators** - Show progress for large uploads
- **Drag to folder items** - Drop files directly on folders to upload there
- **Folder size limits** - Warn before uploading very large folders
- **File type filtering** - Optionally restrict file types
