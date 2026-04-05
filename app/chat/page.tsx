import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Assistant } from "./assistant";

export default function Home() {
  return (
    <ProtectedRoute>
      <Assistant />
    </ProtectedRoute>
  );
}
