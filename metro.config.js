const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Keep the generated stylesheet virtual so SDK 58 Metro does not hash a
  // transient file under node_modules before its watcher sees it.
  forceWriteFileSystem: false,
});
