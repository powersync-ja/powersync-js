import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(PowerSyncPlugin)
public class PowerSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PowerSyncPlugin"
    public let jsName = "PowerSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "registerCore", returnType: CAPPluginReturnPromise)
    ]
    private let implementation = PowerSync()

    @objc func registerCore(_ call: CAPPluginCall) {
        call.resolve([
            "responseCode": implementation.registerCore()
        ])
    }
}