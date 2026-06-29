package com.powersync.opsqlite

import java.io.File
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.uimanager.ViewManager

class PowerSyncOpSqlitePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf<NativeModule>(NativePowerSyncHelper(reactContext))
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> {
    return emptyList()
  }
}

private class NativePowerSyncHelper(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
  @ReactMethod(isBlockingSynchronousMethod = true)
  @DoNotStrip
  fun resolveDefaultDatabaseLocation(dbName: String): String? {
    // OP-sqlite uses context.getDatabasePath() as a default location for databases, but previous
    // versions of the PowerSync React Native SDK used React Native Quick SQLite, which used
    // context.getFileDir() instead. So, check if an old database exists and keep using the existing
    // path for backwards compatibility.
    val context = reactApplicationContext
    val oldDirectory = context.filesDir
    val filesPath = File(oldDirectory, dbName)
    if (filesPath.exists()) {
      return oldDirectory.absolutePath;
    }
    return null;
  }

  override fun getName(): String = NAME

  companion object {
    const val NAME: String = "NativePowerSyncHelper"
  }
}
