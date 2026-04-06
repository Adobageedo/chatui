// Supabase configuration
const SUPABASE_URL = 'https://easier-snappily-ansley.ngrok-free.dev'; // Replace with your actual Supabase URL from env
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual Supabase anon key

// API endpoint for chat
const API_BASE_URL = "https://chatui-nine-mu.vercel.app";
const API_CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;

// Supabase client (simplified - using REST API directly)
let currentUser = null;
let authToken = null;

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    document.getElementById('auth-section').style.display = 'block';
    initializeApp();
  }
});

// Main application initialization
function initializeApp() {
  // Set up event listeners
  document.getElementById('login-button').addEventListener('click', handleLogin);
  document.getElementById('register-link').addEventListener('click', redirectToRegister);
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  document.getElementById('generate-template-button').addEventListener('click', generateTemplate);
  document.getElementById('insert-template-button').addEventListener('click', insertTemplateToNewEmail);
  document.getElementById('back-button').addEventListener('click', showEmailContext);
  
  // Check authentication state
  checkAuthState();
}

// Authentication state observer
function checkAuthState() {
  // Check for stored session
  const storedUser = localStorage.getItem('outlook_user');
  const storedToken = localStorage.getItem('outlook_token');
  
  if (storedUser && storedToken) {
    currentUser = JSON.parse(storedUser);
    authToken = storedToken;
    
    // User is signed in
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('user-email').textContent = currentUser.email;
    
    // Show email context section
    document.getElementById('email-context-section').style.display = 'block';
    
    // Check if an email is selected or open
    checkEmailContext();
  } else {
    // User is signed out
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('email-context-section').style.display = 'none';
    document.getElementById('template-result-section').style.display = 'none';
  }
}

// Handle login form submission
async function handleLogin() {
  const email = document.getElementById('email-input').value;
  const password = document.getElementById('password-input').value;
  const errorElement = document.getElementById('auth-error');
  
  if (!email || !password) {
    errorElement.textContent = 'Please enter both email and password';
    errorElement.style.display = 'block';
    return;
  }
  
  try {
    // Call Supabase auth API
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Login failed');
    }
    
    const data = await response.json();
    
    // Store user and token
    currentUser = data.user;
    authToken = data.access_token;
    localStorage.setItem('outlook_user', JSON.stringify(currentUser));
    localStorage.setItem('outlook_token', authToken);
    
    // Update UI
    errorElement.style.display = 'none';
    checkAuthState();
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.style.display = 'block';
  }
}

// Redirect to registration page
function redirectToRegister() {
  window.open('https://chatui-nine-mu.vercel.app/signup', '_blank');
}

// Handle logout
function handleLogout() {
  // Clear stored session
  localStorage.removeItem('outlook_user');
  localStorage.removeItem('outlook_token');
  currentUser = null;
  authToken = null;
  
  // Update UI
  checkAuthState();
}

// Check if an email is selected or open
function checkEmailContext() {
  Office.context.mailbox.getCallbackTokenAsync({ isRest: true }, function(result) {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      // Check if we're in a read or compose mode
      const mailboxItem = Office.context.mailbox.item;
      
      if (mailboxItem) {
        // Email is selected or open
        document.getElementById('no-email-selected').style.display = 'none';
        document.getElementById('email-selected').style.display = 'block';
        
        // Get email details - handle both read and compose modes
        // In read mode, subject is a property; in compose mode, it's an object with getAsync()
        if (typeof mailboxItem.subject === 'string') {
          // Read mode - subject is directly available as a string property
          document.getElementById('email-subject').textContent = mailboxItem.subject || '(No subject)';
        } else if (typeof mailboxItem.subject === 'object' && mailboxItem.subject.getAsync) {
          // Compose mode - need to call getAsync()
          mailboxItem.subject.getAsync(function(asyncResult) {
            if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
              document.getElementById('email-subject').textContent = asyncResult.value || '(No subject)';
            }
          });
        } else {
          // Fallback
          document.getElementById('email-subject').textContent = '(No subject data)';
        }
        
        // If in read mode, we can get sender info
        if (mailboxItem.from) {
          document.getElementById('email-from').textContent = mailboxItem.from.emailAddress || mailboxItem.from.displayName || 'Unknown';
        } else {
          document.getElementById('email-from').textContent = 'N/A';
        }
      } else {
        // No email selected or open
        document.getElementById('no-email-selected').style.display = 'block';
        document.getElementById('email-selected').style.display = 'none';
      }
    } else {
      console.error('Error getting callback token:', result.error);
      document.getElementById('no-email-selected').style.display = 'block';
      document.getElementById('email-selected').style.display = 'none';
    }
  });
}

// Generate email template
function generateTemplate() {
  const mailboxItem = Office.context.mailbox.item;
  
  if (!mailboxItem) {
    alert('No email selected or open');
    return;
  }
  
  // Show loading state
  document.getElementById('template-result-section').style.display = 'block';
  document.getElementById('loading-spinner').style.display = 'block';
  document.getElementById('template-content').textContent = '';
  document.getElementById('email-context-section').style.display = 'none';
  
  // Get email subject based on mode
  let emailSubject = '';
  const isReadMode = Office.context.mailbox.item.itemType === Office.MailboxEnums.ItemType.Message;
  
  // Handle both read and compose modes
  if (isReadMode) {
    // Read mode - get subject directly
    emailSubject = typeof mailboxItem.subject === 'string' ? mailboxItem.subject : '(No subject)';
    
    // Get email body
    if (mailboxItem.body && typeof mailboxItem.body.getAsync === 'function') {
      mailboxItem.body.getAsync('text', function(asyncResult) {
        if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
          const emailBody = asyncResult.value;
          // Call API to generate template
          callTemplateGenerationAPI(emailSubject, emailBody);
        } else {
          handleTemplateError('Could not retrieve email content');
        }
      });
    } else {
      // Can't get body, but at least use the subject
      callTemplateGenerationAPI(emailSubject, '');
    }
  } else {
    // Compose mode
    if (mailboxItem.subject && typeof mailboxItem.subject.getAsync === 'function') {
      mailboxItem.subject.getAsync(function(asyncResult) {
        if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
          emailSubject = asyncResult.value || '';
        }
        
        // Get body if possible
        if (mailboxItem.body && typeof mailboxItem.body.getAsync === 'function') {
          mailboxItem.body.getAsync('text', function(bodyResult) {
            const emailBody = bodyResult.status === Office.AsyncResultStatus.Succeeded ? bodyResult.value : '';
            callTemplateGenerationAPI(emailSubject, emailBody);
          });
        } else {
          callTemplateGenerationAPI(emailSubject, '');
        }
      });
    } else {
      // Can't get subject
      callTemplateGenerationAPI('', '');
    }
  }
}

// Authenticated fetch helper function
async function authFetch(url, options = {}) {
  if (!authToken) {
    throw new Error('User not authenticated');
  }
  
  // Add authorization header
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  return fetch(url, authOptions);
}

// Call API to generate template
async function callTemplateGenerationAPI(subject, body) {
  try {
    if (!authToken) {
      handleTemplateError('User not authenticated');
      return;
    }
    
    // Get current email context
    const mailboxItem = Office.context.mailbox.item;
    let from = '';
    let to = [];
    
    if (mailboxItem.from) {
      from = mailboxItem.from.emailAddress || mailboxItem.from.displayName || '';
    }
    
    // Build email context for the API
    const emailContext = {
      platform: 'outlook',
      currentEmail: {
        subject: subject || '',
        from: from,
        to: to,
        body: body || '',
        date: new Date().toISOString()
      }
    };
    
    // Create message for chat API
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Generate a professional email response based on this context:\n\nSubject: ${subject}\nFrom: ${from}\n\nEmail content:\n${body}\n\nPlease write a professional and contextual response.`
          }
        ]
      }
    ];
    
    // Use the authenticated fetch function
    const response = await authFetch(API_CHAT_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        messages: messages,
        emailContext: emailContext,
        reasoningEnabled: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    // Parse streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let generatedText = '';
    
    // Hide loading state
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('template-content').textContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (!line.trim() || !line.startsWith('0:')) continue;
        
        try {
          const json = JSON.parse(line.slice(2));
          if (json.type === 'text-delta' && json.delta) {
            generatedText += json.delta;
            document.getElementById('template-content').textContent = generatedText;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    if (!generatedText) {
      document.getElementById('template-content').textContent = 'No response generated';
    }
  } catch (error) {
    handleTemplateError('Error generating template: ' + error.message);
  }
}

// Handle template generation errors
function handleTemplateError(message) {
  document.getElementById('loading-spinner').style.display = 'none';
  document.getElementById('template-content').innerHTML = `<div class="error-message">${message}</div>`;
}

// Insert template into new email
function insertTemplateToNewEmail() {
  const template = document.getElementById('template-content').textContent;
  
  if (!template || template.trim() === '') {
    alert('No template to insert');
    return;
  }
  
  // Create a new email with the template
  Office.context.mailbox.displayNewMessageForm({
    toRecipients: [],
    subject: '',
    htmlBody: template,
    attachments: []
  });
}

// Show email context section
function showEmailContext() {
  document.getElementById('template-result-section').style.display = 'none';
  document.getElementById('email-context-section').style.display = 'block';
  checkEmailContext(); // Refresh the context in case it changed
}
