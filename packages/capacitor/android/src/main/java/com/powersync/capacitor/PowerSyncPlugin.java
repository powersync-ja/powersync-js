package com.powersync.capacitor;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PowerSync")
public class PowerSyncPlugin extends Plugin {

    private PowerSync implementation = new PowerSync();

    @PluginMethod
    public void registerCore(PluginCall call) {
        JSObject ret = new JSObject();
        // For Android we don't statically register the library, so we always return 0
        ret.put("responseCode", 0);
        call.resolve(ret);
    }
}
