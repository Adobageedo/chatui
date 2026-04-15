export const FILE_MANAGER_CONFIG = {
  storage: {
    totalBytes: 15 * 1024 * 1024 * 1024, // 15 GB
  },
  ui: {
    sidebarWidth: 240, // px
    detailsPanelWidth: 320, // px
    gridMinCardWidth: 160, // px
  },
  mimeTypeIcons: {
    pdf: "file-text",
    doc: "file-text",
    docx: "file-text",
    txt: "file-text",
    md: "file-text",
    xls: "file-spreadsheet",
    xlsx: "file-spreadsheet",
    csv: "file-spreadsheet",
    ppt: "presentation",
    pptx: "presentation",
    jpg: "image",
    jpeg: "image",
    png: "image",
    gif: "image",
    webp: "image",
    svg: "image",
    mp4: "video",
    mov: "video",
    avi: "video",
    mkv: "video",
    mp3: "music",
    wav: "music",
    ogg: "music",
    zip: "archive",
    rar: "archive",
    "7z": "archive",
    tar: "archive",
    fig: "pen-tool",
  } as Record<string, string>,
  iconColors: {
    folder: "text-blue-500",
    "folder-open": "text-blue-500",
    "file-text": "text-red-500",
    "file-spreadsheet": "text-green-600",
    presentation: "text-orange-500",
    image: "text-purple-500",
    video: "text-pink-500",
    music: "text-cyan-500",
    archive: "text-amber-600",
    "pen-tool": "text-violet-500",
    file: "text-muted-foreground",
  } as Record<string, string>,
} as const;
