const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

/**
 * 1. Hermes & Engine Bytecode Optimization:
 * Strictly enforce Hermes parser, inline requires, and tree-shaking
 */
config.transformer.hermesParser = true;

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
    nonInlinedRequires: [
      "React",
      "react",
      "react-native",
      "expo",
    ],
  },
});

/**
 * Minifier & Dead-Code / Unused Export Elimination (Tree-Shaking):
 * Configured with Terser to drop dead code, unreferenced exports, and debug statements in production.
 */
config.transformer.minifierPath = "metro-minify-terser";
config.transformer.minifierConfig = {
  mangle: {
    toplevel: true,
  },
  compress: {
    reduce_funcs: true,
    drop_console: process.env.NODE_ENV === "production",
    dead_code: true,
    unused: true,
    pure_funcs:
      process.env.NODE_ENV === "production"
        ? ["console.log", "console.info", "console.debug"]
        : [],
    passes: 2,
  },
  output: {
    ascii_only: true,
    quote_style: 3,
    wrap_iife: true,
    comments: false,
  },
  sourceMap: {
    includeSources: false,
  },
  toplevel: true,
};

/**
 * Modern Package Exports & Asset Extensions:
 * Enables package.json "exports" field resolution for zero-cost tree-shaking of packages like date-fns.
 * Provides empty module fallback for optional web peer dependencies, and adds wasm to assetExts.
 */
config.resolver.unstable_enablePackageExports = true;
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@opentelemetry/api": require.resolve("metro-runtime/src/modules/empty-module.js"),
  "html2canvas-pro": require.resolve("metro-runtime/src/modules/empty-module.js"),
};

/**
 * Blocklist / Isolation:
 * Strictly exclude root partner portals (AGEN/, hotel/) and root backend/database directories
 * from consumer app bundling, while preserving client src/services/ modules.
 */
const blockedRoots = [
  path.resolve(__dirname, "AGEN"),
  path.resolve(__dirname, "hotel"),
  path.resolve(__dirname, "backend"),
  path.resolve(__dirname, "storage"),
  path.resolve(__dirname, "supabase"),
];

const blockedRegexes = blockedRoots.map((rootPath) => {
  const normalized = rootPath.replace(/\\/g, "[\\\\/]");
  return new RegExp(`^${normalized}([\\\\/].*)?$`);
});

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  ...blockedRegexes,
];

module.exports = config;
