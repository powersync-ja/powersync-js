import Foundation

// CocoaPods builds do not need this module import and may fail to resolve it; SwiftPM uses it when available.
#if canImport(CPowerSyncCore)
import CPowerSyncCore
#endif

@objc public class PowerSync: NSObject {
    @objc public func registerCore() -> Int32 {
        return register_powersync()
    }
}
