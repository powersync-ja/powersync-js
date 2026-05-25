#include "PowerSyncCore.h"
#include <stdio.h>

// SQLCipher provides this API at link time. Avoid importing SQLCipher.h here:
// its umbrella header imports Foundation, which breaks this plain C target.
typedef struct sqlite3 sqlite3;
typedef struct sqlite3_api_routines sqlite3_api_routines;

int sqlite3_auto_extension(void (*xEntryPoint)(void));

extern int sqlite3_powersync_init(
    sqlite3 *db,                              // Database handle
    const char **pzErrMsg,                    // Error message out parameter
    const sqlite3_api_routines *pThunk        // SQLite API routines
);

int register_powersync(void) {
    return sqlite3_auto_extension((void(*)(void))sqlite3_powersync_init);
}
