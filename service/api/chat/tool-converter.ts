import { tool, zodSchema } from "ai";
import { z } from "zod";

/**
 * Tool Converter Utility
 * Converts assistant-ui tool definitions to AI SDK format
 * 
 * Note: For LocalRuntime, tools execute on the frontend.
 * Backend only needs tool definitions so the model knows what tools are available.
 */

export interface AssistantUITool {
  description?: string;
  parameters: any; // This will be a Zod schema object
  execute?: (args: any) => Promise<any>;
}

/**
 * Convert assistant-ui tools from context to AI SDK tool format
 * 
 * CURRENT IMPLEMENTATION:
 * Due to Zod schema serialization complexity and AI SDK API constraints,
 * we use a hybrid approach:
 * 1. Frontend registers tools with useAui({ tools: Tools({ toolkit }) })
 * 2. Frontend passes tool names to backend via context.tools
 * 3. Backend uses matching tool definitions (must have same names)
 * 4. Model calls tools, backend streams tool-call parts
 * 5. Frontend LocalRuntime executes the frontend tool.execute() automatically
 * 
 * This is the recommended LocalRuntime pattern per documentation.
 * 
 * @param frontendTools - Tools from context.tools
 * @returns null (signals to use backend tools with matching names)
 */
export function convertAssistantUIToolsToAISDK(
  frontendTools: Record<string, AssistantUITool> | null | undefined
): null {
  if (!frontendTools || Object.keys(frontendTools).length === 0) {
    console.log('[Tool Converter] No frontend tools provided');
    return null;
  }

  const toolNames = Object.keys(frontendTools);
  console.log('[Tool Converter] Frontend tools:', toolNames.join(', '));
  console.log('[Tool Converter] → Backend will use matching tool definitions');
  console.log('[Tool Converter] → Tools will execute on frontend via LocalRuntime');
  
  // Return null to signal that backend should use its own tool definitions
  // that match the frontend tool names
  return null;
}

/**
 * Reconstruct a Zod schema from a plain object representation
 * This handles the most common schema types used in tool definitions
 */
function reconstructZodSchema(schemaObj: any): z.ZodType<any> {
  if (!schemaObj || typeof schemaObj !== 'object') {
    return z.any();
  }

  // If it's already a Zod schema, return it
  if (schemaObj._def) {
    return schemaObj;
  }

  // Handle object schemas
  if (schemaObj.type === 'object' && schemaObj.shape) {
    const shape: Record<string, z.ZodType<any>> = {};
    for (const [key, value] of Object.entries(schemaObj.shape)) {
      shape[key] = reconstructZodSchema(value);
    }
    return z.object(shape);
  }

  // Handle basic types
  switch (schemaObj.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      return z.array(reconstructZodSchema(schemaObj.element));
    default:
      // Fallback: assume it's an object and try to parse properties
      if (typeof schemaObj === 'object') {
        const shape: Record<string, z.ZodType<any>> = {};
        for (const [key, value] of Object.entries(schemaObj)) {
          shape[key] = reconstructZodSchema(value);
        }
        return z.object(shape);
      }
      return z.any();
  }
}

/**
 * TODO: Implement proper Zod schema serialization/deserialization
 * 
 * This is complex because:
 * 1. Zod schemas can't be directly JSON.stringify'd
 * 2. Need to preserve all schema properties (descriptions, defaults, etc.)
 * 3. Need to reconstruct functional schemas on the backend
 * 
 * Possible approaches:
 * - Use a library like zod-to-json-schema
 * - Implement custom serialization for common schema types
 * - Pass tool definitions separately from the runtime
 */
