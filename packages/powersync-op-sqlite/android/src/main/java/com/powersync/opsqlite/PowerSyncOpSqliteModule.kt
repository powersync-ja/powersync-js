package com.powersync.opsqlite

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class PowerSyncOpSqliteModule internal constructor(context: ReactApplicationContext) :
  PowerSyncOpSqliteSpec(context) {

  @ReactMethod
  override fun getBundlePath(): String {
    //This method should only be used for iOS platforms
    //Ensure you wrap its usage with a (Platform.OS === 'ios') check
    //Returns an empty string for android
    return ""
  }

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "PowerSyncOpSqlite"
  }
}
