/**
 * Background Service for syncing data
 * Runs in the background to keep data synchronized
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { passwordService } from './passwordService';
import { totpService } from './totpService';
import { spaceService } from './spaceService';

const BACKGROUND_SYNC_TASK = 'background-sync';

/**
 * Background sync task
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    // Get auth headers from storage
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    if (!sessionToken) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const headers = {
      Authorization: `Bearer ${sessionToken}`,
    };

    // Sync passwords
    try {
      const passwords = await passwordService.getAll(null, true, headers);
      await AsyncStorage.setItem('synced_passwords', JSON.stringify({
        data: passwords,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Background sync: Failed to sync passwords:', error);
    }

    // Sync TOTPs
    try {
      const totps = await totpService.getAll(null, true, headers);
      await AsyncStorage.setItem('synced_totps', JSON.stringify({
        data: totps,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Background sync: Failed to sync TOTPs:', error);
    }

    // Sync spaces
    try {
      const spaces = await spaceService.getAll(headers);
      await AsyncStorage.setItem('synced_spaces', JSON.stringify({
        data: spaces,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Background sync: Failed to sync spaces:', error);
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background sync error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background sync task
 */
export async function registerBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background sync registered');
    }
  } catch (error) {
    console.error('Failed to register background sync:', error);
  }
}

/**
 * Unregister background sync task
 */
export async function unregisterBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('Background sync unregistered');
    }
  } catch (error) {
    console.error('Failed to unregister background sync:', error);
  }
}

/**
 * Manual sync trigger
 */
export async function triggerSync() {
  try {
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    if (!sessionToken) {
      throw new Error('No session token available');
    }

    const headers = {
      Authorization: `Bearer ${sessionToken}`,
    };

    // Sync all data
    const [passwords, totps, spaces] = await Promise.all([
      passwordService.getAll(null, true, headers).catch(() => []),
      totpService.getAll(null, true, headers).catch(() => []),
      spaceService.getAll(headers).catch(() => []),
    ]);

    // Store synced data
    await Promise.all([
      AsyncStorage.setItem('synced_passwords', JSON.stringify({
        data: passwords,
        timestamp: Date.now(),
      })),
      AsyncStorage.setItem('synced_totps', JSON.stringify({
        data: totps,
        timestamp: Date.now(),
      })),
      AsyncStorage.setItem('synced_spaces', JSON.stringify({
        data: spaces,
        timestamp: Date.now(),
      })),
    ]);

    return { passwords, totps, spaces };
  } catch (error) {
    console.error('Manual sync error:', error);
    throw error;
  }
}

