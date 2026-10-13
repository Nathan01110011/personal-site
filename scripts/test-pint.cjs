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
      await page.locator('.pint-refill').click();
      await page.waitForFunction(()=>document.querySelector('.pint-canvas').dataset.fill==='1.000');
      // Drag pours while held; releasing levels the glass, tapping refills.
      const canvasBox=await page.locator('.pint-canvas').boundingBox();
      const cx=canvasBox.x+canvasBox.width/2,cy=canvasBox.y+canvasBox.height/2;
      await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+canvasBox.width*.3,cy,{steps:10});
      await page.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)<.9);
      await page.mouse.up();await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.pint-canvas').dataset.tilt))<1);
      await page.locator('.pint-canvas').click();await page.waitForFunction(()=>document.querySelector('.pint-canvas').dataset.fill==='1.000');
      if(width===390){fs.mkdirSync(path.resolve(__dirname,'../verification'),{recursive:true});await page.screenshot({path:path.resolve(__dirname,'../verification/pocket-pint-phone.png')});}
      await page.locator('.pint-back').click();assert.equal(await page.locator('.profiles').isVisible(),true);
      assert.equal(await page.locator('[data-open-pint]').evaluate(el=>el===document.activeElement),true);
      for(const t of ['windows','mac','ubuntu','android']) {await choose(t); assert.equal(await page.locator('[data-open-pint]').isVisible(),false);assert.equal(await page.locator('.pint-app').isVisible(),false);}
    }
    await choose('ios');await page.locator('[data-open-pint]').click();
    await page.evaluate(()=>window.permissionResult='denied');await page.locator('.pint-motion').click();
    assert.match(await page.locator('.pint-status').textContent(),/declined/);
    assert.equal(await page.locator('.pint-motion').getAttribute('aria-pressed'),'false');
    await page.evaluate(()=>window.permissionResult='granted');await page.locator('.pint-motion').click();
    assert.equal(await page.locator('.pint-motion').getAttribute('aria-pressed'),'true');
    await page.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{gamma:80,beta:0})));
    await page.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)<.9);
    await page.locator('.pint-back').click();const stopped=await level();
    await page.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{gamma:-80,beta:0})));
    await page.waitForTimeout(250);assert.equal(await level(),stopped,'Closed app stops simulation');
    await page.locator('[data-open-pint]').click();await page.locator('.pint-motion').click();
    assert.equal(await page.locator('.pint-motion').getAttribute('aria-pressed'),'false');
    await choose('android');assert.equal(await page.locator('.profiles').isVisible(),true,'Switching away restores launcher');
    await choose('ios');await page.locator('[data-open-pint]').click();
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.pint-refill').click();
    await page.locator('#pint-tilt').evaluate(el=>{el.value='85';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>Number(document.querySelector('.pint-canvas').dataset.fill)<.9);
    assert.deepEqual(errors,[]);console.log('Passed 5 Pint viewport flows, drag/tap, pouring/refill, permission denial/grant, sensor simulation, lifecycle and reduced motion.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
