import Foundation

@objc public class PowerSync: NSObject {
    @objc public func registerCore() -> Int32 {
        return register_powersync()
    }
}
