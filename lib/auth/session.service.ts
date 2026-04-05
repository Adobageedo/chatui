import { APP_CONFIG } from '@/config';

/**
 * Session Service
 * Manages session timeouts and activity tracking
 */
class SessionService {
  private static instance: SessionService | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastActivityTime: number = Date.now();
  private readonly INACTIVITY_TIMEOUT = APP_CONFIG.auth.sessionTimeout;
  private readonly ACTIVITY_CHECK_INTERVAL = APP_CONFIG.auth.activityCheckInterval;
  private onTimeout: (() => void) | null = null;

  private constructor() {}

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Start session timeout monitoring
   */
  startMonitoring(onTimeout: () => void): void {
    this.onTimeout = onTimeout;
    this.lastActivityTime = Date.now();
    this.resetTimeout();
  }

  /**
   * Stop session timeout monitoring
   */
  stopMonitoring(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.onTimeout = null;
  }

  /**
   * Update last activity time
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    return timeSinceLastActivity < this.INACTIVITY_TIMEOUT;
  }

  /**
   * Get remaining time until timeout (in milliseconds)
   */
  getRemainingTime(): number {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    const remaining = this.INACTIVITY_TIMEOUT - timeSinceLastActivity;
    return Math.max(0, remaining);
  }

  /**
   * Reset the timeout timer
   */
  private resetTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.checkInactivity();
    }, this.ACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Check for inactivity and trigger timeout if needed
   */
  private checkInactivity(): void {
    if (!this.isActive() && this.onTimeout) {
      this.onTimeout();
      this.stopMonitoring();
    } else {
      this.resetTimeout();
    }
  }
}

export const sessionService = SessionService.getInstance();
