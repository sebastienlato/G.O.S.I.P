// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "GOSIPCore",
  platforms: [.macOS(.v13), .iOS(.v17)],
  products: [.library(name: "GOSIPCore", targets: ["GOSIPCore"])],
  targets: [
    .target(name: "GOSIPCore", resources: [.process("Resources")]),
    .testTarget(name: "GOSIPCoreTests", dependencies: ["GOSIPCore"]),
  ]
)
