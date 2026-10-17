import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionDetector } from '../src/detector.mjs';
const W=128,H=96;
function frame(spot=null, bg=210) {
 const data=new Uint8ClampedArray(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4;
  const value=spot && x>=spot.x && x<spot.x+spot.s && y>=spot.y && y<spot.y+spot.s?spot.value:bg;
  data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 return data;
}
test('ruhige Wand, statischer Fleck: keine Flugobjekt-Meldung',()=>{
 const d=new MotionDetector(W,H,{sensitivity:70});
 for(let i=0;i<12;i++) assert.equal(d.process(frame({x:30,y:30,s:3,value:25}),i*90).confirmed.length,0);
});
test('kleiner dunkler, mehrfach bewegter Punkt: Flugobjekt-Hinweis',()=>{
 const d=new MotionDetector(W,H,{sensitivity:70});d.process(frame(),0);
 let out;
 for(let i=0;i<9;i++)out=d.process(frame({x:12+i*3,y:24+i,s:3,value:35}),100+i*95);
 assert.ok(out.confirmed.length>0);
 assert.equal(out.confirmed[0].polarity,'dark');
});
test('helles, bewegtes Insekt vor dunklem IR-Bild: Auto-Modus erfasst es',()=>{
 const d=new MotionDetector(W,H,{sensitivity:70,polarity:'auto'});d.process(frame(null,30),0);
 let out;
 for(let i=0;i<9;i++)out=d.process(frame({x:20+i*3,y:20+i,s:3,value:220},30),100+i*95);
 assert.ok(out.confirmed.length>0);
 assert.equal(out.confirmed[0].polarity,'bright');
});
test('Dunkel-Filter ignoriert helle Objekte',()=>{
 const d=new MotionDetector(W,H,{sensitivity:90,polarity:'dark'});d.process(frame(null,30),0);
 for(let i=0;i<9;i++)assert.equal(d.process(frame({x:20+i*3,y:20+i,s:3,value:220},30),100+i*95).confirmed.length,0);
});
test('flächiger Helligkeitswechsel: keine Treffer, Neukalibrierung',()=>{
 const d=new MotionDetector(W,H);d.process(frame(),0);
 const out=d.process(frame(null,90),120);
 assert.equal(out.shake,true);assert.equal(out.confirmed.length,0);
});
test('großer bewegter Gegenstand: ausgeschlossen',()=>{
 const d=new MotionDetector(W,H);d.process(frame(),0);
 for(let i=0;i<7;i++) assert.equal(d.process(frame({x:10+i*2,y:18,s:27,value:20}),100+i*90).confirmed.length,0);
});
test('unterbelichtetes Videobild erzeugt Low-Light-Hinweis',()=>{
 const d=new MotionDetector(W,H);const r=d.process(frame(null,6),0);
 assert.equal(r.lowLight,true);
});
test('einmaliges Pixelrauschen ist keine bestätigte Insektenbewegung',()=>{
 const d=new MotionDetector(W,H,{sensitivity:98});d.process(frame(),0);
 d.process(frame({x:25,y:33,s:1,value:0}),90);
 for(let i=2;i<8;i++) assert.equal(d.process(frame(),i*90).confirmed.length,0);
});
test('ein verlorenes Objekt wird nach einer Pause aus der Verfolgung entfernt',()=>{
 const d=new MotionDetector(W,H,{sensitivity:70});d.process(frame(),0);
 for(let i=0;i<8;i++)d.process(frame({x:20+i*3,y:20+i,s:3,value:35}),100+i*95);
 for(let i=9;i<26;i++) d.process(frame(),100+i*95);
 assert.equal(d.tracks.length,0);
});
test('reset verwirft Spuren, Größe falsch wirft Fehler',()=>{
 const d=new MotionDetector(W,H);d.process(frame(),0);d.reset();assert.equal(d.process(frame(),90).calibrated,false);
 assert.throws(()=>d.process(new Uint8Array(14),100),RangeError);
});
