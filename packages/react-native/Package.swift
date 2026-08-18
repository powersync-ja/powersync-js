// swift-tools-version: 6.0
import PackageDescription

// When updating this, also update the version in powersync-react-native.podspec and android/build.gradle
let coreExtensionVersion: Version = "0.5.2"

let packageName = "ReactNative"

let package = Package(
    name: packageName,
    platforms: [.iOS(.v15)],
    products: [
        .library(name: packageName, targets: [packageName])
    ],
    dependencies: [
        .package(
            url: "https://github.com/powersync-ja/powersync-sqlite-core-swift.git",
            exact: coreExtensionVersion,
        )
    ],
    targets: [
        .target(
            name: packageName,
            dependencies: [
                .product(name: "PowerSyncSQLiteCore", package: "powersync-sqlite-core-swift"),
            ],
            path: "ios/swiftpm",
        )
    ],
)
