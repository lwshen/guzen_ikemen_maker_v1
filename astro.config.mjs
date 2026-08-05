import { defineConfig } from 'astro/config';

// compressHTML must stay off: Phase 1 verification diffs the built HTML
// byte-level against the original index.html (see MIGRATION_VERIFICATION.md).
// minify off + charset utf8: ~860KB of Japanese text must not be inflated
// into \uXXXX escapes, and unminified output stays diffable; nginx gzips
// on the wire (Phase 4, risk mitigations for the bundled-module setup).
export default defineConfig({
  compressHTML: false,
  vite: {
    esbuild: { charset: 'utf8' },
    build: { minify: false },
  },
});
