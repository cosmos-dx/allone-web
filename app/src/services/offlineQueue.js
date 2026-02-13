/**
 * Offline Queue Service
 * Manages offline operations and syncs when connection is restored
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_STORAGE_KEY = 'offline_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_ATTEMPTS = 3;

class OfflineQueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.listeners = [];
    this.isOnline = true;
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the service
   */
  async init() {
    // Load queue from storage
    await this.loadQueue();
    
    // Listen for network changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      // If we just came online, process queue
      if (wasOffline && this.isOnline) {
        console.log('Network restored, processing offline queue');
        this.processQueue();
      }
    });
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }

  /**
   * Load queue from storage
   */
  async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`Loaded ${this.queue.length} items from offline queue`);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }

  /**
   * Save queue to storage
   */
  async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Add operation to queue
   * @param {Object} operation - Operation to add
   * @param {string} operation.type - Operation type (create, update, delete)
   * @param {string} operation.resource - Resource type (password, totp, space, etc.)
   * @param {Object} operation.data - Operation data
   * @param {Function} operation.execute - Function to execute the operation
   */
  async addToQueue(operation) {
    // Check queue size
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      console.warn('Offline queue is full, removing oldest item');
      this.queue.shift();
    }

    const queueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      attempts: 0,
      ...operation,
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    
    // Notify listeners
    this.notifyListeners('added', queueItem);
    
    console.log(`Added operation to offline queue: ${operation.type} ${operation.resource}`);
    
    // Try to process if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Process the queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing offline queue (${this.queue.length} items)`);

    const results = [];
    const remainingQueue = [];

    for (const item of this.queue) {
      try {
        // Execute the operation
        if (typeof item.execute === 'function') {
          await item.execute();
        } else {
          console.warn('Queue item missing execute function:', item);
        }
        
        results.push({ item, success: true });
        this.notifyListeners('processed', item);
        console.log(`Successfully processed: ${item.type} ${item.resource}`);
      } catch (error) {
        console.error(`Failed to process queue item:`, error);
        
        item.attempts += 1;
        item.lastError = error.message;
        
        // Retry if under max attempts
        if (item.attempts < MAX_RETRY_ATTEMPTS) {
          remainingQueue.push(item);
          results.push({ item, success: false, retry: true });
        } else {
          results.push({ item, success: false, retry: false });
          this.notifyListeners('failed', item);
          console.log(`Max retries reached for: ${item.type} ${item.resource}`);
        }
      }
    }

    this.queue = remainingQueue;
    await this.saveQueue();
    
    this.isProcessing = false;
    
    console.log(`Queue processing complete. ${this.queue.length} items remaining`);
    
    return results;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      isOnline: this.isOnline,
      items: this.queue.map((item) => ({
        id: item.id,
        type: item.type,
        resource: item.resource,
        timestamp: item.timestamp,
        attempts: item.attempts,
      })),
    };
  }

  /**
   * Clear the queue
   */
  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners('cleared');
    console.log('Offline queue cleared');
  }

  /**
   * Remove specific item from queue
   */
  async removeItem(itemId) {
    const index = this.queue.findIndex((item) => item.id === itemId);
    if (index !== -1) {
      const item = this.queue[index];
      this.queue.splice(index, 1);
      await this.saveQueue();
      this.notifyListeners('removed', item);
      console.log(`Removed item from queue: ${itemId}`);
      return true;
    }
    return false;
  }

  /**
   * Add listener for queue events
   * @param {Function} listener - Callback function (event, item)
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, item) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, item);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }
}

// Create singleton instance
const offlineQueueService = new OfflineQueueService();

export default offlineQueueService;
