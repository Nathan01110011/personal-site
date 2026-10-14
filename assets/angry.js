(() => {
  'use strict';
  const {Engine,Bodies,Body,Composite,Events,Vector,Sleeping} = window.Matter;
  const app = document.querySelector('.angry-app'), canvas = app.querySelector('canvas'), ctx = canvas.getContext('2d');
  const status=app.querySelector('.angry-state'), scoreLabel=app.querySelector('.angry-score'), shotsLabel=app.querySelector('.angry-shots');
  const fireButton=app.querySelector('.angry-fire'), nextButton=app.querySelector('.angry-next'), banner=app.querySelector('.angry-banner');
  const angleInput=app.querySelector('.angry-angle'),powerInput=app.querySelector('.angry-power');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const portrait=new Image();portrait.src=canvas.dataset.portrait;portrait.addEventListener('load',()=>{if(active)draw();});
  // These small stacks must keep reacting to gravity when their support moves away.
  const engine=Engine.create({enableSleeping:false,positionIterations:8,velocityIterations:8});
  let active=false,frame=0,lastTime=0,accumulator=0,W=600,H=900,scale=1,viewW=0,viewH=0;
  let level=0,score=0,shots=4,head=null,drag=null,launched=false,shotTime=0,settledTime=0,playingTime=0,won=false;
  let anchor={x:110,y:740},bugs=[],particles=[],trail=[];
  const names=['Bug bash','Patch Tuesday','Release day'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const floor=()=>H-48;
  function rectangle(x,y,w,h,type='wood') {
    const body=Bodies.rectangle(x,y,w,h,{friction:.6,restitution:.05,density:type==='server'?.002:.001});
    body.plugin={type,w,h};Composite.add(engine.world,body);return body;
  }
  function bug(x,y) {
    const body=Bodies.circle(x,y,22,{friction:.6,restitution:.05,density:.001});
    body.plugin={type:'bug',home:{x,y}};bugs.push(body);Composite.add(engine.world,body);
  }
  function tower(x,tall=110) {
    rectangle(x-44,floor()-tall/2,17,tall);rectangle(x+44,floor()-tall/2,17,tall);
    rectangle(x,floor()-tall-7,120,14);rectangle(x,floor()-tall-38,42,48,'server');
    bug(x,floor()-tall-84);
  }
  function newHead() {
    head=Bodies.circle(anchor.x,anchor.y,31,{restitution:.24,friction:.6,frictionAir:.004,density:.008});
    Body.setStatic(head,true);
    head.plugin={type:'head'};Composite.add(engine.world,head);
    launched=false;shotTime=0;settledTime=0;trail=[];fireButton.disabled=shots===0||won;
  }
  function reset() {
    Composite.clear(engine.world,false);Engine.clear(engine);bugs=[];particles=[];drag=null;score=0;shots=4;won=false;playingTime=0;
    banner.hidden=true;nextButton.hidden=true;fireButton.hidden=false;
    anchor={x:W*.18,y:floor()-145};
    const ground=Bodies.rectangle(W/2,H-23,W+240,50,{isStatic:true,friction:.85});ground.plugin={type:'ground'};Composite.add(engine.world,ground);
    const target=W*.76;
    if(level===0){tower(target);bug(target+74,floor()-22);rectangle(target-78,floor()-26,35,50,'server');}
    if(level===1){tower(target-43,150);rectangle(target+60,floor()-40,44,80,'server');bug(target+60,floor()-102);}
    if(level===2){tower(target-35,180);rectangle(target+62,floor()-55,38,110,'server');bug(target+62,floor()-132);bug(target-108,floor()-22);}
    // Let the stack settle before a shot, without scoring its setup collisions.
    launched=false;for(let i=0;i<90;i++)Engine.update(engine,1000/60);
    bugs.forEach(b=>{b.plugin.home={...b.position};});newHead();updateHud();
    status.textContent=names[level]+' · Drag your head back and release.';draw();
  }
  function updateHud() {
    scoreLabel.textContent=String(score);scoreLabel.setAttribute('aria-label','Score '+score);
    shotsLabel.textContent=shots+' '+(shots===1?'head':'heads')+' left';
    canvas.dataset.shots=String(shots);canvas.dataset.targets=String(bugs.length);canvas.dataset.score=String(score);canvas.dataset.level=String(level+1);
    canvas.dataset.launched=String(launched);canvas.dataset.won=String(won);
  }
  function pop(body) {
    if(!bugs.includes(body))return;
    bugs=bugs.filter(b=>b!==body);Composite.remove(engine.world,body);score+=100;
    if(!reduced.matches)for(let i=0;i<18;i++)particles.push({x:body.position.x,y:body.position.y,vx:(Math.random()-.5)*9,vy:-Math.random()*7,life:1,color:i%2?'#e85d3c':'#fff0a1'});
    updateHud();
    if(!bugs.length) {
      won=true;fireButton.disabled=true;fireButton.hidden=true;nextButton.hidden=false;
      nextButton.textContent=level===2?'Play again':'Next level';banner.hidden=false;
      banner.querySelector('strong').textContent='Get in!';banner.querySelector('span').textContent=score+' points · All bugs squashed.';
      status.textContent='Lovely. '+score+' points. '+(level===2?'You cleared all three levels.':'On to the next disaster?');updateHud();
    } else status.textContent='Bug squashed! '+bugs.length+' to go.';
  }
  Events.on(engine,'collisionStart',event=>{
    if(shots===4)return;
    for(const pair of event.pairs){const a=pair.bodyA,b=pair.bodyB;const speed=Vector.magnitude(Vector.sub(a.velocity,b.velocity));
      if(speed>2.1){if(a.plugin.type==='bug')pop(a);if(b.plugin.type==='bug')pop(b);}}
  });
  function fire(velocity) {
    if(!active||launched||shots<1||won||!head)return;
    shots--;launched=true;shotTime=0;settledTime=0;drag=null;
    // Restore a dynamic, awake projectile before applying the launch velocity.
    Body.setStatic(head,false);Sleeping.set(head,false);Body.setVelocity(head,velocity);Body.setAngularVelocity(head,.04);
    fireButton.disabled=true;status.textContent='Incoming Nathan!';updateHud();animate();
  }
  function aimFire() {
    const angle=Number(angleInput.value)*Math.PI/180,speed=Number(powerInput.value)*.22;
    fire({x:Math.cos(angle)*speed,y:-Math.sin(angle)*speed});
  }
  function finishShot() {
    if(won)return;
    if(shots>0){newHead();status.textContent='Give it another go. Pull back and release.';}
    else {fireButton.disabled=true;banner.hidden=false;banner.querySelector('strong').textContent='Out of Nathans';banner.querySelector('span').textContent=bugs.length+' '+(bugs.length===1?'bug remains.':'bugs remain.');status.textContent='Still buggy. Tap Retry for another go.';}
    updateHud();
  }
  function step(dt) {
    playingTime+=dt;Engine.update(engine,dt);
    if(launched){shotTime+=dt;if(shotTime>500&&head.speed<.7)settledTime+=dt;else settledTime=0;
      if(trail.length<60&&shotTime%90<dt)trail.push({...head.position});
      for(const b of [...bugs])if(b.position.y>H+60||Math.hypot(b.position.x-b.plugin.home.x,b.position.y-b.plugin.home.y)>90)pop(b);
      if(!won&&(shotTime>4800||settledTime>1000||head.position.x>W+160||head.position.y>H+160)){launched=false;finishShot();}
    }
    particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx*dt/16.67;p.y+=p.vy*dt/16.67;p.vy+=.18;p.life-=dt/700;}
  }
  function circle(x,y,r,color) {ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function drawHead(body) {
    ctx.save();ctx.translate(body.position.x,body.position.y);ctx.rotate(body.angle);
    if(portrait.complete&&portrait.naturalWidth){
      const height=78,width=height*portrait.naturalWidth/portrait.naturalHeight;
      ctx.drawImage(portrait,-width/2,-height/2,width,height);
    } else {ctx.fillStyle='#553521';ctx.font='bold 21px Arial';ctx.textAlign='center';ctx.fillText('N',0,7);}
    ctx.restore();
  }
  function drawBody(b) {
    if(b.plugin.type==='head'){drawHead(b);return;}if(b.plugin.type==='ground')return;
    ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);
    if(b.plugin.type==='bug') {
      ctx.strokeStyle='#2f5122';ctx.lineWidth=3;for(const side of[-1,1])for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(side*15,i*9);ctx.lineTo(side*27,i*12);ctx.stroke();}
      circle(0,0,22,'#6b9d35');circle(-6,-6,8,'#fff8c8');circle(7,-6,8,'#fff8c8');circle(-4,-5,3,'#333');circle(6,-5,3,'#333');ctx.strokeStyle='#283d1c';ctx.beginPath();ctx.arc(0,6,8,0,Math.PI);ctx.stroke();
    }else{
      const {w,h,type}=b.plugin;ctx.fillStyle=type==='server'?'#556b7d':'#c8924c';ctx.strokeStyle=type==='server'?'#253b4b':'#7d512c';ctx.lineWidth=3;ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeRect(-w/2,-h/2,w,h);
      if(type==='server'){ctx.fillStyle='#293946';for(let y=-h/2+8;y<h/2-4;y+=13){ctx.fillRect(-w/2+5,y,w-10,8);circle(w/2-10,y+4,2,'#a8d94d');}}
      else {ctx.strokeStyle='#fff3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w/2+4,-h/2+4);ctx.lineTo(w/2-4,h/2-4);ctx.stroke();}
    }ctx.restore();
  }
  function draw() {
    if(!viewW||!viewH)return;
    const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0);
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#82d2ec');sky.addColorStop(1,'#f2e9b7');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    for(const [cx,cy]of[[W*.18,H*.16],[W*.65,H*.25],[W*.9,H*.09]]) {circle(cx,cy,35,'#ffffff85');circle(cx+34,cy+4,27,'#ffffff85');circle(cx-30,cy+8,23,'#ffffff85');}
    ctx.fillStyle='#8cad65';ctx.beginPath();ctx.moveTo(0,floor());ctx.quadraticCurveTo(W*.2,floor()-150,W*.48,floor());ctx.quadraticCurveTo(W*.73,floor()-100,W,floor()-30);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.fillStyle='#699442';ctx.fillRect(0,floor(),W,9);ctx.fillStyle='#936639';ctx.fillRect(0,floor()+9,W,50);ctx.fillStyle='#b08a56';for(let i=0;i<W;i+=32)ctx.fillRect(i,floor()+19,14,4);
    ctx.strokeStyle='#754924';ctx.lineWidth=15;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(anchor.x, floor());ctx.lineTo(anchor.x,anchor.y+25);ctx.lineTo(anchor.x-20,anchor.y-12);ctx.moveTo(anchor.x,anchor.y+25);ctx.lineTo(anchor.x+20,anchor.y-12);ctx.stroke();
    if(head&&!launched&&!won){ctx.strokeStyle='#593423';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(anchor.x-20,anchor.y-12);ctx.lineTo(head.position.x,head.position.y);ctx.lineTo(anchor.x+20,anchor.y-12);ctx.stroke();}
    ctx.fillStyle='#fff8';for(const p of trail){ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fill();}
    if(drag&&head&&!launched){const vx=(anchor.x-head.position.x)*.19,vy=(anchor.y-head.position.y)*.19;
      for(let t=5;t<65;t+=5)circle(head.position.x+vx*t,head.position.y+vy*t+.139*t*t,3,'#fff9');}
    for(const b of Composite.allBodies(engine.world))drawBody(b);
    for(const p of particles){ctx.globalAlpha=p.life;circle(p.x,p.y,4,p.color);}ctx.globalAlpha=1;
    if(head){const box=canvas.getBoundingClientRect();canvas.dataset.headX=String(box.x+head.position.x*scale);canvas.dataset.headY=String(box.y+head.position.y*scale);}
  }
  function tick(now) {
    frame=0;if(!active||document.hidden)return;
    const delta=lastTime?Math.min(now-lastTime,50):0;lastTime=now;accumulator+=delta;
    while(accumulator>=1000/60){step(1000/60);accumulator-=1000/60;}
    draw();frame=requestAnimationFrame(tick);
  }
  function animate(){if(active&&!document.hidden&&!frame){lastTime=0;frame=requestAnimationFrame(tick);}}
  function resize() {
    if(!active)return;
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    viewW=rect.width;viewH=rect.height;const nextW=innerWidth<innerHeight?600:1000,nextH=rect.height/rect.width*nextW;
    const orientationChanged=nextW!==W,shiftY=nextH-H;W=nextW;H=nextH;scale=viewW/W;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(viewW*dpr);canvas.height=Math.round(viewH*dpr);
    if(orientationChanged||!head)reset();
    else {
      // Browser bars change the available height. Move the scene with its floor,
      // preserving the shot, score and physics instead of restarting the level.
      if(Math.abs(shiftY)>.001){
        anchor.y+=shiftY;
        for(const body of Composite.allBodies(engine.world)){
          Body.translate(body,{x:0,y:shiftY});
          if(body.plugin.home)body.plugin.home.y+=shiftY;
        }
        for(const point of [...trail,...particles])point.y+=shiftY;
      }
      draw();
    }
    animate();
  }
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.x)/scale,y:(e.clientY-r.y)/scale};}
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||launched||won||shots<1||!head)return;const p=point(e);if(Math.hypot(p.x-head.position.x,p.y-head.position.y)>75)return;
    drag={id:e.pointerId};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});status.textContent='Release the Nathan.';
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;const p=point(e),dx=p.x-anchor.x,dy=p.y-anchor.y,d=Math.hypot(dx,dy),ratio=d>110?110/d:1;
    Body.setPosition(head,{x:anchor.x+dx*ratio,y:anchor.y+dy*ratio});draw();
  });
  function endDrag(e){if(!drag||drag.id!==e.pointerId)return;const velocity={x:(anchor.x-head.position.x)*.19,y:(anchor.y-head.position.y)*.19};drag=null;
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(e.type==='pointercancel'||Math.hypot(velocity.x,velocity.y)<1){Body.setPosition(head,anchor);draw();return;}fire(velocity);
  }
  function cancelDrag(){if(drag&&head&&!launched)Body.setPosition(head,anchor);drag=null;}
  canvas.addEventListener('lostpointercapture',cancelDrag);
  window.addEventListener('blur',cancelDrag);
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('keydown',e=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)){e.preventDefault();
      if(e.key===' ')aimFire();else if(e.key==='ArrowUp'||e.key==='ArrowDown')angleInput.value=String(clamp(Number(angleInput.value)+(e.key==='ArrowUp'?5:-5),5,70));
      else powerInput.value=String(clamp(Number(powerInput.value)+(e.key==='ArrowRight'?5:-5),30,100));}
  });
  fireButton.addEventListener('click',aimFire);app.querySelector('.angry-reset').addEventListener('click',reset);
  nextButton.addEventListener('click',()=>{level=(level+1)%3;reset();});
  function sync(){const next=['ios','android'].includes(document.documentElement.dataset.theme)&&document.body.dataset.view==='angry'&&!document.getElementById('home-window').hidden;
    active=next;if(!active){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;accumulator=0;if(drag&&head)Body.setPosition(head,anchor);drag=null;return;}resize();animate();}
  document.addEventListener('nathan:viewchange',sync);document.addEventListener('nathan:themechange',sync);document.addEventListener('nathan:windowopen',sync);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;accumulator=0;cancelDrag();}else sync();});
  window.addEventListener('resize',resize,{passive:true});sync();
})();
