// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PowersyncCapacitor",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "PowersyncCapacitor",
            targets: ["PowerSyncPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/sqlcipher/SQLCipher.swift.git", from: "4.0.0"),
        .package(url: "https://github.com/powersync-ja/powersync-sqlite-core-swift.git", from: "0.4.12")
    ],
    targets: [
        .target(
            name: "CPowerSyncCore",
            path: "ios/Sources/CPowerSyncCore",
            publicHeadersPath: "include"),
        .target(
            name: "PowerSyncPlugin",
            dependencies: [
                "CPowerSyncCore",
                .product(name: "SQLCipher", package: "SQLCipher.swift"),
                .product(name: "PowerSyncSQLiteCore", package: "powersync-sqlite-core-swift"),
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/PowerSyncPlugin"),
        .testTarget(
            name: "PowerSyncPluginTests",
            dependencies: ["PowerSyncPlugin"],
            path: "ios/Tests/PowerSyncPluginTests")
    ]
)
