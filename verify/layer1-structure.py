"""Layer 1: structural equivalence, frozen index.html baseline vs Astro dist.
Run after `npm run build`. See MIGRATION_VERIFICATION.md sections 1 and 4.
Phase 4: app code ships as ONE bundled ES module (minify off, charset utf8);
data lives in src/data/*.js as `export const` modules."""
import os, re, json, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
old = open(f'{ROOT}/index.html', encoding='utf-8').read()
new_html = open(f'{ROOT}/dist/index.html', encoding='utf-8').read()
manifest = json.load(open(f'{ROOT}/verify/data-manifest.json', encoding='utf-8'))

bundles = glob.glob(f'{ROOT}/dist/_astro/*.js')
bundle = ''.join(open(b, encoding='utf-8').read() for b in bundles)
data_src = {f: open(f'{ROOT}/src/data/{f}', encoding='utf-8').read() for f in manifest['dataFiles']}

# locate baseline regions by marker lines (same shape contract as the archived
# phase1 extractor)
old_lines = old.split('\n')
loc = lambda exact: old_lines.index(exact)
style_open, style_close = loc('  <style>'), loc('  </style>')
body_open, script_open = loc('<body>'), loc('<script>')
old_css = '\n'.join(old_lines[style_open + 1:style_close])
old_body = '\n'.join(old_lines[body_open + 1:script_open])
old_title = next(l for l in old_lines if l.strip().startswith('<title>')).strip()
old_footer = next(l for l in old_lines if l.startswith('    <p class="footer">')).strip()

fails = []
def check(name, ok, detail=''):
    print(('PASS' if ok else 'FAIL'), name, detail)
    if not ok: fails.append(name)

# 1. id sets
ids_old = sorted(set(re.findall(r'id="([^"]*)"', old.split('<script>')[0])))
ids_new = sorted(set(re.findall(r'id="([^"]*)"', new_html)))
check(f'id set ({len(ids_old)})', ids_old == ids_new,
      f'old={len(ids_old)} new={len(ids_new)} diff={set(ids_old)^set(ids_new)}')

# 2. data-* attribute names (script tags excluded from the scan)
da = lambda s: sorted(set(re.findall(r'data-[a-z-]+', re.sub(r'<script[^>]*>', '', s))))
check('data-* set (static html)', da(old.split('<script>')[0]) == da(new_html),
      f'diff={set(da(old.split("<script>")[0]))^set(da(new_html))}')

# 3. data modules: every extracted constant exported exactly once in src/data
missing, dupes = [], []
for e in manifest['extracted']:
    n = sum(len(re.findall(rf"^export const {e['name']} =", s, re.M)) for s in data_src.values())
    if n == 0: missing.append(e['name'])
    if n > 1: dupes.append(e['name'])
check(f"all {len(manifest['extracted'])} data constants exported once in src/data",
      not missing and not dupes, f'missing={missing} dupes={dupes}')
check('no GUZEN_DATA remnants in bundle', 'GUZEN_DATA' not in bundle)

# 4. head essentials (Astro normalizes void-element `/>` to `>` — HTML-equivalent)
for frag in ['<html lang="ja">', '<meta charset="utf-8"',
             '<meta name="viewport" content="width=device-width, initial-scale=1"',
             old_title]:
    check(f'head: {frag[:40]}', frag in new_html)

# 5. footer byte-identical (taken from the baseline, incl. version string)
check('footer verbatim', old_footer in new_html)

# 6. CSS not scoped, present verbatim
check('no :where(.astro-', ':where(.astro-' not in new_html)
check('CSS block verbatim', old_css in new_html)

# 7. bundle sanity: no non-ASCII escape inflation, Japanese shipped raw,
#    long data lines intact (bytes, matching awk length())
check('single JS bundle', len(bundles) == 1, str(bundles))
# the baseline itself contains a few legitimate \uXXXX regex escapes
# (e.g. /[\s　・]+/) — the assertion is that the bundler adds NO new ones
check('no \\uXXXX escaping added by bundler',
      bundle.count('\\u30') == old.count('\\u30') and 'スロット' in bundle,
      f"bundle={bundle.count(chr(92)+'u30')} baseline={old.count(chr(92)+'u30')}")
check('>10000-byte line intact in bundle', any(len(l.encode()) > 10000 for l in bundle.split('\n')))

# 8. localStorage keys
for k in ['guzen-ikemen-maker-v1.results', 'guzen-ikemen-maker-v1.presets']:
    check(f'storage key {k}', k in bundle)

# 9. script/link tags: exactly one same-origin module script, nothing external
links = re.findall(r'<link[^>]*>', new_html)
scripts = re.findall(r'<script[^>]*>', new_html)
check('no <link> tags', links == [], str(links))
check('one hashed module script', len(scripts) == 1
      and re.fullmatch(r'<script type="module" src="/_astro/[^"]+\.js">', scripts[0]) is not None, str(scripts))

# 10. body region byte-identical
check('body region verbatim', old_body in new_html)

print()
print('RESULT:', 'ALL PASS' if not fails else f'{len(fails)} FAILURES: {fails}')
sys.exit(1 if fails else 0)
