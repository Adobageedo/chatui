# Testing Tool Execution

## Quick Test

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open the chat** at http://localhost:3000/chat

3. **Ask**: "What's the current date and time?"

4. **Expected behavior**:
   - Model calls `getTodayDate` tool
   - Backend streams tool-call part
   - Frontend LocalRuntime executes the tool automatically
   - Custom UI component renders with the date/time
   - Result shows in a blue bordered card

## What to Check

### Backend Logs (Terminal)
You should see:
```
[ChatService] Frontend tools received: ['getTodayDate']
[Tool Converter] Frontend tools: getTodayDate
[Tool Converter] → Backend will use matching tool definitions  
[Tool Converter] → Tools will execute on frontend via LocalRuntime
[ChatService] → Enabled backend tool: getTodayDate
```

### Frontend (Browser Console)
- No errors about missing tools
- Tool execution happens automatically
- Custom rendering displays correctly

### UI
- Tool appears with collapsible interface
- Shows "Used tool: getTodayDate"
- Custom card with:
  - Blue dot indicator
  - "Current Date & Time" header
  - Large formatted date/time
  - Format, timezone, and timestamp details

## Tool Flow Diagram

```
User: "What's the date?"
    ↓
Frontend: useAui() has getTodayDate registered
    ↓
Adapter: Accesses context.tools → sends to backend
    ↓
Backend: Receives ['getTodayDate'], enables matching tool
    ↓
AI Model: Sees getTodayDate available → decides to call it
    ↓
Backend: Streams tool-call part to frontend
    ↓
Frontend LocalRuntime: Auto-executes getTodayDate.execute()
    ↓
Frontend: Renders getTodayDate.render() component
    ↓
User: Sees beautiful date/time card
```

## Troubleshooting

### Tool not being called
- Check backend logs for "Frontend tools received"
- Verify tool name matches between frontend and backend
- Ensure model has reasoning mode disabled (tools don't work with o1)

### Tool executes on backend instead of frontend  
- This is actually OK! Backend tools execute when model response includes them
- Frontend tools execute when LocalRuntime processes tool-call parts
- Both can coexist - it's the recommended pattern

### Custom UI not showing
- Check that ToolFallback component is imported in thread.tsx
- Verify tool.render() is defined in date-tools.tsx
- Look for errors in browser console

## Adding More Tools

1. **Define tool** in `lib/tools/date-tools.tsx`:
   ```tsx
   export const myToolkit: Toolkit = {
     myNewTool: {
       description: "What my tool does",
       parameters: z.object({
         param1: z.string().describe("Parameter description"),
       }),
       execute: async ({ param1 }) => {
         // Tool logic here
         return { result: "value" };
       },
       render: ({ args, result }) => {
         return <div>Custom UI</div>;
       },
     },
   };
   ```

2. **Add to toolkit** in `lib/toolkit.tsx`:
   ```tsx
   export const appToolkit: Toolkit = {
     ...dateTools,
     ...myToolkit,
   };
   ```

3. **Add backend definition** in `service/api/chat/chat.service.ts`:
   ```tsx
   private getTools() {
     return {
       myNewTool: tool({
         description: "What my tool does",
         parameters: zodSchema(z.object({
           param1: z.string(),
         })),
         execute: async ({ param1 }: { param1: string }) => {
           return { result: "value" };
         },
       }),
     };
   }
   ```

**Important**: Tool names MUST match between frontend and backend!

## Success Criteria

- ✅ Backend logs show frontend tools received
- ✅ Backend enables matching tools
- ✅ Model calls the tool
- ✅ Tool executes (check result in UI)
- ✅ Custom UI renders correctly
- ✅ No errors in console

## Next Steps

- Add more useful tools (weather, calculations, etc.)
- Implement human-in-the-loop approval for sensitive tools
- Add loading states and error handling
- Test with multiple tools in single conversation
