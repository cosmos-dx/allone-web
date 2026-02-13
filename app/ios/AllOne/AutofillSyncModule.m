#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AutofillSyncModule, NSObject)

RCT_EXTERN_METHOD(syncPasswords:(NSString *)passwordsJson
                  encryptionKey:(NSString *)encryptionKey
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(clearPasswords:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(isAutofillEnabled:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(requestAutofillSetup:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
