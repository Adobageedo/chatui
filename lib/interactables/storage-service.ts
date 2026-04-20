/**
 * LocalStorage Service for Interactables
 * Handles persistence of emails and documents
 */

export interface EmailData {
  id: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentData {
  id: string;
  title: string;
  type?: "contract" | "letter" | "report" | "memo" | "other";
  content: string;
  createdAt: number;
  updatedAt: number;
}

class InteractablesStorageService {
  private readonly EMAIL_KEY = "chatui-emails";
  private readonly DOCUMENT_KEY = "chatui-documents";

  // Email operations
  getEmails(): EmailData[] {
    try {
      const data = localStorage.getItem(this.EMAIL_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getEmail(id: string): EmailData | null {
    const emails = this.getEmails();
    return emails.find((e) => e.id === id) || null;
  }

  saveEmail(email: EmailData): void {
    const emails = this.getEmails();
    const index = emails.findIndex((e) => e.id === email.id);
    
    if (index >= 0) {
      emails[index] = { ...email, updatedAt: Date.now() };
    } else {
      emails.push(email);
    }
    
    localStorage.setItem(this.EMAIL_KEY, JSON.stringify(emails));
  }

  deleteEmail(id: string): void {
    const emails = this.getEmails().filter((e) => e.id !== id);
    localStorage.setItem(this.EMAIL_KEY, JSON.stringify(emails));
  }

  clearEmails(): void {
    localStorage.setItem(this.EMAIL_KEY, JSON.stringify([]));
  }

  // Document operations
  getDocuments(): DocumentData[] {
    try {
      const data = localStorage.getItem(this.DOCUMENT_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getDocument(id: string): DocumentData | null {
    const documents = this.getDocuments();
    return documents.find((d) => d.id === id) || null;
  }

  saveDocument(document: DocumentData): void {
    const documents = this.getDocuments();
    const index = documents.findIndex((d) => d.id === document.id);
    
    if (index >= 0) {
      documents[index] = { ...document, updatedAt: Date.now() };
    } else {
      documents.push(document);
    }
    
    localStorage.setItem(this.DOCUMENT_KEY, JSON.stringify(documents));
  }

  deleteDocument(id: string): void {
    const documents = this.getDocuments().filter((d) => d.id !== id);
    localStorage.setItem(this.DOCUMENT_KEY, JSON.stringify(documents));
  }

  clearDocuments(): void {
    localStorage.setItem(this.DOCUMENT_KEY, JSON.stringify([]));
  }

  // Utility methods
  exportEmail(id: string): string {
    const email = this.getEmail(id);
    if (!email) return "";
    
    return `To: ${email.to}
${email.cc ? `Cc: ${email.cc}\n` : ""}${email.bcc ? `Bcc: ${email.bcc}\n` : ""}Subject: ${email.subject}

${email.body}`;
  }

  exportDocument(id: string): string {
    const doc = this.getDocument(id);
    if (!doc) return "";
    
    return `${doc.title}\n${"=".repeat(doc.title.length)}\n\n${doc.content}`;
  }
}

export const storageService = new InteractablesStorageService();
