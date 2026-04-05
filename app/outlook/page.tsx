import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OutlookAssistant } from "./outlook-assistant";

export default function OutlookPage() {
  return (
    <ProtectedRoute>
      <OutlookAssistant />
    </ProtectedRoute>
  );
}
