"""Create a self-contained review file from the profile branch draft."""
from pathlib import Path
import base64, mimetypes, re, html, json
root=Path(__file__).resolve().parent.parent
out=root.parent/'profile-with-photo-preview.html'
def data_uri(path):
 return 'data:'+ (mimetypes.guess_type(path.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(path.read_bytes()).decode()
def inline_css(match):
 path=root/match.group(1).split('?')[0]
 css=path.read_text()
 def asset(m):
  url=m.group(1).strip('"\'')
  if url.startswith(('https:','http:')): return 'none'
  local=(path.parent/url.split('?')[0]).resolve()
  return 'url("'+data_uri(local)+'")' if local.exists() else m.group(0)
 css=re.sub(r'url\(([^)]+)\)',asset,css)
 return '<style>'+css+'</style>'
def inline_js(match):
 content=(root/match.group(1).split('?')[0]).read_text()
 content=content.replace("const cursorUrl = new URL('../artwork/cursor.svg', document.currentScript.src).href;",'const cursorUrl = '+json.dumps(data_uri(root/'artwork/cursor.svg'))+';')
 content=content.replace("'nathan.appearance.v1'","'nathan-profile-review-appearance'")
 return '<script>'+content+'</script>'
site=(root/'index.html').read_text()
portrait=json.loads((root/'src/profile-content.json').read_text()).get('portrait')
if portrait:
 site=site.replace(html.escape(portrait,quote=True), data_uri(root/portrait))
site=re.sub(r'<link rel="stylesheet" href="([^"]+)">',inline_css,site)
site=re.sub(r'<script src="([^"]+)"></script>',inline_js,site)
site=site.replace('</body>', '''<script>
window.addEventListener('message', event => {
 if (event.data?.type === 'profile-photo') {
   if (typeof event.data.photo === 'string' && (event.data.photo === '' || event.data.photo.startsWith('data:image/'))) window.NathanProfile.setPortrait(event.data.photo).catch(() => {});
   return;
 }
 const {theme,view} = event.data || {};
 if (!['windows','mac','ubuntu','android','ios'].includes(theme)) return;
 document.querySelector('[data-theme-choice="'+theme+'"]').click();
 document.querySelector(view === 'home' ? '[data-open-home]' : '.profiles [data-open-profile]').click();
});
document.querySelector('[data-theme-choice="windows"]').click();
document.querySelector('.profiles [data-open-profile]').click();
</script></body>''')
themes=[('windows','Windows 98','Windows Address Book'),('mac','Classic Mac','Platinum contact sheet'),('ubuntu','Ubuntu','GNOME address book'),('android','Android','Gingerbread Contacts'),('ios','iOS','iOS 6 Contacts')]
# The review file uses live HTML; it contains no captured browser screenshots.
cards=[]
buttons=''.join(f'<button data-theme="{theme}" aria-pressed="{str(theme=="windows").lower()}">{label}</button>' for theme,label,_ in themes)
preview='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nathan — profile card preview</title><style>
*{box-sizing:border-box}body{margin:0;font:14px/1.5 system-ui,Arial,sans-serif;background:#f2f1ed;color:#252622}button{font:inherit;cursor:pointer}.photo-picker{display:inline-flex;align-items:center;padding:7px 12px;border:1px solid #bcbeb6;background:#fff;border-radius:5px;cursor:pointer}.photo-picker input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}button:focus-visible{outline:3px solid #de7e36;outline-offset:3px} .review-head{max-width:1560px;margin:auto;padding:26px 28px 18px}h1{margin:0;font-size:28px;letter-spacing:-.6px}.intro{margin:7px 0 18px;color:#666}.switches{display:flex;flex-wrap:wrap;gap:7px}.switches button,.design button{padding:7px 12px;border:1px solid #bcbeb6;background:#fff;color:#353a31;border-radius:5px}.switches button[aria-pressed=true]{background:#293b35;color:#fff;border-color:#293b35}.separator{margin-inline:4px;border-left:1px solid #c9c9c2}.gallery{max-width:1560px;margin:0 auto;padding:14px 28px 30px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:start}.design{border:1px solid #d6d8d1;background:#fff;padding:15px;border-radius:10px;box-shadow:0 3px 12px #00000006}.design header{display:flex;align-items:center;gap:12px;margin-bottom:14px}.icon{width:48px;height:48px;object-fit:contain}.design-windows .icon,.design-mac .icon{image-rendering:pixelated}.design-ios .icon{border-radius:10px}.design h2{margin:0;font-size:17px}.design p{margin:1px 0 0;font-size:11px;color:#777}.design button{font-size:11px;margin-left:auto;padding:5px 8px;white-space:nowrap}.card-shot{display:block;width:100%;height:auto}.design-android,.design-ios{max-width:450px;justify-self:center;width:100%}.design-android{grid-column:1/2;margin-left:100%}.design-ios{grid-column:3/4;margin-right:100%}.interactive{padding:8px 20px 28px}.frame-wrap{max-width:1366px;margin:auto;background:#ddd;border:1px solid #b7b9b2;border-radius:9px;overflow:hidden;box-shadow:0 10px 30px #0002}.frame-wrap.phone{max-width:390px}.frame-wrap.tablet{max-width:960px}iframe{display:block;width:100%;height:850px;border:0;background:#008080}.frame-wrap.phone iframe{height:844px}.note{max-width:1366px;margin:12px auto 0;color:#73766e;font-size:12px}[hidden]{display:none!important}
@media(max-width:900px){.gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;padding:10px 18px}.design-android,.design-ios{grid-column:auto;margin:0}.review-head{padding:20px 18px 10px}h1{font-size:23px}}@media(max-width:560px){.gallery{grid-template-columns:1fr}.design{padding:12px}.interactive{padding:8px 8px 20px}.frame-wrap{border-radius:0}iframe{height:800px}.separator{display:none}.design header{gap:8px}}
</style></head><body><header class="review-head"><h1>Profile card · draft preview</h1><p class="intro">Your card, in five OS themes. Choose a theme to try the card.</p><nav class="switches" aria-label="Preview controls">'''+buttons+'''<span class="separator"></span><button id="all-designs" aria-pressed="false" hidden>All designs</button><button data-size="desktop" aria-pressed="true">Desktop</button><button data-size="tablet" aria-pressed="false">Tablet</button><button data-size="phone" aria-pressed="false">Phone</button><button id="show-home">Show launcher</button><label class="photo-picker">Choose photo<input id="photo-input" type="file" accept="image/*"></label><button id="clear-photo">Clear photo</button></nav></header><main><section class="gallery" id="gallery" hidden>'''+''.join(cards)+'''</section><section class="interactive" id="interactive"><div class="frame-wrap" id="frame-wrap"><iframe id="site-preview" title="Interactive Nathan profile card preview" srcdoc="'''+html.escape(site,quote=True)+'''"></iframe></div><p class="note">Choose your photo to compare the Windows bitmap, Mac dither and normal mobile portraits. It stays in your browser.</p></section></main><script>
let theme='windows', portrait='';const frame=document.getElementById('site-preview');
function render(view='profile'){document.getElementById('gallery').hidden=true;document.getElementById('interactive').hidden=false;document.getElementById('all-designs').setAttribute('aria-pressed','false');document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===theme)));frame.contentWindow.postMessage({theme,view},'*');}
document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{theme=b.dataset.theme;render();});document.querySelectorAll('[data-try]').forEach(b=>b.onclick=()=>{theme=b.dataset.try;render();window.scrollTo({top:0,behavior:'smooth'});});document.getElementById('all-designs').onclick=()=>{document.getElementById('gallery').hidden=false;document.getElementById('interactive').hidden=true;document.getElementById('all-designs').setAttribute('aria-pressed','true');};document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{document.getElementById('frame-wrap').className='frame-wrap '+b.dataset.size;document.querySelectorAll('[data-size]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});document.getElementById('show-home').onclick=()=>render('home');
document.getElementById('photo-input').onchange=event=>{const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{portrait=reader.result;render();frame.contentWindow.postMessage({type:'profile-photo',photo:portrait},'*');};reader.readAsDataURL(file);};document.getElementById('clear-photo').onclick=()=>{portrait='';document.getElementById('photo-input').value='';frame.contentWindow.postMessage({type:'profile-photo',photo:''},'*');};
</script></body></html>'''
out.write_text(preview)
print(out, out.stat().st_size)
