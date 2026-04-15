import type { Toolkit } from "@assistant-ui/react";
import { dateTools } from "./tools/date-tools";

export const appToolkit: Toolkit = {
  ...dateTools,
};
