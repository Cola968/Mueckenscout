/** Lightweight on-device candidate detector, NOT a trained insect species classifier. */
export class MotionDetector {
  constructor(width,height,{sensitivity=66,polarity='auto'}={}){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw new RangeError('Ungültige Abmessungen');
    this.width=width;this.height=height;this.setSensitivity(sensitivity);this.setPolarity(polarity);this.reset();
  }
  setSensitivity(v){const n=Number(v);this.sensitivity=Number.isFinite(n)?Math.max(1,Math.min(100,n)):66;}
  setPolarity(v){this.polarity=['auto','bright','dark'].includes(v)?v:'auto';}
  reset(){this.background=null;this.previous=null;this.tracks=[];this.nextId=1;}
  process(rgba,time=performance.now()){
    const W=this.width,H=this.height,N=W*H;
    if(!rgba||rgba.length!==N*4)throw new RangeError('Ungültige Bildgröße');
    const pixels=new Uint8Array(N);
    let brightness=0;
    for(let i=0,j=0;i<N;i++,j+=4){
      const value=Math.round(rgba[j]*.299+rgba[j+1]*.587+rgba[j+2]*.114);
      pixels[i]=value;brightness+=value;
    }
    const mean=brightness/N;
    const lowLight=mean<28;
    const empty=(calibrated,shake=false,motion=0)=>({confirmed:[],candidates:[],shake,motion,calibrated,lowLight});
    if(!this.background){this.background=Float32Array.from(pixels);this.previous=pixels;return empty(false);}
    const threshold=50-this.sensitivity*.33;
    const temporalThreshold=Math.max(7,threshold*.32);
    const mask=new Int8Array(N);
    let changed=0,temporal=0,globalStep=0;
    for(let i=0;i<N;i++){
      const delta=pixels[i]-this.background[i];
      const step=pixels[i]-this.previous[i];
      if(Math.abs(delta)>threshold)changed++;
      if(Math.abs(step)>temporalThreshold)temporal++;
      globalStep+=step;
      if(Math.abs(delta)<=threshold||Math.abs(step)<=temporalThreshold)continue;
      if(delta<0&&this.polarity!=='bright')mask[i]=-1;
      if(delta>0&&this.polarity!=='dark')mask[i]=1;
    }
    const ratio=changed/N;
    // Recalibrate on pan, shake, exposure step or abrupt scene switch.
    const shake=ratio>.18||temporal/N>.14||Math.abs(globalStep/N)>18;
    if(shake){this.background=Float32Array.from(pixels);this.previous=pixels;this.tracks=[];return empty(true,true,ratio);}
    const alpha=ratio>.025?.012:.036;
    for(let i=0;i<N;i++)this.background[i]+=(pixels[i]-this.background[i])*alpha;
    this.previous=pixels;
    const visited=new Uint8Array(N),components=[],stack=[];
    const minArea=this.sensitivity>=88?1:2;
    const maxArea=Math.max(15,Math.floor(N*.00085));
    const maxSide=Math.max(9,Math.floor(Math.min(W,H)*.12));
    for(let first=0;first<N;first++){
      if(mask[first]===0||visited[first])continue;
      const sign=mask[first];stack.push(first);visited[first]=1;
      let area=0,minX=W,maxX=0,minY=H,maxY=0,sumX=0,sumY=0;
      while(stack.length){
        const i=stack.pop(),x=i%W,y=(i-x)/W;
        area++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);
        minY=Math.min(minY,y);maxY=Math.max(maxY,y);sumX+=x;sumY+=y;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(dx===0&&dy===0)continue;
          const nx=x+dx,ny=y+dy;
          if(nx<0||nx>=W||ny<0||ny>=H)continue;
          const ni=ny*W+nx;
          if(mask[ni]===sign&&!visited[ni]){visited[ni]=1;stack.push(ni);}
        }
      }
      const w=maxX-minX+1,h=maxY-minY+1;
      if(area>=minArea&&area<=maxArea&&w<=maxSide&&h<=maxSide&&Math.max(w,h)/Math.min(w,h)<=4.5)
        components.push({x:sumX/area,y:sumY/area,w,h,area,polarity:sign>0?'bright':'dark'});
    }
    // Larger components get priority over isolated single-pixel sensor noise.
    components.sort((a,b)=>b.area-a.area);
    const candidates=components.slice(0,50);
    const tracks=this.tracks.filter(t=>time-t.lastTime<660);
    for(const t of tracks)t.matched=false;
    const maxDist=Math.max(8,Math.min(W,H)*.18);
    for(const c of candidates){
      let best=null,dist=maxDist;
      for(const t of tracks){
        if(t.matched||t.polarity!==c.polarity)continue;
        const d=Math.hypot(t.x-c.x,t.y-c.y);
        if(d<dist){dist=d;best=t;}
      }
      if(best){
        const elapsed=time-best.lastTime;
        if(dist>1.25&&elapsed>0)best.moves++;
        if(elapsed<=260)best.streak++;else best.streak=1;
        best.travel+=dist;best.hits++;best.x=c.x;best.y=c.y;best.w=c.w;best.h=c.h;
        best.lastTime=time;best.matched=true;
      }else{
        tracks.push({id:this.nextId++,x:c.x,y:c.y,w:c.w,h:c.h,polarity:c.polarity,lastTime:time,
          firstTime:time,streak:1,hits:1,moves:0,travel:0,matched:true});
      }
    }
    this.tracks=tracks.filter(t=>time-t.lastTime<660).slice(-70);
    const confirmed=this.tracks.filter(t=>t.matched&&t.streak>=4&&t.moves>=3&&t.travel>=6&&time-t.firstTime>=180)
      .slice(0,6).map(t=>({id:t.id,x:t.x,y:t.y,w:t.w,h:t.h,polarity:t.polarity,frames:t.streak}));
    return {confirmed,candidates,shake:false,motion:ratio,calibrated:true,lowLight};
  }
}
