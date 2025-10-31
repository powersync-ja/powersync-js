#include <jni.h>

// SQLCipher enables dynamic loading of extensions. We don't need to do anything here.
int register_powersync(void) {
  return 0;
}

// JNI wrapper
JNIEXPORT jint JNICALL
Java_com_powersync_capacitor_PowerSync_registerPowersync(JNIEnv *env, jobject thiz) {
    return register_powersync();
}