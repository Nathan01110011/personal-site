const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.TEST_BROWSER_PATH, headless: true, args: ['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--disable-gpu','--use-gl=disabled'] });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror',e=>errors.push(e.message)); await page.route('https://**/*',r=>r.abort());
    await page.addInitScript(() => {
      window.permissionCalls = 0; window.permissionResult = 'granted';
      window.DeviceOrientationEvent.requestPermission = () => { window.permissionCalls++; return Promise.resolve(window.permissionResult); };
    });
    const url = pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    const choose = theme => page.evaluate(t => document.querySelector('[data-theme-choice="'+t+'"]').click(),theme);
    const level = () => page.locator('.pint-canvas').getAttribute('data-fill').then(Number);
    const setTilt = value => page.locator('#pint-tilt').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
    async function holdFill(target='.pint-refill') {
      await setTilt(0);await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.pint-canvas').dataset.tilt))<.2);
      const b=await page.locator(target).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
      await page.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)>.999);
      await page.mouse.up();
    }
    for (const [width,height] of [[320,640],[390,844],[844,390],[1024,768],[1366,900]]) {
      await page.setViewportSize({width,height}); await page.goto(url); await choose('ios');
      await page.locator('[data-open-pint]').click();
      assert.equal(await page.locator('.pint-app').isVisible(),true);
      assert.equal(await page.evaluate(()=>window.permissionCalls),0,'No automatic motion permission');
      await page.waitForFunction(()=>document.querySelector('.pint-canvas').dataset.fill==='1.000');
      const box = await page.locator('#home-window').boundingBox();
      assert.equal(Math.round(box.y),29); assert.equal(Math.round(box.height),height-29);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.ok((await page.locator('.pint-canvas').boundingBox()).height>100);
      await page.locator('#pint-tilt').evaluate(el=>{el.value='85';el.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)<.85);
      assert.ok(Number(await page.locator('.pint-canvas').getAttribute('data-glass-rotation'))>0,'Manual control rotates the glass');
      await holdFill();
      // Drag pours while held; release levels the glass, holding fills gradually.
      const canvasBox=await page.locator('.pint-canvas').boundingBox();
      const cx=canvasBox.x+canvasBox.width/2,cy=canvasBox.y+canvasBox.height/2;
      await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+canvasBox.width*.45,cy,{steps:10});
      await page.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)<.9);
      await page.mouse.up();await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.pint-canvas').dataset.tilt))<1);
      const beforeFill = await level();
      await page.locator('.pint-canvas').click();
      assert.ok(await level()<1,'Tap does not instantly refill');
      await page.mouse.move(cx,cy);await page.mouse.down();await page.waitForTimeout(350);
      const partial=await level();assert.ok(partial>beforeFill && partial<1,'Hold adds a little at a time');
      await page.mouse.up();const released=await level();await page.waitForTimeout(250);
      assert.ok(Math.abs(await level()-released)<.015,'Release stops refill');
      await holdFill('.pint-canvas');
      if(width===390){fs.mkdirSync(path.resolve(__dirname,'../verification'),{recursive:true});await page.screenshot({path:path.resolve(__dirname,'../verification/pocket-pint-phone.png')});}
      await page.locator('.pint-back').click();assert.equal(await page.locator('.profiles').isVisible(),true);
      assert.equal(await page.locator('[data-open-pint]').evaluate(el=>el===document.activeElement),true);
      for(const t of ['windows','mac','ubuntu','android']) {await choose(t); assert.equal(await page.locator('[data-open-pint]').isVisible(),false);assert.equal(await page.locator('.pint-app').isVisible(),false);}
    }
    await choose('ios');await page.locator('[data-open-pint]').click();
    await page.evaluate(()=>window.permissionResult='denied');await page.locator('.pint-motion').click();
    assert.match(await page.locator('.pint-status').textContent(),/declined/);
    assert.equal(await page.locator('.pint-motion').isVisible(),true);
    await page.evaluate(()=>window.permissionResult='granted');await page.locator('.pint-motion').click();
    assert.equal(await page.locator('.pint-motion').isVisible(),false);
    await page.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{gamma:90,beta:20})));
    await page.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)<.9);
    assert.equal(await page.locator('.pint-canvas').getAttribute('data-glass-rotation'),'0.0','Sensor tilt leaves glass attached to screen');
    await page.locator('.pint-back').click();const stopped=await level();
    await page.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{gamma:90,beta:160})));
    await page.waitForTimeout(250);assert.equal(await level(),stopped,'Closed app stops simulation');
    await page.locator('[data-open-pint]').click();
    assert.equal(await page.locator('.pint-motion').isVisible(),false,'Granted permission remains available on reopen');
    await page.locator('.pint-back').click();await page.goto(url);await choose('ios');await page.locator('[data-open-pint]').click();
    await choose('android');assert.equal(await page.locator('.profiles').isVisible(),true,'Switching away restores launcher');
    await choose('ios');await page.locator('[data-open-pint]').click();
    await page.emulateMedia({reducedMotion:'reduce'});await holdFill();
    await page.locator('#pint-tilt').evaluate(el=>{el.value='85';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)<.9);
    // Retain beer at a fixed tilt once it drops to the rim, then conserve it
    // beneath the rim even at an angle above the previous fixed threshold.
    await setTilt(65);await page.waitForTimeout(3000);
    const settled=await level();await page.waitForTimeout(600);
    assert.ok(Math.abs(await level()-settled)<.005,'Fixed tilt stops draining at rim');
    await setTilt(45);await page.waitForTimeout(1200);const safe=await level();
    await page.waitForTimeout(500);assert.ok(Math.abs(await level()-safe)<.002,'No loss below rim at 45 degrees');
    const automatic = await browser.newPage();
    automatic.on('pageerror',e=>errors.push(e.message));await automatic.route('https://**/*',r=>r.abort());
    await automatic.addInitScript(()=>{delete window.DeviceOrientationEvent.requestPermission;});
    await automatic.goto(url);await automatic.locator('[data-theme-choice="ios"]').evaluate(e=>e.click());
    await automatic.locator('[data-open-pint]').click();assert.equal(await automatic.locator('.pint-motion').isVisible(),false,'No permission API means no button');
    await automatic.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:20,gamma:90})));
    await automatic.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)<.9);
    await automatic.locator('.pint-back').click();const automaticStopped=await automatic.locator('.pint-canvas').getAttribute('data-fill');
    await automatic.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:150,gamma:90})));
    await automatic.waitForTimeout(200);assert.equal(await automatic.locator('.pint-canvas').getAttribute('data-fill'),automaticStopped);
    await automatic.close();
    await page.goto(url);await choose('ios');await page.locator('[data-open-pint]').click();
    assert.equal(await page.locator('.pint-motion').isVisible(),true);
    await page.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:90,gamma:0})));
    assert.equal(await page.locator('.pint-motion').isVisible(),false,'Already permitted readings hide permission button');
    assert.equal(await page.evaluate(()=>window.permissionCalls),0,'Existing readings need no permission request');
    assert.deepEqual(errors,[]);console.log('Automatic motion, prior permission and permission-request UI passed.');console.log('Passed 5 Pint viewports, rim-only pouring/retention, gradual hold/release refill, permission paths, gravity sensor input, lifecycle and reduced motion.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
