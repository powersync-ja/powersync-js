#include "PowerSyncCore.h"
#include <stdio.h>
#include "SQLCipher/sqlite3.h"

extern int sqlite3_powersync_init(
    sqlite3 *db,                              // Database handle
    const char **pzErrMsg,                    // Error message out parameter
    const struct sqlite3_api_routines *pThunk // SQLite API routines
);

int register_powersync(void) {
    return sqlite3_auto_extension((void(*)(void))sqlite3_powersync_init);
}
