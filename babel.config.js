/**
 * Babel Configuration - Enterprise Performance & Engine Optimization
 * Enforces lazy imports, drops unused export paths across third-party icon libraries and date packages,
 * and strips console telemetry in production.
 */
module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === "production" || process.env.BABEL_ENV === "production";

  /**
   * Tree-shaking plugin for @expo/vector-icons, react-native-vector-icons, and date-fns:
   * Rewrites monolithic barrel imports into granular sub-module imports,
   * preventing megabytes of unused font glyph maps and date functions from bundling.
   */
  const treeShakeImportPlugin = function ({ types: t }) {
    return {
      name: "transform-import-tree-shaking",
      visitor: {
        ImportDeclaration(path) {
          const source = path.node.source.value;
          if (source === "@expo/vector-icons") {
            const specifiers = path.node.specifiers;
            const newImports = [];
            for (const spec of specifiers) {
              if (t.isImportSpecifier(spec)) {
                const importName = spec.imported.name || spec.imported.value;
                newImports.push(
                  t.importDeclaration(
                    [t.importDefaultSpecifier(spec.local)],
                    t.stringLiteral(`@expo/vector-icons/${importName}`)
                  )
                );
              } else {
                newImports.push(t.importDeclaration([spec], t.stringLiteral(source)));
              }
            }
            if (newImports.length > 0) {
              path.replaceWithMultiple(newImports);
            }
          } else if (source === "react-native-vector-icons") {
            const specifiers = path.node.specifiers;
            const newImports = [];
            for (const spec of specifiers) {
              if (t.isImportSpecifier(spec)) {
                const importName = spec.imported.name || spec.imported.value;
                newImports.push(
                  t.importDeclaration(
                    [t.importDefaultSpecifier(spec.local)],
                    t.stringLiteral(`react-native-vector-icons/${importName}`)
                  )
                );
              } else {
                newImports.push(t.importDeclaration([spec], t.stringLiteral(source)));
              }
            }
            if (newImports.length > 0) {
              path.replaceWithMultiple(newImports);
            }
          } else if (source === "date-fns") {
            const specifiers = path.node.specifiers;
            const newImports = [];
            for (const spec of specifiers) {
              if (t.isImportSpecifier(spec)) {
                const importName = spec.imported.name || spec.imported.value;
                newImports.push(
                  t.importDeclaration(
                    [t.importSpecifier(spec.local, spec.imported)],
                    t.stringLiteral(`date-fns/${importName}`)
                  )
                );
              } else {
                newImports.push(t.importDeclaration([spec], t.stringLiteral(source)));
              }
            }
            if (newImports.length > 0) {
              path.replaceWithMultiple(newImports);
            }
          }
        },
      },
    };
  };

  const plugins = [treeShakeImportPlugin];
  if (isProd) {
    // Strip all debug console logs and telemetry in production builds (PCI-DSS & OWASP MASVS)
    plugins.push(["transform-remove-console", { exclude: ["error", "warn"] }]);
  }

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          unstable_transformImportMeta: true,
          lazyImports: true,
        },
      ],
      "nativewind/babel",
    ],
    plugins,
    overrides: [
      {
        test: ["./node_modules/@babel/code-frame/"],
        compact: false,
      },
    ],
  };
};
