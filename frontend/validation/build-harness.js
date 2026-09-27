/**
 * Validation harness build (dev tooling only; never shipped with the app).
 *
 * Bundles the REAL application code (App.tsx, screens, stores, services,
 * localDatabase) into a single browser bundle, aliasing only native bridges:
 *   react-native → DOM shim, realm → localStorage shim,
 *   react-native-tts → Web Speech shim, plus slider / RNFS / document-picker.
 *
 * Everything else is the app's actual production code path.
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const shim = (p) => path.resolve(__dirname, 'shims', p);

/** Simple esbuild plugin: exact-match import paths to shim files. */
const EMPTY_STUB = path.resolve(__dirname, 'shims', 'empty-stub.js');
const shimPlugin = {
  name: 'enr-shims',
  setup(build) {
    const map = {
      'react-native': shim('react-native.js'),
      'react-native-tts': shim('tts.js'),
      'react-native-fs': shim('rnfs.js'),
      'react-native-document-picker': shim('document-picker.js'),
      '@react-native-community/slider': shim('slider.js'),
      realm: shim('realm.js'),
    };
    build.onResolve({ filter: new RegExp('^(' + Object.keys(map).map(escapeRe).join('|') + ')$') }, (args) => {
      if (map[args.path]) return { path: map[args.path] };
      return null;
    });
    // Subpath imports (react-native/Libraries/...) resolve to RN internals
    // whose Flow syntax esbuild cannot parse — and none are needed at runtime
    // since everything meaningful routes through the main shim. Stub them.
    build.onResolve({ filter: /^react-native\/.+/ }, () => ({ path: EMPTY_STUB }));
  },
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Navigation shim: real screens, minimal real-behavior navigation state. */
const navigationShimDir = path.resolve(__dirname, 'shims', 'navigation');

async function main() {
  const outfile = path.resolve(__dirname, 'harness.js');
  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'shims', 'entry.js')],
    bundle: true,
    format: 'iife',
    outfile,
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    loader: { '.js': 'jsx', '.jsx': 'jsx', '.ts': 'ts', '.tsx': 'tsx', '.png': 'dataurl', '.jpg': 'dataurl', '.gif': 'dataurl' },
    // Flow type-only imports inside react-native internals parse as invalid
    // JS for esbuild; nothing from there is needed at runtime because the
    // shim plugin intercepts every 'react-native' import. Exclude the tree.
    external: [],
    define: {
      '__DEV__': 'true',
      'process.env.NODE_ENV': '"development"',
      'global': 'globalThis',
    },
    alias: {
      // @react-navigation packages import from 'react-native'; our shim plugin
      // already catches those. Nothing else to alias.
    },
    plugins: [shimPlugin],
    sourcemap: 'inline',
    logLevel: 'info',
    target: 'es2020',
    metafile: true,
  });

  const problems = [
    ...result.errors.map((e) => ({ kind: 'error', e })),
    ...result.warnings.map((e) => ({ kind: 'warning', e })),
  ];
  for (const { kind, e } of problems.slice(0, 20)) {
    const loc = e.location ? ` (${e.location.file}:${e.location.line})` : '';
    console.log(`[esbuild ${kind}] ${e.text}${loc}`);
  }

  const sizeKb = Math.round(fs.statSync(outfile).size / 1024);
  console.log(`harness built: ${outfile} (${sizeKb} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
