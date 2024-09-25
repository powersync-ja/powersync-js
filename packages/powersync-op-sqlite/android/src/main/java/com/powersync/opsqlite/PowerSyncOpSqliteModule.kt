package com.powersync.opsqlite

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class PowerSyncOpSqliteModule internal constructor(context: ReactApplicationContext) :
  PowerSyncOpSqliteSpec(context) {

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "PowerSyncOpSqlite"
  }
}
