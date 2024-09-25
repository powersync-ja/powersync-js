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
