// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.4"),
        .package(name: "PowersyncCapacitor", path: "../../../node_modules/@powersync/capacitor"),
        .package(name: "CapacitorCommunitySqlite", path: "../../../node_modules/.pnpm/@capacitor-community+sqlite@8.1.0_@capacitor+core@8.3.4/node_modules/@capacitor-community/sqlite")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "PowersyncCapacitor", package: "PowersyncCapacitor"),
                .product(name: "CapacitorCommunitySqlite", package: "CapacitorCommunitySqlite")
            ]
        )
    ]
)
