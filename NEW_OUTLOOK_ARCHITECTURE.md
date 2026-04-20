# New Outlook Architecture - Self-Contained Page

## What Changed

### Before
- taskpane.html → redirects → /outlook/signin → redirects → /outlook chat
- Multiple pages with complex routing
- Session management across redirects
- Difficult to debug

### After  
- taskpane.html (iframe) → **/outlook** (single self-contained page)
- **Everything in one place**: signin form + chat interface
- No redirects, no separate pages
- Simple, linear flow

## New Architecture

### 1. taskpane.html (Static HTML)
```
┌─────────────────────────────────┐
│  taskpane.html                  │
│  - Extracts email context       │
│  - Stores in sessionStorage     │
│  - Loads /outlook in iframe     │
└─────────────────────────────────┘
```

**File**: `/public/outlook/taskpane.html`
- Minimal static HTML (required by Office add-ins)
- Extracts email context via Office.js API
- Stores context in sessionStorage
- Loads `/outlook` in iframe (same origin = no CORS issues)

### 2. /outlook Page (Self-Contained)
```
┌─────────────────────────────────┐
│  /outlook Route                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Not Authenticated?        │  │
│  │ → Show signin form        │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Authenticated?            │  │
│  │ → Show chat interface     │  │
│  │ → Display email context   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Component**: `OutlookStandalone`
- ✅ Office.js initialization check
- ✅ Built-in signin form (no redirect)
- ✅ Built-in chat interface
- ✅ Email context extraction
- ✅ Session management
- ✅ All in one component

## Code Structure

### OutlookStandalone Component

**Location**: `/app/outlook/outlook-standalone.tsx`

**Stages**:

1. **Loading Office.js**
   ```tsx
   if (!isOfficeReady) {
     return <Loader>Loading Office.js...</Loader>
   }
   ```

2. **Checking Auth**
   ```tsx
   if (isAuthenticated === null) {
     return <Loader>Checking authentication...</Loader>
   }
   ```

3. **Signin Form** (if not authenticated)
   ```tsx
   if (!isAuthenticated) {
     return (
       <div>
         <input type="email" />
         <input type="password" />
         <button>Sign in</button>
       </div>
     )
   }
   ```

4. **Chat Interface** (if authenticated)
   ```tsx
   return (
     <MyRuntimeProvider>
       <Header emailContext={emailContext} />
       <Thread />
     </MyRuntimeProvider>
   )
   ```

## Authentication Flow

```
1. User opens Outlook add-in
   ↓
2. taskpane.html loads /outlook
   ↓
3. /outlook checks session
   ↓
4a. Has session? → Show chat
4b. No session?  → Show signin form
   ↓
5. User signs in
   ↓
6. Session created → Component re-renders
   ↓
7. Show chat interface
```

**No redirects. No page changes. All in one component.**

## Benefits

✅ **Simpler**: One page instead of multiple  
✅ **Faster**: No redirects = instant loading  
✅ **Debuggable**: All logic in one place  
✅ **Reliable**: No session loss across redirects  
✅ **CORS-friendly**: iframe is same-origin  

## CORS Fixes (Also Included)

Even though the iframe is same-origin, the API calls from the chat interface still need CORS support for the Authorization header:

✅ **OPTIONS handlers** on all API routes  
✅ **CORS headers** on all responses  
✅ **Middleware bypass** for OPTIONS requests  
✅ **Global headers** in next.config.ts  

## Files Modified

### New Files
- `/app/outlook/outlook-standalone.tsx` - Self-contained component
- `/lib/api/cors.ts` - CORS utility
- `NEW_OUTLOOK_ARCHITECTURE.md` - This file

### Modified Files
- `/app/outlook/page.tsx` - Use OutlookStandalone
- `/public/outlook/taskpane.html` - Simplified iframe loader
- `/app/api/**/*.ts` - Added CORS support (9 routes)
- `/middleware.ts` - Skip auth for OPTIONS
- `/next.config.ts` - Global CORS headers

## Testing

After Vercel deployment completes:

1. **Open Outlook**
2. **Open the add-in**
3. **Should see**: Loading → Signin form
4. **Sign in**
5. **Should see**: Chat interface with email context
6. **No errors in console**

## Deployment Status

🚀 **Committed**: `f515500`  
🚀 **Pushed**: To `origin/main`  
⏳ **Deploying**: Vercel is building now...  

**Check deployment**: https://vercel.com/your-project/deployments

## Troubleshooting

**Still seeing 405 errors?**
- Wait for Vercel deployment to complete
- Clear browser cache
- Reload Outlook add-in

**Can't sign in?**
- Check Supabase URL in env vars
- Check if credentials are correct
- Check browser console for errors

**No email context?**
- Check Office.js is loaded
- Check sessionStorage in browser dev tools
- Try opening/closing a different email

---

**Status**: ✅ Code deployed, waiting for Vercel build  
**Next**: Test in Outlook once deployment completes
