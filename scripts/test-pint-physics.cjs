const assert = require('node:assert/strict');
const p = require('../src/pint-physics');
const near = (actual, expected, message) => assert.ok(Math.abs(actual-expected)<1e-6, `${message}: ${actual} vs ${expected}`);
// Half a pint at 60 degrees remains beneath the rim, despite exceeding the
// previous arbitrary 42-degree drain threshold.
const half = p.geometry(60,.6,.5);
assert.ok(half.rim>0); near(p.retained(.5,half.capacity,10),.5,'No loss below rim');
const full = p.geometry(30,.6,1);
assert.ok(full.rim<0 && full.capacity<1);
let fill=1;for(let i=0;i<300;i++)fill=p.retained(fill,full.capacity,1/60);
near(fill,full.capacity,'Stationary tilt retains the beer below its rim');
near(p.geometry(30,.6,fill).rim,0,'Pouring stops at rim');
near(p.retained(fill,p.geometry(0,.6,fill).capacity,5),fill,'Upright conserves remaining volume');
for (const angle of [5,15,30,45,60,75,85]) {
  near(p.geometry(angle,.6,.4).capacity,p.geometry(-angle,.6,.4).capacity,'Both sides spill equally');
  assert.ok(p.geometry(angle,.6,.4).slope<0,'Positive tilt has beer on downhill right side');
}
near(p.geometry(95,.6,.2).capacity,0,'Inverted rim retains no beer');
near(p.orientationTilt(90,89),0,'Upright phone rejects raw gamma gimbal jump');
near(p.orientationTilt(90,-89),0,'Opposite gamma branch remains upright');
near(p.orientationTilt(80,90),10,'Ten degree right lean');
near(p.orientationTilt(100,90),-10,'Ten degree left lean');
near(p.orientationTilt(0,90,90),0,'Landscape right neutral');
near(p.orientationTilt(0,-90,270),0,'Landscape left neutral');
assert.equal(p.orientationTilt(0,0),null,'Flat phone has no screen gravity direction');
assert.equal(p.orientationTilt(null,0),null,'Missing sensor data ignored');
console.log('Passed volume conservation, rim overflow/retention, mirrored pouring, gravity direction and both landscape frames.');
