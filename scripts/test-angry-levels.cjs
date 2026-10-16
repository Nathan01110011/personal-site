const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.TEST_BROWSER_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--disable-gpu','--use-gl=disabled']});
 try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  // Advance the real game's animation/physics deterministically, without editing bodies.
  await page.addInitScript(()=>{
   let time=0,id=0;const queue=new Map();
   window.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};window.cancelAnimationFrame=id=>queue.delete(id);
   window.advanceGame=ms=>{for(let i=0;i<Math.ceil(ms/(1000/60));i++){time+=1000/60;const callbacks=[...queue.values()];queue.clear();for(const fn of callbacks)fn(time);}};
   Object.defineProperty(window,'Matter',{configurable:true,set(m){
    const create=m.Engine.create;m.Engine.create=function(...args){window.testEngine=create.apply(this,args);return window.testEngine;};
    Object.defineProperty(window,'Matter',{configurable:true,writable:true,value:m});
   }});
  });
  const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
  const inspect=()=>page.evaluate(()=>({
   data:{...document.querySelector('.angry-canvas').dataset},
   bodies:Matter.Composite.allBodies(testEngine.world).filter(b=>!b.isStatic).map(b=>({type:b.plugin.type,x:b.position.x,y:b.position.y,minY:b.bounds.min.y,maxX:b.bounds.max.x,minX:b.bounds.min.x})),
   worldWidth:innerWidth<innerHeight?600:1000,
  }));
  const choose=i=>page.locator('.angry-level-select').selectOption(String(i));
  for(const theme of ['ios','android']){
   for(const [width,height] of [[320,640],[390,844],[844,390],[1024,768]]){
    await page.setViewportSize({width,height});await page.goto(url);
    await page.locator('[data-theme-choice="'+theme+'"]').evaluate(e=>e.click());await page.locator('[data-open-angry]').click();
    assert.equal(await page.locator('.angry-level-select option').count(),8);
    for(let i=0;i<8;i++){
     await choose(i);const start=await inspect();await page.evaluate(()=>advanceGame(3000));const settled=await inspect();
     assert.equal(settled.data.level,String(i+1));assert.equal(settled.data.levelCount,'8');assert.equal(settled.data.shots,'4');assert.equal(settled.data.score,'0');
     assert.equal(settled.bodies.length,start.bodies.length,'Nothing disappears before the first shot');
     for(let j=0;j<start.bodies.length;j++){
      const a=start.bodies[j],b=settled.bodies[j];
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<8,theme+' '+width+' level '+(i+1)+' starts stable');
      assert.ok(b.minY>=0&&b.minX>=0&&b.maxX<=settled.worldWidth,'Puzzle bodies fit the canvas');
     }
     assert.ok(await page.locator('.angry-level-select').isVisible());
     assert.ok(await page.locator('.angry-fire').isVisible());
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
   }
   // Real slider/button shots, through the game's collision handlers, clear every level.
   await page.setViewportSize({width:390,height:844});
   const solutions=[[[30,55]],[[30,55]],[[15,55]],[[30,40]],[[30,55]],[[30,55],[5,65]],[[30,55]],[[30,55]]];
   for(let i=0;i<8;i++){
    await choose(i);const initial=await inspect();
    for(const [angle,power] of solutions[i]){
     await page.evaluate(({angle,power})=>{
      document.querySelector('.angry-angle').value=String(angle);document.querySelector('.angry-power').value=String(power);
      document.querySelector('.angry-fire').click();advanceGame(5200);
     },{angle,power});
    }
    const cleared=await inspect();assert.equal(cleared.data.won,'true',theme+' level '+(i+1)+' can be cleared within four heads');
    assert.equal(cleared.data.targets,'0');assert.equal(Number(cleared.data.score),Number(initial.data.targets)*100);
    if(i===3)assert.ok(cleared.bodies.filter(b=>b.type==='glass').length<initial.bodies.filter(b=>b.type==='glass').length,'Impacts shatter glass');
    if(i===5)assert.equal(cleared.bodies.filter(b=>b.type==='tnt').length,0,'The explosive crate detonates');
    if(i===6){const before=initial.bodies.find(b=>b.type==='boulder'),after=cleared.bodies.find(b=>b.type==='boulder');assert.ok(after.y>before.y+60,'The boulder falls off its perch');}
    await page.locator('.angry-next').click();assert.equal((await inspect()).data.level,String((i+1)%8+1),'Progression wraps only after the last level');
   }
   await choose(7);await page.locator('.angry-fire').click();await page.evaluate(()=>advanceGame(500));
   await choose(3);const fresh=await inspect();assert.equal(fresh.data.shots,'4');assert.equal(fresh.data.score,'0');assert.equal(fresh.data.won,'false');
   await page.locator('.angry-back').click();assert.equal(await page.locator('.profiles').isVisible(),true);
  }
  assert.deepEqual(errors,[]);
  console.log('Passed 64 stable, unclipped level layouts; all eight real-shot solutions on iOS and Android; glass, explosions, falling boulder, picker resets, progression and Back.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
