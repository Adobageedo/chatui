import type { Toolkit } from "@assistant-ui/react";
import { dateTools } from "../tools/date-tools";
import { outlookTools } from "./outlook-tools";

export const outlookToolkit: Toolkit = {
  ...dateTools,
  ...outlookTools,
};
