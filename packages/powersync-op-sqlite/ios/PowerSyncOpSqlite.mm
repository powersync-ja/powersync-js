#import "PowerSyncOpSqlite.h"
#ifdef RCT_NEW_ARCH_ENABLED
#import <RNPowerSyncOpSqliteSpec/RNPowerSyncOpSqliteSpec.h>
#endif

@implementation PowerSyncOpSqlite
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(getBundlePath:
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSString* bundlePath = [NSBundle mainBundle].bundlePath;
    resolve(bundlePath);
}

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativePowerSyncOpSqliteSpecJSI>(params);
}
#endif

@end
