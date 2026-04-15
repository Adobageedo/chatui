import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FileManager } from "./file-manager";

export default function FilesPage() {
  return (
    <ProtectedRoute>
      <FileManager />
    </ProtectedRoute>
  );
}
