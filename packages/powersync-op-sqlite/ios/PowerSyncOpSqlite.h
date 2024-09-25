#ifdef RCT_NEW_ARCH_ENABLED
#import "RNPowerSyncOpSqliteSpec.h"

@interface PowerSyncOpSqlite : NSObject <NativePowerSyncOpSqliteSpec>
#else
#import <React/RCTBridgeModule.h>

@interface PowerSyncOpSqlite : NSObject <RCTBridgeModule>
#endif

@end