/**
 * Toast utility for managing snackbar notifications
 * Provides a simple API similar to Sonner
 */

// Simple EventEmitter implementation for React Native
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  off(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }
}

class ToastManager extends EventEmitter {
  constructor() {
    super();
    this.toasts = [];
    this.maxToasts = 3;
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   * @param {string} options.type - 'success', 'error', 'warning', 'info'
   * @param {string} options.message - Toast message
   * @param {string} options.title - Optional title
   * @param {number} options.duration - Duration in ms (default 3000)
   */
  show({ type = 'info', message, title, duration = 3000 }) {
    const id = Date.now().toString();
    const toast = {
      id,
      type,
      message,
      title,
      duration,
      visible: true,
    };

    this.toasts = [toast, ...this.toasts].slice(0, this.maxToasts);
    this.emit('toast', toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  /**
   * Show success toast
   */
  success(message, title, duration) {
    return this.show({ type: 'success', message, title, duration });
  }

  /**
   * Show error toast
   */
  error(message, title, duration) {
    return this.show({ type: 'error', message, title, duration: duration || 5000 });
  }

  /**
   * Show warning toast
   */
  warning(message, title, duration) {
    return this.show({ type: 'warning', message, title, duration });
  }

  /**
   * Show info toast
   */
  info(message, title, duration) {
    return this.show({ type: 'info', message, title, duration });
  }

  /**
   * Dismiss a toast
   */
  dismiss(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.emit('dismiss', id);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts = [];
    this.emit('dismissAll');
  }

  /**
   * Get current toasts
   */
  getToasts() {
    return this.toasts;
  }
}

export const toast = new ToastManager();
export default toast;

