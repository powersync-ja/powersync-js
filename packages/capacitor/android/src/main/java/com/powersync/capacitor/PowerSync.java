package com.powersync.capacitor;

import com.getcapacitor.Logger;

public class PowerSync {
    static {
        System.loadLibrary("powersync_capacitor"); 
        // Ensures we load this early before registering. 
        System.loadLibrary("sqlcipher");
    }

    public static native int registerPowersync();
}
