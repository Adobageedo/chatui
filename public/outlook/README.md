# ChatAI Outlook Add-in

This Outlook add-in integrates ChatAI with Outlook, providing AI-powered email assistance through an iframe-based architecture.

## Architecture Overview

The add-in uses a modern iframe-based approach:
- **taskpane.html**: Lightweight HTML file that loads the Next.js app in an iframe
- **Email Context Extraction**: Uses Office.js API to extract email details (subject, from, to, body)
- **Communication**: postMessage API for bidirectional communication between taskpane and iframe
- **Authentication**: Supabase auth integrated with the main ChatAI application
- **Chat Interface**: The full ChatAI `/outlook` page runs inside the iframe with email context

## Features

- **Supabase Authentication**: Uses the same auth system as ChatAI web app
- **Email Context Detection**: Automatically extracts current email details using Office.js
- **AI Assistant**: Full ChatAI interface with email context pre-loaded
- **Content Insertion**: Insert AI-generated content directly into email compose window
- **New Email Creation**: Create new emails with AI-generated content
- **Real-time Updates**: Responds to email item changes in Outlook

## Project Structure

```
outlook-addin/
│
├── assets/            # Icons and images for the add-in
│
├── css/
│   └── taskpane.css   # Styling (minimal, mostly inline styles used)
│
├── js/
│   └── taskpane.js    # Legacy JavaScript (no longer used, functionality moved to taskpane.html)
│
├── commands.html      # UI-less button commands (optional, for quick actions)
├── manifest.xml       # Add-in manifest definition (needs URL configuration)
├── taskpane.html      # Main taskpane - loads Next.js app in iframe
├── server.py          # Python HTTPS server for local development (optional)
├── setup-local-test.sh # Script to set up local testing
└── README.md          # This file
```

## Next.js Integration

The add-in integrates with the main Next.js app at `/app/outlook/`:
- `/app/outlook/page.tsx`: Main outlook assistant page (loads when authenticated)
- `/app/outlook/signin/page.tsx`: Sign-in page for Supabase auth
- `/app/outlook/outlook-assistant.tsx`: Component that handles Office.js integration and email context
- `/app/outlook/layout.tsx`: Loads Office.js script

## Setup Instructions

### 1. Configure manifest.xml

Replace all instances of `YOUR_DOMAIN_HERE` in `manifest.xml` with your actual domain:
- For local development: `http://localhost:3000`
- For production: `https://yourdomain.com`

Generate a new GUID for the `<Id>` element if needed.

### 2. Serve the add-in files

The add-in files (taskpane.html, assets, manifest.xml) need to be served via HTTPS. Options:

**Option A: Serve from Next.js public folder**
```bash
# Copy outlook-addin files to public/outlook/
cp -r outlook-addin/* public/outlook/
# Files will be available at https://yourdomain.com/outlook/
```

**Option B: Use the Python server (for local testing)**
```bash
cd outlook-addin
python3 server.py
# Serves at https://localhost:8443
```

**Option C: Use ngrok for local testing**
```bash
ngrok http 8443
# Update manifest.xml with the ngrok URL
```

### 3. Sideload the add-in in Outlook

1. Open Outlook on the web (outlook.office.com)
2. Go to Settings > Manage add-ins
3. Click "Custom add-ins" > "Add from URL"
4. Enter the URL to your manifest.xml
5. Follow the prompts to install

### 4. Configure the iframe URL in taskpane.html

Update the `APP_BASE_URL` in taskpane.html to match your environment:
```javascript
const APP_BASE_URL = window.location.hostname.includes('localhost') 
    ? 'http://localhost:3000' 
    : 'https://chatui-nine-mu.vercel.app';
```

## Communication Protocol

### Taskpane → Iframe (Email Context)
```javascript
{
  type: 'OUTLOOK_EMAIL_CONTEXT',
  data: {
    subject: string,
    from: string,
    to: string[],
    body: string,
    itemType: string,
    cc: string[],
    bcc: string[]
  }
}
```

### Iframe → Taskpane (Actions)
```javascript
// Request email context
{ type: 'OUTLOOK_GET_EMAIL_CONTEXT' }

// Insert content into email
{ type: 'OUTLOOK_INSERT_CONTENT', data: { content: string } }

// Create new email
{ type: 'OUTLOOK_NEW_EMAIL', data: { subject: string, body: string } }
```

## Implementation Notes

- The taskpane.html uses Office.js to extract email context
- Context is passed to the iframe via postMessage
- The iframe runs the full ChatAI application with `?outlook=true` parameter
- Email context is stored in localStorage for the chat system to access
- The iframe handles authentication - redirects to `/outlook/signin` if not authenticated
- Office.js script is loaded via the Next.js layout at `/app/outlook/layout.tsx`

## Development Workflow

1. Start the Next.js dev server: `npm run dev`
2. Serve the add-in files (via public folder or separate server)
3. Sideload the add-in in Outlook
4. Open an email in Outlook
5. Click the "ChatAI Assistant" button to open the taskpane
6. Sign in with Supabase credentials
7. Chat with AI about the current email

## Troubleshooting

**Add-in not loading:**
- Ensure manifest.xml URLs are correct and accessible
- Check that Office.js is loading (console logs)
- Verify HTTPS is used (required for Office add-ins)

**Email context not showing:**
- Check that an email is selected or open
- Look for console errors in the taskpane
- Verify Office.js API calls are succeeding

**Authentication issues:**
- Ensure Supabase is properly configured in Next.js
- Check that the iframe can access the Supabase session
- Verify redirect URLs in Supabase settings include your domain
