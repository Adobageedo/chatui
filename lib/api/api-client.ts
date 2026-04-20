import { createClient } from "@/lib/supabase/client";

/**
 * API Client
 * Centralized HTTP client for all API requests with auth handling
 */
class ApiClient {
  private static instance: ApiClient | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Get auth token from Supabase session
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // Get auth token for Outlook embedded browser support
      const token = await this.getAuthToken();
      const authHeaders: Record<string, string> = token
        ? { "Authorization": `Bearer ${token}` }
        : {};

      // Detect if we're in Outlook mode
      const isOutlookMode = typeof window !== 'undefined' && 
        (window.location.pathname.startsWith('/outlook') || 
         window.location.search.includes('outlook=true'));
      
      const outlookHeaders: Record<string, string> = isOutlookMode
        ? { "X-Outlook-Mode": "true" }
        : {};

      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...outlookHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.error || error.message || "Request failed");
      }

      // Handle empty responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: "DELETE" });
  }

  /**
   * POST with FormData (for file uploads)
   */
  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.error || error.message || "Upload failed");
      }

      return await response.json();
    } catch (error) {
      console.error(`File upload failed: ${url}`, error);
      throw error;
    }
  }
}

export const apiClient = ApiClient.getInstance();
