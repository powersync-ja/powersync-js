#import <React/RCTBridgeModule.h>
#ifdef RCT_NEW_ARCH_ENABLED
#import <RNPowerSyncOpSqliteSpec/RNPowerSyncOpSqliteSpec.h>
#endif

@interface PowerSyncOpSqlite : NSObject <RCTBridgeModule>

@end

#ifdef RCT_NEW_ARCH_ENABLED
@interface PowerSyncOpSqlite () <NativePowerSyncOpSqliteSpec>

@end
#endif

// @interface PowerSyncOpSqlite : NSObject <NativePowerSyncOpSqliteSpec>
// #ifdef RCT_NEW_ARCH_ENABLED
// #import <React/RCTBridgeModule.h>

// @interface PowerSyncOpSqlite : NSObject <RCTBridgeModule>
// #endif
// @end
