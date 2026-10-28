/* Opening adopted from Paul's selected 4173/v2 concept. Gallery remains Dimension. */
function createCollaborationOpening({projects,reduced}) {
  const $=id=>document.getElementById(id);
  const lockup=$('opening-lockup'),fly=$('moving-tdg'),cross=$('collab-cross');
  const reel=$('brand-reel'),windowEl=$('brand-window'),name=$('moving-name');
  const header=document.querySelector('.site-header .wordmark');
  const headerMark=header.querySelector('.tdg-mark'),headerName=header.querySelector('.tdg-name');
  const buildSeconds=5,rushSeconds=1,brakeSeconds=.45,initialSpeed=3.5,buildSpeed=4.5,peakSpeed=22;
  const buildDistance=20,rushDistance=13.25,cruiseSeconds=1.8/22;
  const motionEnd=900+(buildSeconds+rushSeconds+cruiseSeconds+brakeSeconds)*1000;
  const total=motionEnd+1050;
  let animations=[],timer,started=0,running=false,slot=100;
  function motion(elapsed) {
    const t=(elapsed-900)/1000;let distance=0,speed=0;
    if(t>0&&t<=5){const q=t/5;distance=initialSpeed*t+(buildSpeed-initialSpeed)*5*(q**3-.5*q**4);speed=initialSpeed+(buildSpeed-initialSpeed)*q*q*(3-2*q);}
    else if(t>5&&t<=6){const q=t-5;distance=buildDistance+buildSpeed*q+(peakSpeed-buildSpeed)*(q**3-.5*q**4);speed=buildSpeed+(peakSpeed-buildSpeed)*q*q*(3-2*q);}
    else if(t>6&&t<=6+cruiseSeconds){distance=buildDistance+rushDistance+peakSpeed*(t-6);speed=peakSpeed;}
    else if(t>6+cruiseSeconds&&t<6+cruiseSeconds+brakeSeconds){const q=(t-6-cruiseSeconds)/brakeSeconds;distance=buildDistance+rushDistance+peakSpeed*cruiseSeconds+peakSpeed*brakeSeconds*(q-q**3+.5*q**4);speed=peakSpeed*(1-q*q*(3-2*q));}
    else if(t>=6+cruiseSeconds+brakeSeconds){distance=40;}
    return {distance,speed,normalisedSpeed:speed/peakSpeed};
  }
  function finish() {
    clearTimeout(timer);animations.forEach(a=>a.cancel());animations=[];
    running=false;lockup.hidden=true;header.style.opacity=1;
  }
  function start(now=performance.now()) {
    finish();started=now;
    if(reduced.matches)return;
    running=true;lockup.hidden=false;header.style.opacity=0;
    const mobile=innerWidth<=700,scale=mobile?2:2.7,rowY=innerHeight*.29,at=ms=>ms/total;
    slot=mobile?80:100;reel.replaceChildren();
    const sequence=Array.from({length:4},()=>projects).flat().concat(projects[0]);
    sequence.forEach(p=>{const box=document.createElement('div');box.className='brand-slot';const img=document.createElement('img');img.src=p.logo.image;img.alt='';img.className='client-logo '+p.logo.treatment;box.append(img);reel.append(box);});
    reel.dataset.cycles='4';reel.dataset.steps='40';reel.style.transform='translateY(0)';reel.style.filter='none';cross.style.filter='none';
    const h=headerMark.getBoundingClientRect();Object.assign(fly.style,{left:h.x+'px',top:h.y+'px',width:h.width+'px',height:h.height+'px'});
    const x=innerWidth*.5-h.width*scale*.5-h.x,y=rowY-h.height*scale*.5-h.y,leftX=x-(mobile?80:130);
    const centered=`translate(${x}px,${y}px) scale(${scale})`,left=`translate(${leftX}px,${y}px) scale(${scale})`;
    function play(el,keyframes){const animation=el.animate(keyframes,{duration:total,easing:'linear',fill:'both'});animations.push(animation);}
    play(fly,[
      {transform:`translate(${x}px,${y+8}px) scale(${scale*.9})`,opacity:0,filter:'invert(1) blur(7px)',offset:0,easing:'ease-out'},
      {transform:centered,opacity:1,filter:'invert(1) blur(0px)',offset:at(250)},
      {transform:centered,opacity:1,filter:'invert(1) blur(0px)',offset:at(380),easing:'cubic-bezier(.22,1,.36,1)'},
      {transform:left,opacity:1,filter:'invert(1) blur(0px)',offset:at(760)},
      {transform:left,opacity:1,filter:'invert(1) blur(0px)',offset:at(motionEnd+450),easing:'cubic-bezier(.22,1,.36,1)'},
      {transform:'translate(0,0) scale(1)',opacity:1,filter:'invert(1) blur(0px)',offset:1}
    ]);
    play(cross,[{opacity:0,transform:'translateX(-8px)',offset:0},{opacity:0,transform:'translateX(-8px)',offset:at(720),easing:'ease-out'},{opacity:1,transform:'translateX(0)',offset:at(860)},{opacity:1,transform:'translateX(0)',offset:at(motionEnd+50),easing:'ease-out'},{opacity:0,transform:'translateY(-5px)',offset:at(motionEnd+290)},{opacity:0,offset:1}]);
    play(windowEl,[{opacity:0,offset:0},{opacity:0,offset:at(800),easing:'ease-out'},{opacity:1,offset:at(860)},{opacity:1,transform:'translateY(0)',filter:'blur(0px)',offset:at(motionEnd+50),easing:'ease-out'},{opacity:0,transform:'translateY(-9px)',filter:'blur(3px)',offset:at(motionEnd+290)},{opacity:0,offset:1}]);
    const n=headerName.getBoundingClientRect();Object.assign(name.style,{left:n.x+'px',top:n.y+'px'});
    const nx=innerWidth*.5+(mobile?17:12)-n.x,ny=rowY-n.height*scale*.5-n.y,pose=`translate(${nx}px,${ny}px) scale(${scale})`;
    play(name,[{opacity:0,transform:pose,filter:'blur(4px)',offset:0},{opacity:0,transform:`translate(${nx}px,${ny+8}px) scale(${scale})`,filter:'blur(4px)',offset:at(motionEnd+90),easing:'ease-out'},{opacity:1,transform:pose,filter:'blur(0px)',offset:at(motionEnd+350)},{opacity:1,transform:pose,offset:at(motionEnd+450),easing:'cubic-bezier(.22,1,.36,1)'},{opacity:1,transform:'translate(0,0) scale(1)',offset:1}]);
    timer=setTimeout(finish,total);
  }
  function sample(now) {
    const elapsed=now-started,phase=motion(elapsed);
    if(running){reel.style.transform=`translateY(${-phase.distance*slot}px)`;reel.style.filter=`blur(${(phase.normalisedSpeed*3.2).toFixed(2)}px)`;cross.style.filter=`blur(${(phase.normalisedSpeed*.8).toFixed(2)}px)`;}
    return {...phase,elapsed,running,settle:Math.max(0,Math.min(1,(elapsed-(motionEnd+450))/600)),total};
  }
  return {start,finish,sample,total,motionEnd,get running(){return running;}};
}
