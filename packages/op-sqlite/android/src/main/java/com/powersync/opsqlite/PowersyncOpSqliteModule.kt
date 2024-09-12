package com.powersync.opsqlite

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReactContextBaseJavaModule

class PowersyncOpSqliteModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = NAME

  fun foo(a: Double, b: Double, promise: Promise) {
    promise.resolve(a + b)
  }

  companion object {
    const val NAME = "PowersyncOpSqlite"
  }
}