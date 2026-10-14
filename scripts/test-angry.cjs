const assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const browser=await chromium.launch({executablePath:process.env.TEST_BROWSER_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--disable-gpu','--use-gl=disabled']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
 const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
 const choose=t=>page.locator('[data-theme-choice="'+t+'"]').evaluate(e=>e.click());
 for(const theme of ['ios','android'])for(const[width,height]of[[320,640],[390,844],[844,390],[1024,768]]){
  await page.setViewportSize({width,height});await page.goto(url);await choose(theme);
  assert.equal(await page.locator('[data-open-pint]').isVisible(),true);assert.equal(await page.locator('[data-open-angry]').isVisible(),true);
  await page.locator('[data-open-pint]').click();assert.equal(await page.locator('.pint-app').isVisible(),true);await page.locator('.pint-back').click();
  await page.locator('[data-open-angry]').click();assert.equal(await page.locator('.angry-app').isVisible(),true);
  const bounds=await page.locator('#home-window').boundingBox();assert.equal(Math.round(bounds.y),theme==='android'&&width>=768?0:29);
  assert.equal(Math.round(bounds.y+bounds.height),theme==='android'&&width>=768?height-42:height);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await page.locator('.angry-canvas').getAttribute('data-shots'),'4');
  // Waiting lets the parked projectile sleep: launches must still move it.
  await page.waitForTimeout(1500);
  const parkedX=Number(await page.locator('.angry-canvas').getAttribute('data-head-x'));
  await page.locator('.angry-fire').click();assert.equal(await page.locator('.angry-canvas').getAttribute('data-shots'),'3');
  await page.waitForTimeout(250);
  assert.ok(Number(await page.locator('.angry-canvas').getAttribute('data-head-x'))>parkedX+20,'Idle button launch moves the head');
  await page.locator('.angry-reset').click();assert.equal(await page.locator('.angry-canvas').getAttribute('data-shots'),'4');
  await page.waitForTimeout(1500);
  const cx=Number(await page.locator('.angry-canvas').getAttribute('data-head-x')),cy=Number(await page.locator('.angry-canvas').getAttribute('data-head-y'));
  await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx-35,cy+18,{steps:6});await page.mouse.up();
  assert.equal(await page.locator('.angry-canvas').getAttribute('data-shots'),'3','Drag releases a shot');
  await page.waitForTimeout(250);
  assert.ok(Number(await page.locator('.angry-canvas').getAttribute('data-head-x'))>cx+20,'Idle drag launch moves the head');
  await page.locator('.angry-reset').click();
  if(width===390){await page.waitForTimeout(150);await page.screenshot({path:path.resolve(__dirname,'../verification/angry-'+theme+'-phone.png')});}
  await page.locator('.angry-back').click();assert.equal(await page.locator('.profiles').isVisible(),true);assert.equal(await page.locator('[data-open-angry]').evaluate(e=>e===document.activeElement),true);
  await choose(theme==='ios'?'android':'ios');await page.locator('[data-open-angry]').click();assert.equal(await page.locator('.angry-app').isVisible(),true);
  await choose('windows');assert.equal(await page.locator('.profiles').isVisible(),true);assert.equal(await page.locator('[data-open-angry]').isVisible(),false);assert.equal(await page.locator('[data-open-pint]').isVisible(),false);
 }
 await page.setViewportSize({width:390,height:844});await page.goto(url);await choose('ios');await page.locator('[data-open-angry]').click();
 // A real projectile must score through collisions/movement, without injecting game state.
 await page.locator('.angry-angle').evaluate(e=>{e.value='30';e.dispatchEvent(new Event('input'));});
 await page.locator('.angry-power').evaluate(e=>{e.value='55';e.dispatchEvent(new Event('input'));});await page.locator('.angry-fire').click();
 await page.waitForFunction(()=>Number(document.querySelector('.angry-canvas').dataset.score)>0,{},{timeout:7000});
 assert.ok(Number(await page.locator('.angry-canvas').getAttribute('data-targets'))<2,'Shot smashes a bug');
 await page.locator('.angry-reset').click();await page.waitForTimeout(1500);
 const keyboardX=Number(await page.locator('.angry-canvas').getAttribute('data-head-x'));
 await page.locator('.angry-canvas').press('Space');assert.equal(await page.locator('.angry-canvas').getAttribute('data-shots'),'3','Keyboard fires');
 await page.waitForTimeout(250);assert.ok(Number(await page.locator('.angry-canvas').getAttribute('data-head-x'))>keyboardX+20,'Idle keyboard launch moves the head');
 await page.locator('.angry-back').click();const stopped=await page.locator('.angry-canvas').getAttribute('data-head-x');await page.waitForTimeout(300);assert.equal(await page.locator('.angry-canvas').getAttribute('data-head-x'),stopped,'Closed game stops physics');
 // Real touch input exercises pointer capture and release on both mobile themes.
 const touchPage=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 touchPage.on('pageerror',e=>errors.push(e.message));await touchPage.route('https://**/*',r=>r.abort());
 const touch=await touchPage.context().newCDPSession(touchPage);
 for(const theme of ['ios','android']){
  await touchPage.goto(url);await touchPage.locator('[data-theme-choice="'+theme+'"]').evaluate(e=>e.click());await touchPage.locator('[data-open-angry]').click();await touchPage.waitForTimeout(1500);
  const x=Number(await touchPage.locator('.angry-canvas').getAttribute('data-head-x')),y=Number(await touchPage.locator('.angry-canvas').getAttribute('data-head-y'));
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-35,y:y+18}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await touchPage.locator('.angry-canvas').getAttribute('data-shots'),'3','Touch release fires once');
  await touchPage.waitForTimeout(250);assert.ok(Number(await touchPage.locator('.angry-canvas').getAttribute('data-head-x'))>x+20,'Idle touch launch moves the head');
 }
 await touchPage.close();
 assert.deepEqual(errors,[]);console.log('Passed eight mobile game/Pint layouts, shared launchers, drag/button/keyboard shots, collision score, retry, Back/focus, theme transitions and stopped physics.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
