/* Dimension adaptation. Native transforms keep input independent of document scroll. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const experience = $('experience'), orbit = $('orbit'), gallery = $('gallery'), track = $('track');
  const title = $('intro-title'), caption = $('case-caption'), category = $('case-category');
  const index = $('project-index'), controls = $('gallery-controls'), cue = $('scroll-cue');
  const projectDialog = $('project-dialog'), aboutDialog = $('about-dialog');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const count = cases.length, TAU = Math.PI * 2;
  let mode = 'intro', selected = 0, displaySlot = 2, lockUntil = 0, angle = -.14;
  let wheelSum = 0, lastWheel = 0, start = performance.now(), lastFrame = start;
  let width, height, mobile, cardW, cardH, pitch, centerY, frameId, entryTimer, wrapTimer;
  let pointerDown = null, moved = false, lastFocus = null, openOrigin = {x:.5,y:.5};
  const opening=createCollaborationOpening({projects:cases,reduced});
  const orbitCards = [], cards = [], indexButtons = [];
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const ease = t => 1 - Math.pow(1-clamp(t,0,1),4);
  const duration = n => reduced.matches ? 0 : n;
  const animate = (el,frames,options={}) => el.animate(frames,{duration:duration(600),easing:'cubic-bezier(.22,1,.36,1)',fill:'both',...options});
  const show = el => {el.classList.remove('is-hidden');el.style.visibility='visible';};
  const hide = el => {el.classList.add('is-hidden');el.style.visibility='hidden';};
  cases.forEach((project,i) => {
    const img = document.createElement('img');
    img.src = project.image; img.alt = ''; img.className='orbit-card'; img.decoding='async';
    img.style.opacity=0; orbit.append(img); orbitCards.push(img);
    const button = document.createElement('button'); button.setAttribute('aria-label',project.name);
    if(project.logo){const img=document.createElement('img');img.src=project.logo.image;img.alt=project.name;img.className='client-logo '+project.logo.treatment;button.append(img);}else{button.textContent=project.name;}
    button.addEventListener('click',()=>{enterGallery(i);});
    index.append(button); indexButtons.push(button);
  });
  for(let slot=0;slot<count+4;slot++){
    const i=(slot-2+count)%count, project=cases[i];
    const button=document.createElement('button');button.className='project-card';
    button.setAttribute('aria-label',`View ${project.name} project`);
    const img=document.createElement('img');img.src=project.image;img.alt=project.alt;img.draggable=false;
    button.append(img);button.addEventListener('click',e=>{
      if(moved)return;
      if(i!==selected){selectProject(i);return;}
      const rect=button.getBoundingClientRect();
      openProject(e.detail?e.clientX:rect.x+rect.width/2,e.detail?e.clientY:rect.y+rect.height/2);
    });track.append(button);cards.push({el:button,slot,index:i,rotation:Math.sin(i*18.371+1.7)*10.5});
  }
  function measure({smooth=false}={}){
    width=experience.clientWidth;height=experience.clientHeight;mobile=width<=700;
    const stacked=width<820,compact=height<540;
    experience.classList.toggle('gallery-stacked',stacked);experience.classList.toggle('gallery-compact',compact);
    const edge=mobile?22:width*.045,topSafe=mobile?82:92;
    const controlsBottom=mobile?(height<=700?12:22):35,contentBottom=height-controlsBottom-62;
    const set=(key,value)=>experience.style.setProperty(key,value);
    let captionWidth,captionTop;
    if(stacked){
      captionWidth=Math.min(width*.78,460);set('--caption-width',captionWidth+'px');set('--caption-left',(width-captionWidth)/2+'px');
      const captionHeight=Math.ceil(caption.getBoundingClientRect().height),gap=compact?16:24;
      const available=Math.max(64,contentBottom-topSafe-captionHeight-gap);
      cardW=Math.min(width*.78,mobile?360:460);cardH=Math.min(cardW*(mobile&&height>=500?1.25:300/460),available);
      const free=Math.max(0,contentBottom-topSafe-cardH-gap-captionHeight),photoTop=topSafe+free*.35;
      centerY=photoTop+cardH/2;captionTop=photoTop+cardH+gap;pitch=cardH+captionHeight+gap+100;
    }else{
      cardW=Math.min(460,width*.40,Math.max(90,contentBottom-topSafe)*460/300);cardH=cardW*300/460;
      centerY=clamp(height*.44,topSafe+cardH/2,contentBottom-cardH/2);
      const fullFrame=cardW+cardH*.22;captionWidth=Math.min(300,Math.max(120,(width-fullFrame)/2-edge-18));
      set('--caption-width',captionWidth+'px');set('--caption-left',edge+'px');
      const captionHeight=Math.ceil(caption.getBoundingClientRect().height);captionTop=clamp(centerY-captionHeight/2,topSafe,contentBottom-captionHeight);pitch=cardH*4/3;
    }
    set('--caption-top',captionTop+'px');set('--category-top',centerY+'px');set('--photo-bottom',centerY+cardH/2+'px');
    cards.forEach(card=>{card.el.style.width=`${cardW}px`;card.el.style.height=`${cardH}px`;card.el.style.top=`${card.slot*pitch}px`;});
    if(mode==='gallery')positionTrack(smooth);
    const path=[];for(let slot=0;slot<count+3;slot++){const y=slot*pitch;path.push(`${slot?'L':'M'}${width/2} ${y} C${width/2+35} ${y+pitch*.35} ${width/2-28} ${y+pitch*.65} ${width/2} ${y+pitch}`);}
    $('chain-thread').querySelector('path').setAttribute('d',path.join(' '));
  }
  function positionTrack(smooth=true){
    const y=centerY-displaySlot*pitch;
    track.style.transition=smooth?`transform ${duration(800)}ms var(--ease)`:'none';
    track.style.transform=`translateY(${y}px)`;
    const thread=$('chain-thread');thread.style.transition=track.style.transition;thread.style.transform=`translateY(${y}px)`;
    cards.forEach(card=>{
      card.el.style.transition=smooth?`transform ${duration(800)}ms var(--ease)`:'none';
      const active=card.slot===displaySlot;
      card.el.style.transform=`translate(-50%,-50%) rotate(${active?0:card.rotation}deg)`;
      card.el.classList.toggle('active',active);card.el.tabIndex=active?0:-1;
      card.el.setAttribute('aria-hidden',Math.abs(card.slot-displaySlot)>1?'true':'false');
    });
  }
  function updateCaption(){
    const p=cases[selected];$('case-number').textContent=String(selected+1).padStart(2,'0');
    $('case-name').textContent=p.name;
    const logo=$('case-logo');logo.replaceChildren();
    if(p.logo){const image=document.createElement('img');image.src=p.logo.image;image.alt=p.name;image.className='client-logo '+p.logo.treatment;logo.append(image);}else{const word=document.createElement('span');word.textContent=p.name;word.className='logo-fallback';logo.append(word);}
    $('case-line').textContent=p.line;category.textContent=p.category;
    $('position').textContent=`${String(selected+1).padStart(2,'0')} / ${count}`;
    $('live-project').textContent=`${p.name}. ${p.line}`;
    indexButtons.forEach((b,i)=>{b.setAttribute('aria-current',i===selected?'true':'false');});
    measure({smooth:true});
    [caption,category].forEach(el=>{show(el);animate(el,[{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:duration(610),delay:duration(110)});});
  }
  function enterGallery(target=selected){
    if(mode==='gallery'){selectProject(target);return;}
    if(mode==='transition')return;
    opening.finish();
    mode='transition';selected=target;displaySlot=target+2;lockUntil=performance.now()+duration(1000);
    cancelAnimationFrame(frameId);
    orbitCards.forEach((el,i)=>animate(el,[{opacity:el.style.opacity,scale:'1'},{opacity:0,scale:'1.35'}],{duration:duration(420),delay:duration(i*6)}));
    animate(title,[{opacity:1,scale:'1'},{opacity:0,scale:'1.05'}],{duration:duration(320)});
    animate(cue,[{opacity:1},{opacity:0}],{duration:duration(250)});
    animate($('orbit-thread'),[{opacity:1},{opacity:0}],{duration:duration(250)});
    clearTimeout(entryTimer);
    entryTimer=setTimeout(()=>{
      hide(orbit);hide(title);hide(cue);show(gallery);show(index);show(controls);
      mode='gallery';updateCaption();positionTrack(false);
      animate(gallery,[{opacity:0,scale:'.94'},{opacity:1,scale:'1'}],{duration:duration(600)});
      animate(index,[{opacity:0},{opacity:1}],{duration:duration(450)});
      animate(controls,[{opacity:0},{opacity:1}],{duration:duration(450)});
    },duration(440));
  }
  function selectProject(target,step){
    if(mode!=='gallery'){enterGallery((target+count)%count);return;}
    const next=(target+count)%count;if(next===selected)return;
    selected=next;displaySlot=step?displaySlot+step:selected+2;
    lockUntil=performance.now()+duration(820);updateCaption();
    clearTimeout(wrapTimer);
    if(displaySlot<2||displaySlot>=count+2){wrapTimer=setTimeout(()=>{displaySlot=selected+2;positionTrack(false);},duration(810));}
  }
  function advance(direction){
    if(projectDialog.open||aboutDialog.open)return;
    if(mode==='intro'){enterGallery(0);return;}
    if(mode!=='gallery'||performance.now()<lockUntil)return;
    selectProject(selected+direction,direction);
  }
  function ringFrame(now){
    if(mode!=='intro')return;
    const phase=opening.sample(now),elapsed=phase.elapsed/1000,dt=Math.min(now-lastFrame,40);lastFrame=now;
    const settle=reduced.matches?1:ease(phase.settle);
    if(!phase.running&&!reduced.matches)angle+=.00058*dt/(1000/60);
    const spin=reduced.matches?0:-phase.distance*Math.PI*.3;
    const finalRadius=Math.min(width,height)*.38,smallRadius=Math.min(width*.31,height*.21);
    const circleY=height*(.64-.14*settle),radius=smallRadius+(finalRadius-smallRadius)*settle;
    const factor=clamp(Math.min(width,height)/900,.34,1),points=[];
    orbitCards.forEach((el,i)=>{
      const arrival=reduced.matches?1:ease(i===0?(phase.elapsed-860)/180:(phase.distance-i)/.72);
      const a=i/count*TAU-Math.PI/2+angle+spin,r=radius*arrival*(reduced.matches?1:1+Math.sin(now*.0006+i)*.012);
      const x=Math.cos(a)*r,y=Math.sin(a)*r+circleY-height/2,scale=.245*factor*(.8+.2*arrival);
      el.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) rotate(${Math.sin(i*31.17)*3.5}deg) scale(${scale})`;
      el.style.opacity=arrival;el.style.filter=reduced.matches?'none':`blur(${(phase.normalisedSpeed*1.5).toFixed(2)}px)`;points.push(`${width/2+x},${height/2+y}`);
    });
    $('orbit-thread').querySelector('path').setAttribute('d','M'+points.join(' L')+' Z');$('orbit-thread').style.opacity=settle;
    title.style.opacity=reduced.matches?1:clamp((phase.elapsed-phase.total)/450,0,1);cue.style.opacity=title.style.opacity;
    if(!document.hidden&&!reduced.matches)frameId=requestAnimationFrame(ringFrame);
  }
  function resetHome(){
    clearTimeout(entryTimer);clearTimeout(wrapTimer);lockUntil=0;
    if(projectDialog.open)projectDialog.close();if(aboutDialog.open)aboutDialog.close();
    mode='intro';selected=0;angle=-.14;start=performance.now();lastFrame=start;
    [gallery,caption,category,index,controls].forEach(hide);
    [orbit,title,cue].forEach(el=>{el.getAnimations().forEach(a=>a.cancel());show(el);});
    orbitCards.forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
    $('orbit-thread').getAnimations().forEach(a=>a.cancel());
    cancelAnimationFrame(frameId);measure();opening.start(start);ringFrame(start);
  }
  function fillDetail(){
    const p=cases[selected];$('detail-title').textContent=p.name;$('detail-line').textContent=p.line;
    const detailLogo=$('detail-logo');detailLogo.replaceChildren();
    if(p.logo){const image=document.createElement('img');image.src=p.logo.image;image.alt='';image.className='client-logo '+p.logo.treatment;detailLogo.append(image);}
    $('detail-category').textContent=p.category;$('detail-image').src=p.image;$('detail-image').alt=p.alt;
    $('detail-copy').replaceChildren(...p.body.map(text=>{const el=document.createElement('p');el.textContent=text;return el;}));
    $('detail-services').replaceChildren(...p.services.map(text=>{const el=document.createElement('li');el.textContent=text;return el;}));
    $('detail-source').href=p.source;
    const nextProject=cases[(selected+1)%count],nextButton=$('detail-next');
    nextButton.replaceChildren();nextButton.setAttribute('aria-label',`Next project: ${nextProject.name}`);
    if(nextProject.logo){const image=document.createElement('img');image.src=nextProject.logo.image;image.alt='';image.className='client-logo '+nextProject.logo.treatment;nextButton.append(image);}else{nextButton.textContent=nextProject.name;}
  }
  function openProject(x=width/2,y=centerY){
    if(mode!=='gallery'||projectDialog.open)return;
    lastFocus=document.activeElement;openOrigin={x:x/width,y:y/height};fillDetail();projectDialog.showModal();projectDialog.scrollTop=0;
    const radius=Math.hypot(width,height)+48,origin=`${x}px ${y}px`;
    animate(projectDialog,[{clipPath:`circle(0px at ${origin})`},{clipPath:`circle(${radius}px at ${origin})`}],{duration:duration(850),easing:'cubic-bezier(.76,0,.24,1)'});
    animate($('detail-image'),[{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:duration(1500)});
    animate(document.querySelector('.detail-heading'),[{opacity:0,transform:'translateY(32px)'},{opacity:1,transform:'translateY(0)'}],{duration:duration(700),delay:duration(360)});
  }
  async function closeProject(){
    if(!projectDialog.open)return;
    const x=openOrigin.x*width,y=openOrigin.y*height,radius=Math.hypot(width,height)+48;
    await animate(projectDialog,[{clipPath:`circle(${radius}px at ${x}px ${y}px)`},{clipPath:`circle(0px at ${x}px ${y}px)`}],{duration:duration(550),easing:'cubic-bezier(.76,0,.24,1)'}).finished;
    projectDialog.close();lastFocus?.focus({preventScroll:true});
  }
  experience.addEventListener('wheel',e=>{
    if(projectDialog.open||aboutDialog.open||e.ctrlKey)return;e.preventDefault();
    const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
    if(Math.abs(delta)<2)return;
    const now=performance.now();if(now-lastWheel>180)wheelSum=0;lastWheel=now;
    if(now<lockUntil){wheelSum=0;return;}
    wheelSum+=delta;if(Math.abs(wheelSum)>=40){advance(Math.sign(wheelSum));wheelSum=0;}
  },{passive:false});
  experience.addEventListener('pointerdown',e=>{if(e.target.closest('button,a')){pointerDown={x:e.clientX,y:e.clientY};moved=false;return;}pointerDown={x:e.clientX,y:e.clientY};moved=false;});
  experience.addEventListener('pointermove',e=>{if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>8)moved=true;});
  experience.addEventListener('pointerup',e=>{if(!pointerDown)return;const dx=e.clientX-pointerDown.x,dy=e.clientY-pointerDown.y;pointerDown=null;if(Math.max(Math.abs(dx),Math.abs(dy))>26){advance(Math.abs(dx)>Math.abs(dy)?-Math.sign(dx):-Math.sign(dy));}setTimeout(()=>moved=false,0);});
  experience.addEventListener('pointercancel',()=>{pointerDown=null;moved=false;});
  document.addEventListener('keydown',e=>{
    if(projectDialog.open||aboutDialog.open)return;
    if(['ArrowDown','ArrowRight','PageDown'].includes(e.key)){e.preventDefault();advance(1);}
    if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();advance(-1);}
    if(e.key==='Home'){e.preventDefault();enterGallery(0);}
    if(e.key==='End'){e.preventDefault();enterGallery(count-1);}
  });
  $('next').addEventListener('click',()=>advance(1));$('previous').addEventListener('click',()=>advance(-1));
  $('work-link').addEventListener('click',()=>enterGallery(0));
  document.querySelector('.wordmark').addEventListener('click',e=>{e.preventDefault();resetHome();});
  $('open-case').addEventListener('click',()=>openProject());$('close-project').addEventListener('click',closeProject);
  projectDialog.addEventListener('cancel',e=>{e.preventDefault();closeProject();});
  $('detail-next').addEventListener('click',()=>{selected=(selected+1)%count;displaySlot=selected+2;positionTrack(false);updateCaption();fillDetail();projectDialog.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});});
  $('about-link').addEventListener('click',()=>{aboutDialog.showModal();animate(aboutDialog,[{opacity:0,transform:'translateY(15px)'},{opacity:1,transform:'translateY(0)'}],{duration:duration(450)});});
  $('close-about').addEventListener('click',()=>aboutDialog.close());
  document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();enterGallery(0);setTimeout(()=>{const target=getComputedStyle(index).display==='none'?document.querySelector('.project-card.active'):indexButtons[0];target.focus({preventScroll:true});},duration(450));});
  window.addEventListener('resize',measure);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode==='intro'){lastFrame=performance.now();ringFrame(lastFrame);}});
  reduced.addEventListener('change',()=>{
    cancelAnimationFrame(frameId);if(reduced.matches)opening.finish();if(mode==='intro')ringFrame(performance.now());
  });
  measure();document.fonts.ready.then(()=>{if(mode!=='intro')return;start=performance.now();lastFrame=start;opening.start(start);ringFrame(start);});
})();
