const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.TEST_BROWSER_PATH, args: ['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--disable-gpu','--use-gl=disabled']});
  try {
    const page = await browser.newPage({viewport: {width:390,height:480}, isMobile:true, hasTouch:true});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://**/*', r => r.abort());
    const url = pathToFileURL(path.resolve(__dirname, '../docs/index.html')).href;
    for (const theme of ['ios','android']) {
      await page.goto(url);
      await page.locator('[data-theme-choice="'+theme+'"]').evaluate(e=>e.click());
      for (const height of [480,734,844,600]) {
        await page.setViewportSize({width:390,height});
        await page.evaluate(()=>window.scrollTo(0,100000));
        const bounds = await page.evaluate(()=>({scrollY, scrollHeight:document.documentElement.scrollHeight, viewport:innerHeight, bottom:document.body.getBoundingClientRect().bottom, background:getComputedStyle(document.documentElement).backgroundColor}));
        assert.equal(bounds.scrollY,0,'The document cannot scroll into empty space');
        assert.equal(bounds.scrollHeight,bounds.viewport,'Document fits the current viewport');
        assert.equal(bounds.bottom,bounds.viewport,'Background fills the dynamic viewport');
        assert.notEqual(bounds.background,'rgba(0, 0, 0, 0)','Overscroll has a theme backdrop');
      }
      await page.setViewportSize({width:390,height:480});
      await page.locator('#home-window').evaluate(e=>e.scrollTop=e.scrollHeight);
      assert.ok(await page.locator('#home-window').evaluate(e=>e.scrollTop>0),'Small homescreens scroll inside the launcher');
      await page.locator('[data-open-angry]').click();
      assert.equal(await page.locator('#home-window').evaluate(e=>e.scrollTop),0,'Launching an app clears the launcher scroll offset');
      const canvas=page.locator('.angry-canvas');
      assert.ok((await canvas.boundingBox()).y>29,'Game canvas starts below its toolbar');
      await page.locator('.angry-fire').click();
      assert.equal(await canvas.getAttribute('data-shots'),'3');
      await page.waitForFunction(()=>Number(document.querySelector('.angry-canvas').dataset.score)>0,{},{timeout:7000});
      const earnedScore=Number(await canvas.getAttribute('data-score'));
      // Expanding/collapsing browser bars changes height without changing orientation.
      for (const height of [734,844,600]) {
        await page.setViewportSize({width:390,height});
        await page.waitForTimeout(100);
        assert.equal(await canvas.getAttribute('data-shots'),'3','Browser bar changes must not reset the shot');
        assert.equal(await canvas.getAttribute('data-level'),'1');
        assert.ok(Number(await canvas.getAttribute('data-score'))>=earnedScore,'Browser bar changes preserve earned points');
        const box=await page.locator('#home-window').boundingBox();
        assert.equal(Math.round(box.y+box.height),height,'The game fills the updated viewport');
      }
      await page.locator('.angry-reset').click();
      const x=Number(await canvas.getAttribute('data-head-x')), y=Number(await canvas.getAttribute('data-head-y'));
      const touch=await page.context().newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-35,y:y+18}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForTimeout(250);
      assert.equal(await canvas.getAttribute('data-shots'),'3');
      assert.ok(Number(await canvas.getAttribute('data-head-x'))>x+20,'Touch launches still move after viewport changes');
      await touch.detach();
      await page.locator('.angry-back').click();
      assert.equal(await page.evaluate(()=>scrollY),0);
      assert.equal(await page.locator('.profiles').isVisible(),true);
      console.log(theme+': bounded homescreen, internal scroll, clean app launch, resize continuity and touch shot passed');
    }
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
