#import "PowerSyncOpSqlite.h"

@implementation PowerSyncOpSqlite
RCT_EXPORT_MODULE()

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getBundlePath)
{
    return [NSBundle mainBundle].bundlePath;
}

@end
