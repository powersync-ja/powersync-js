package com.powersync.capacitor;

public class PowerSync {
    static {
        System.loadLibrary("powersync_capacitor"); 
    }

    public static native int registerPowersync();
}
