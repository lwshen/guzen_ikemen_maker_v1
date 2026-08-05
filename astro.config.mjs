import { defineConfig } from 'astro/config';

// compressHTML must stay off: Phase 1 verification diffs the built HTML
// byte-level against the original index.html (see MIGRATION_VERIFICATION.md).
export default defineConfig({
  compressHTML: false,
});
