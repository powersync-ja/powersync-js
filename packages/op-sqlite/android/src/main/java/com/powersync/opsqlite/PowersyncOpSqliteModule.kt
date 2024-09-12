package com.powersync.opsqlite

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.powersyncopsqlite.NativePowersyncOpSqliteSpec

class PowersyncOpSqliteModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = NAME

  @ReactMethod
  fun foo(a: Double, b: Double, promise: Promise) {
    // Use the implementation instance to execute the function.
    implementation.foo(a, b, promise)
  }

  companion object {
    const val NAME = "PowersyncOpSqlite"
  }
}