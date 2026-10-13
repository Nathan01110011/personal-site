const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.TEST_BROWSER_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--disable-gpu','--use-gl=disabled']});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  let checks=0;
  const out=path.resolve(__dirname,'../verification/profile-preview');fs.mkdirSync(out,{recursive:true});
  for(const theme of ['windows','mac','ubuntu','android','ios']){
   for(const [width,height] of [[320,640],[390,844],[844,390],[1366,900]]){
    await page.setViewportSize({width,height});await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.evaluate(theme=>document.querySelector('[data-theme-choice="'+theme+'"]').click(),theme);
    assert.equal(await page.locator('.profiles > li').first().locator('[data-open-profile]').count(),1,'Profile is first');
    if(width===1366) await page.locator('.app-icon-profile').screenshot({path:path.join(out,theme+'-icon.png')});
    await page.locator('.profiles [data-open-profile]').click();
    assert.equal(await page.locator('.profile-card').isVisible(),true);
    assert.equal(await page.locator('#spotify-player-host iframe').count(),0,'Profile does not load Spotify');
    const desktop=['windows','mac','ubuntu'].includes(theme);
    assert.equal(await page.locator('.profiles').isVisible(),desktop);
    assert.equal(await page.locator('.profile-card').evaluate(el=>el.closest('.window').id),desktop?'profile-window':'home-window');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow');
    const bounds=await page.locator(desktop?'#profile-window':'#home-window').boundingBox();
    assert.ok(bounds.x>=-1&&bounds.x+bounds.width<=width+1,'Profile fits horizontally');
    if(!desktop){assert.equal(Math.round(bounds.y),theme==='android'&&width>=768?0:29);assert.equal(Math.round(bounds.y+bounds.height),theme==='android'&&width>=768?height-42:height);}
    assert.equal(await page.locator('.profile-card .contact-links').count(),0,'Profile has no duplicate links');
    assert.deepEqual(await page.locator('.contact-interest-group li').allTextContents(),['Manchester United','Ulster','New York Giants']);
    assert.equal(await page.locator('.profile-card').getByText(/Warhammer|Rangers/).count(),0);
    await page.locator('.contact-interests > ul > li').last().scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.contact-interests > ul > li').last().isVisible(),true);
    await page.waitForFunction(()=>document.querySelector('.contact-initials').hidden);
    await page.locator('.contact-scroll').evaluate(el=>{el.scrollTop=0;});
    if(width===(desktop?1366:390)) await page.locator(desktop?'#profile-window':'.profile-card').screenshot({path:path.join(out,theme+'-card.png')});
    if(desktop){
     const zoom=page.locator('#profile-window [data-window-action="maximize"]');await zoom.click();
     const max=await page.locator('#profile-window').boundingBox();assert.equal(Math.round(max.x),8);assert.equal(Math.round(max.width),width-16);await zoom.click();
     await page.locator('#profile-window [data-window-action="close"]').click();
    }else await page.locator('.contact-back').click();
    assert.equal(await page.locator('.profiles').isVisible(),true);assert.equal(await page.locator('.profile-card').isVisible(),false);
    assert.equal(await page.locator('.profiles [data-open-profile]').evaluate(el=>el===document.activeElement),true);
    checks++;
   }
  }
  for(const theme of ['windows','ios','mac','android','ubuntu']){
   await page.evaluate(theme=>document.querySelector('[data-theme-choice="'+theme+'"]').click(),theme);
   if(!(await page.locator('.profile-card').isVisible())) await page.locator('.profiles [data-open-profile]').click();
   assert.equal(await page.locator('.profile-card').isVisible(),true);
  }
  // A synthetic gradient fixture verifies rendering without inventing a photo of Nathan.
  const portrait=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=160;c.height=200;const ctx=c.getContext('2d');const g=ctx.createLinearGradient(0,0,160,200);g.addColorStop(0,'#ffb280');g.addColorStop(1,'#203785');ctx.fillStyle=g;ctx.fillRect(0,0,160,200);return c.toDataURL();});
  await page.evaluate(url=>window.NathanProfile.setPortrait(url),portrait);
  for(const theme of ['windows','mac','ubuntu','android','ios']){
   await page.evaluate(theme=>document.querySelector('[data-theme-choice="'+theme+'"]').click(),theme);
   if(!(await page.locator('.profile-card').isVisible())) await page.locator('.profiles [data-open-profile]').click();
   const rendering=await page.locator('.contact-avatar').evaluate(el=>{const c=el.querySelector('canvas'),img=el.querySelector('img');return {width:c.width,height:c.height,bitmap:!c.hidden,photo:!img.hidden,values:[...c.getContext('2d').getImageData(0,0,c.width,c.height).data]};});
   assert.equal(rendering.bitmap,['windows','mac'].includes(theme));
   assert.equal(rendering.photo,!['windows','mac'].includes(theme));
   if(theme==='windows'){assert.equal(rendering.width,32);assert.equal(rendering.height,40);assert.ok(rendering.values.every((v,i)=>i%4===3||[0,128,192,255].includes(v)));}
   if(theme==='mac'){assert.equal(rendering.width,64);assert.equal(rendering.height,80);assert.ok(rendering.values.every((v,i)=>i%4===3||v===0||v===255));}
  }
  await page.evaluate(()=>window.NathanProfile.setPortrait(''));
  assert.equal(await page.locator('.contact-initials').isVisible(),true);
  assert.deepEqual(errors,[]);console.log('Passed '+checks+' profile theme/viewport flows, maximize, close/Back and theme transitions. Screenshots saved.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
