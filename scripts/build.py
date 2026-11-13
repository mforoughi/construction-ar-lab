from pathlib import Path
import shutil,re
src=Path('/workspace/scratch/9822dd1e27ab/migration-current/.sites-checkout/public')
out=Path('/workspace/scratch/9822dd1e27ab/github-student/site')
for name in ['vendor','equipment']: shutil.copytree(src/name,out/name,dirs_exist_ok=True)
seen=set()
def copyjs(name):
 name=name.split("?")[0]
 if name in seen:return
 seen.add(name)
 text=(src/name).read_text()
 for dep in re.findall(r"from\s*['\"]\./([^'\"]+)['\"]",text):copyjs(dep)
 (out/name).write_text(text)
for name in ['equipment.js','ar-cabin.js']:copyjs(name)
for name in ['equipment.html','equipment.css','equipment-print.html','ar-cabin.html','ar-cabin.css']:shutil.copy2(src/name,out/name)
p=out/'equipment.js';s=p.read_text();a=s.index('async function loadSound()');b=s.index('\nloadSound();',a);s=s[:a]+"async function loadSound(){hasSound=true;sound.src='/equipment/engine-sample.wav';$('soundStatus').textContent='Generated engine-noise sample. Sound is optional.';$('soundEnabled').disabled=false;}"+s[b:];p.write_text(s)
p=out/'ar-cabin.js';s=p.read_text();a=s.index('async function soundSource()');b=s.index('\n',a);s=s[:a]+"async function soundSource(){sound.src='/equipment/engine-sample.wav';}"+s[b:];p.write_text(s)
for p in out.glob('*.html'):
 s=p.read_text();s=re.sub(r'<a[^>]*href="/equipment-upload.html"[^>]*>.*?</a>','',s);s=s.replace('/manager.html','/index.html').replace('Project library','Student library');p.write_text(s)
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Construction AR Lab</title><style>body{margin:0;background:#f4f5ef;color:#183c35;font:18px system-ui}main{max-width:850px;margin:auto;padding:60px 24px}h1{font-size:48px}p{line-height:1.6}.card{background:white;border:1px solid #cdd7ca;padding:28px;border-radius:18px;margin-top:30px}nav{display:flex;gap:12px;flex-wrap:wrap}a{padding:14px 18px;background:#183c35;color:white;border-radius:8px;text-decoration:none}small{display:block;margin-top:30px;line-height:1.6}</style><main><p>CONSTRUCTION AR LAB · STUDENT EXPERIENCE</p><h1>Scan. Place. Explore.</h1><p>Explore construction equipment with touchscreen controls. Choose a printed sheet or place the model on a floor.</p><section class="card"><h2>Backhoe loader</h2><p>Operate the front loader and rear excavator, drive the equipment, and explore cabin views.</p><nav><a href="/equipment.html?mode=sheet">On sheet</a><a href="/equipment.html?mode=floor">On floor</a><a href="/equipment.html">Explore in 3D</a><a href="/ar-cabin.html">AR cabin</a><a href="/equipment-print.html">Print tracking sheet</a></nav><small>Open on your phone and allow camera access when prompted. Equipment sound is optional. No headset is needed.</small></section></main></html>''')
pattern=r'''(["'`])/(?=vendor/|equipment(?:[./-])|ar-cabin[./-]|index[.]|api/)'''
for p in out.rglob('*'):
 if p.is_file() and 'vendor' not in p.parts and p.suffix in ['.js','.html','.css','.json']:
  p.write_text(re.sub(pattern,lambda m:m[1]+'/construction-ar-lab/',p.read_text()))
(out/'.nojekyll').touch()
print(len(seen),'student JS modules copied')
