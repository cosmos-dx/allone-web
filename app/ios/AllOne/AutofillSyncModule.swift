import Foundation
import React

/**
 * React Native module for syncing passwords to iOS autofill extension via App Groups
 */
@objc(AutofillSyncModule)
class AutofillSyncModule: NSObject {
  
  private let appGroupIdentifier = "group.com.allone.co.in"
  private let passwordsCacheKey = "passwords_cache"
  private let encryptionKeyKey = "encryption_key"
  
  /**
   * Sync passwords to shared app group storage
   */
  @objc
  func syncPasswords(_ passwordsJson: String, encryptionKey: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("STORAGE_ERROR", "Failed to access app group storage", nil)
      return
    }
    
    guard let passwordsData = passwordsJson.data(using: .utf8) else {
      rejecter("ENCODING_ERROR", "Failed to encode passwords JSON", nil)
      return
    }
    
    // Store passwords in shared storage
    userDefaults.set(passwordsData, forKey: passwordsCacheKey)
    userDefaults.set(encryptionKey, forKey: encryptionKeyKey)
    userDefaults.synchronize()
    
    // Parse to get count
    do {
      if let passwordsArray = try JSONSerialization.jsonObject(with: passwordsData) as? [[String: Any]] {
        print("Successfully synced \(passwordsArray.count) passwords to autofill")
      }
    } catch {
      print("Failed to parse passwords for logging: \(error)")
    }
    
    resolver(true)
  }
  
  /**
   * Clear autofill storage
   */
  @objc
  func clearPasswords(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      rejecter("STORAGE_ERROR", "Failed to access app group storage", nil)
      return
    }
    
    userDefaults.removeObject(forKey: passwordsCacheKey)
    userDefaults.removeObject(forKey: encryptionKeyKey)
    userDefaults.synchronize()
    
    print("Autofill storage cleared")
    resolver(true)
  }
  
  /**
   * Check if autofill is enabled
   */
  @objc
  func isAutofillEnabled(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // On iOS, we can't directly check if autofill is enabled
    // Just return true if we can access app group storage
    let isEnabled = UserDefaults(suiteName: appGroupIdentifier) != nil
    resolver(isEnabled)
  }
  
  /**
   * Request autofill setup
   */
  @objc
  func requestAutofillSetup(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // On iOS, we can't programmatically open autofill settings
    // User needs to go to Settings > Passwords > AutoFill Passwords manually
    resolver(false)
  }
  
  /**
   * Required for React Native bridge
   */
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
