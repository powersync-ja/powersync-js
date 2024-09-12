#ifdef RCT_NEW_ARCH_ENABLED
#import "PowersyncOpSqliteSpec.h"

@interface PowersyncOpSqlite : NSObject <NativePowersyncOpSqliteSpec>
#else
#import <React/RCTBridgeModule.h>

@interface PowersyncOpSqlite : NSObject <RCTBridgeModule>
#endif

@end