import Foundation

@objc public class PowerSync: NSObject {
    @objc public func registerCore() throws -> String {
        let result = register_powersync()
        if result != 0 {
            throw NSError(domain: "PowerSyncError", code: Int(result), userInfo: [
                NSLocalizedDescriptionKey: "PowerSync registration failed with code \(result)"
            ])
        }
        return "Success"
    }
}
