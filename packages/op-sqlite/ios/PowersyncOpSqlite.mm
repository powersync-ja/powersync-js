#import "PowersyncOpSqlite.h"

@implementation PowersyncOpSqlite
RCT_EXPORT_MODULE()

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativePowersyncOpSqliteSpecJSI>(params);
}
#endif

@end