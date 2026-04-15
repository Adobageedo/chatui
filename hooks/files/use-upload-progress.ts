import { create } from "zustand";

export type UploadItem = {
  id: string;
  name: string;
  type: "upload" | "move";
  status: "uploading" | "complete" | "error";
  progress?: number;
  error?: string;
};

type UploadProgressStore = {
  items: UploadItem[];
  addItem: (item: UploadItem) => void;
  updateItem: (id: string, updates: Partial<UploadItem>) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

export const useUploadProgress = create<UploadProgressStore>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),
  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clear: () => set({ items: [] }),
}));
