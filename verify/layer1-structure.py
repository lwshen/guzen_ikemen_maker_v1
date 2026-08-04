"""Layer 1: structural equivalence, original index.html vs Astro dist output.
Run after `npm run build`. See MIGRATION_VERIFICATION.md section 1."""
import os, re, hashlib, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
old = open(f'{ROOT}/index.html', encoding='utf-8').read()
new_html = open(f'{ROOT}/dist/index.html', encoding='utf-8').read()
new_js = open(f'{ROOT}/dist/app.js', encoding='utf-8').read()
old_js = '\n'.join(old.split('\n')[428:7293])

fails = []
def check(name, ok, detail=''):
    print(('PASS' if ok else 'FAIL'), name, detail)
    if not ok: fails.append(name)

# 1. id sets
ids_old = sorted(set(re.findall(r'id="([^"]*)"', old.split('<script>')[0])))
ids_new = sorted(set(re.findall(r'id="([^"]*)"', new_html)))
check('id set (176)', ids_old == ids_new and len(ids_old) == 176,
      f'old={len(ids_old)} new={len(ids_new)} diff={set(ids_old)^set(ids_new)}')

# 2. data-* attribute names (static HTML region)
da = lambda s: sorted(set(re.findall(r'data-[a-z-]+', s)))
check('data-* set (static html)', da(old.split('<script>')[0]) == da(new_html),
      f'diff={set(da(old.split("<script>")[0]))^set(da(new_html))}')

# 3. JS byte-identical
check('app.js byte-identical to original script region',
      hashlib.sha256(new_js.rstrip('\n').encode()).hexdigest() == hashlib.sha256(old_js.encode()).hexdigest())

# 4. head essentials (Astro normalizes void-element `/>` to `>` — HTML-equivalent)
for frag in ['<html lang="ja">', '<meta charset="utf-8"',
             '<meta name="viewport" content="width=device-width, initial-scale=1"',
             '<title>Guzen Ikemen Maker V3.0.0</title>']:
    check(f'head: {frag[:40]}', frag in new_html)

# 5. footer byte-identical
footer = '<p class="footer">© DAZ_だいすけ：FOOTHOUSE(AI男子） / Guzen Ikemen Maker V3.0.0</p>'
check('footer verbatim', footer in new_html)

# 6. CSS not scoped, present verbatim
check('no :where(.astro-', ':where(.astro-' not in new_html and 'astro-' not in re.sub(r'<script.*?</script>', '', new_html, flags=re.S))
old_css = '\n'.join(old.split('\n')[7:128])
check('CSS block verbatim', old_css in new_html)

# 7. long data line intact (measured in BYTES, matching awk length())
check('>10000-byte line intact in app.js', any(len(l.encode()) > 10000 for l in new_js.split('\n')))

# 8. localStorage keys
for k in ['guzen-ikemen-maker-v1.results', 'guzen-ikemen-maker-v1.presets']:
    check(f'storage key {k}', k in new_js)

# 9. no external resources added (link tags, external scripts besides /app.js)
links = re.findall(r'<link[^>]*>', new_html)
scripts = re.findall(r'<script[^>]*>', new_html)
check('no <link> tags', links == [], str(links))
check('only /app.js script', scripts == ['<script src="/app.js">'], str(scripts))

# 10. body region byte-identical
old_body = '\n'.join(old.split('\n')[131:427])
check('body region verbatim', old_body in new_html)

print()
print('RESULT:', 'ALL PASS' if not fails else f'{len(fails)} FAILURES: {fails}')
sys.exit(1 if fails else 0)
