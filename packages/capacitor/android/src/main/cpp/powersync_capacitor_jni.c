#include <jni.h>
#include <dlfcn.h>
#include <android/log.h>

#define LOG_TAG "PowerSyncNative"

// Forward declarations (no need for full struct definitions)
typedef struct sqlite3 sqlite3;
typedef struct sqlite3_api_routines sqlite3_api_routines;

typedef int (*sqlite3_auto_extension_fn)(void (*xEntryPoint)(void));

extern int sqlite3_powersync_init(
    sqlite3 *db,                              // Database handle
    const char **pzErrMsg,                    // Error message out parameter
    const struct sqlite3_api_routines *pThunk // SQLite API routines
);

int register_powersync(void) {
    void *handle = dlopen("libsqlcipher.so", RTLD_LAZY);
    if (!handle) {
        __android_log_print(ANDROID_LOG_WARN, LOG_TAG, "Failed to dlopen libsqlcipher.so, trying process handle");
        // Try loading from the process itself
        handle = dlopen(NULL, RTLD_LAZY);
        if (!handle) {
            __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, "Failed to dlopen process handle. SQLCipher symbols not found.");
            return -1;
        }
    } else {
        __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, "Successfully loaded libsqlcipher.so");
    }

    __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, "Resolving sqlite3_auto_extension symbol");
    sqlite3_auto_extension_fn auto_ext = (sqlite3_auto_extension_fn)dlsym(handle, "sqlite3_auto_extension");
    if (!auto_ext) {
        __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, "Failed to resolve sqlite3_auto_extension symbol");
    }


    if (!auto_ext) {
        __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, "Required symbols not found. Aborting registration.");
        dlclose(handle);
        return -2;
    }

    __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, "Registering powersync extension");
    int result = auto_ext((void(*)(void))sqlite3_powersync_init);
    __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, "register_powersync result: %d", result);
    dlclose(handle);
    __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, "Completed register_powersync");
    return result;
}

// JNI wrapper
JNIEXPORT jint JNICALL
Java_com_powersync_capacitor_PowerSync_registerPowersync(JNIEnv *env, jobject thiz) {
    return register_powersync();
}