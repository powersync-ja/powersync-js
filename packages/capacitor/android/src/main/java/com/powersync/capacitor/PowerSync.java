package com.powersync.capacitor;

import com.getcapacitor.Logger;

public class PowerSync {

    public String echo(String value) {
        Logger.info("Echo", value);
        return value;
    }
}
