// ===== ÉDITEUR PHOTO =====
function openPhotoEditorFromFilmstrip(index){closeFilmstrip();editingPhotoIndex=index;if(sessionPhotos[index]?.dataUrl)openPhotoEditor(sessionPhotos[index].dataUrl);}

function openPhotoEditor(dataUrl){
  const editor=document.getElementById('photoEditor');
  editor.style.display='flex';
  editor.style.zIndex='210';
  // S'assurer que le header est visible sur iPhone PWA
  const header=document.getElementById('editorHeader');
  if(header){
    header.style.paddingTop='calc(env(safe-area-inset-top,44px) + 12px)';
    header.style.minHeight='70px';
  }
  const nav=document.getElementById('bottomNav');if(nav)nav.classList.add('nav-hidden');
  document.getElementById('cameraFullscreen').style.display='none';
  ['annotToolbar','adjustToolbar','cropToolbar'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  // Nettoyer overlay crop et texte
  const oldCrop=document.getElementById('cropOverlayDiv');if(oldCrop)oldCrop.remove();
  const oldText=document.getElementById('liveTextEl');if(oldText)oldText.remove();
  const oldBtn=document.getElementById('liveTextConfirmBtn');if(oldBtn)oldBtn.remove();
  editState={tool:null,color:'#FF453A',size:4,drawing:false,startX:0,startY:0,history:[],baseImage:null,brightness:0,contrast:0,saturation:0};
  cropRatioValue=null; cropHandles.rect={x:0,y:0,w:1,h:1};
  ['sliderBrightness','sliderContrast','sliderSaturation'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=0;});
  document.querySelectorAll('.editor-mode-btn').forEach(b=>b.classList.remove('active'));
  setTimeout(()=>initEditCanvas(dataUrl),80);
}

function initEditCanvas(dataUrl){
  const canvas=document.getElementById('editCanvas'),area=document.getElementById('editorImageArea');
  if(!canvas||!area) return;
  const ctx=canvas.getContext('2d'),img=new Image();
  img.onload=()=>{
    const headerH=document.getElementById('editorHeader')?.offsetHeight||60;
    const availH=window.innerHeight-headerH-60;
    const ratio=Math.min(area.offsetWidth/img.width,availH/img.height,1);
    canvas.width=img.width;canvas.height=img.height;
    canvas.style.width=Math.round(img.width*ratio)+'px';canvas.style.height=Math.round(img.height*ratio)+'px';
    canvas.style.filter='';
    ctx.drawImage(img,0,0);
    editState.baseImage=ctx.getImageData(0,0,canvas.width,canvas.height);
    editState.history=[ctx.getImageData(0,0,canvas.width,canvas.height)];
    setupEditEvents(canvas,ctx);
  };
  img.src=dataUrl;
}

function setupEditEvents(canvas,ctx){
  const keys=['_et','_em','_ee','_ed','_emm','_eu'];
  keys.forEach(k=>{if(canvas[k]){const evName=k==='_et'?'touchstart':k==='_em'?'touchmove':k==='_ee'?'touchend':k==='_ed'?'mousedown':k==='_emm'?'mousemove':'mouseup';canvas.removeEventListener(evName,canvas[k]);}});
  const pt=t=>{const r=canvas.getBoundingClientRect();return{x:(t.clientX-r.left)*canvas.width/r.width,y:(t.clientY-r.top)*canvas.height/r.height};};
  const pm=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
  canvas._et=e=>{if(e.touches.length!==1||!editState.tool)return;e.preventDefault();const p=pt(e.touches[0]);editStartDraw(ctx,p.x,p.y);};
  canvas._em=e=>{if(e.touches.length!==1||!editState.drawing)return;e.preventDefault();const p=pt(e.touches[0]);editMoveDraw(ctx,p.x,p.y);};
  canvas._ee=e=>{e.preventDefault();editEndDraw(ctx);};
  canvas._ed=e=>{if(!editState.tool)return;const p=pm(e);editStartDraw(ctx,p.x,p.y);};
  canvas._emm=e=>{if(!editState.drawing)return;const p=pm(e);editMoveDraw(ctx,p.x,p.y);};
  canvas._eu=()=>editEndDraw(ctx);
  canvas.addEventListener('touchstart',canvas._et,{passive:false});
  canvas.addEventListener('touchmove',canvas._em,{passive:false});
  canvas.addEventListener('touchend',canvas._ee,{passive:false});
  canvas.addEventListener('mousedown',canvas._ed);
  canvas.addEventListener('mousemove',canvas._emm);
  canvas.addEventListener('mouseup',canvas._eu);
}

function editStartDraw(ctx,x,y){if(!editState.tool)return;editState.drawing=true;editState.startX=x;editState.startY=y;if(['pen','marker','erase'].includes(editState.tool)){ctx.beginPath();ctx.moveTo(x,y);}}
function editMoveDraw(ctx,x,y){
  if(!editState.drawing||!editState.tool) return;
  ctx.globalAlpha=editState.tool==='marker'?0.45:1.0;
  ctx.strokeStyle=editState.color;ctx.lineWidth=editState.tool==='marker'?editState.size*3.5:editState.size;
  ctx.lineCap='round';ctx.lineJoin='round';
  if(editState.tool==='pen'||editState.tool==='marker'){ctx.lineTo(x,y);ctx.stroke();}
  else if(editState.tool==='erase'){ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=1;ctx.lineWidth=editState.size*5;ctx.lineTo(x,y);ctx.stroke();ctx.globalCompositeOperation='source-over';}
  else if(['arrow','circle','rect'].includes(editState.tool)){
    ctx.globalAlpha=1;
    if(editState.history.length>0)ctx.putImageData(editState.history[editState.history.length-1],0,0);
    ctx.fillStyle=editState.color;ctx.lineWidth=Math.max(editState.size,2);
    if(editState.tool==='arrow')drawArrow(ctx,editState.startX,editState.startY,x,y);
    else if(editState.tool==='circle'){const rx=Math.abs(x-editState.startX)/2,ry=Math.abs(y-editState.startY)/2;ctx.beginPath();ctx.ellipse((editState.startX+x)/2,(editState.startY+y)/2,Math.max(rx,4),Math.max(ry,4),0,0,Math.PI*2);ctx.stroke();}
    else if(editState.tool==='rect'){ctx.strokeRect(editState.startX,editState.startY,x-editState.startX,y-editState.startY);}
  }
}
function editEndDraw(ctx){if(!editState.drawing)return;editState.drawing=false;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.beginPath();editState.history.push(ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height));}
function drawArrow(ctx,x1,y1,x2,y2){const headLen=Math.max(14,editState.size*4),angle=Math.atan2(y2-y1,x2-x1);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-headLen*Math.cos(angle-Math.PI/6),y2-headLen*Math.sin(angle-Math.PI/6));ctx.lineTo(x2-headLen*Math.cos(angle+Math.PI/6),y2-headLen*Math.sin(angle+Math.PI/6));ctx.closePath();ctx.fill();}
function setEditTool(tool,btn){if(editState.tool===tool){editState.tool=null;document.querySelectorAll('.annot-tool').forEach(b=>b.classList.remove('active'));return;}editState.tool=tool;document.querySelectorAll('.annot-tool').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
function setEditColor(color,el){editState.color=color;document.querySelectorAll('.color-dot').forEach(e=>e.classList.remove('active'));el.classList.add('active');}
function undoEdit(){if(editState.history.length<=1){showToast('Rien à annuler');return;}editState.history.pop();const ctx=document.getElementById('editCanvas').getContext('2d');ctx.putImageData(editState.history[editState.history.length-1],0,0);}
function showAnnotMode(){document.getElementById('annotToolbar').style.display='block';document.getElementById('adjustToolbar').style.display='none';document.getElementById('cropToolbar').style.display='none';const oldCrop=document.getElementById('cropOverlayDiv');if(oldCrop)oldCrop.remove();setActiveEditorBtn('btnAnnot');}
function showAdjust(){document.getElementById('annotToolbar').style.display='none';document.getElementById('adjustToolbar').style.display='block';document.getElementById('cropToolbar').style.display='none';const oldCrop=document.getElementById('cropOverlayDiv');if(oldCrop)oldCrop.remove();setActiveEditorBtn('btnAdjust');}
function setActiveEditorBtn(id){document.querySelectorAll('.editor-mode-btn').forEach(b=>b.classList.remove('active'));const el=document.getElementById(id);if(el)el.classList.add('active');}

function applyAdjust(type,val){
  editState[type]=parseInt(val);
  const canvas=document.getElementById('editCanvas');
  let f='';
  if(editState.brightness!==0)f+=`brightness(${1+editState.brightness/100}) `;
  if(editState.contrast!==0)f+=`contrast(${1+editState.contrast/100}) `;
  if(editState.saturation!==0)f+=`saturate(${1+editState.saturation/100}) `;
  canvas.style.filter=f.trim();
}

// ===== CROP AVEC POIGNÉES DRAGGABLES =====
function showCropMode(){
  document.getElementById('annotToolbar').style.display='none';
  document.getElementById('adjustToolbar').style.display='none';
  document.getElementById('cropToolbar').style.display='block';
  setActiveEditorBtn('btnCrop');
  initCropOverlay();
}

function initCropOverlay(){
  const canvas=document.getElementById('editCanvas'),area=document.getElementById('editorImageArea');
  if(!canvas||!area) return;
  const old=document.getElementById('cropOverlayDiv');if(old)old.remove();
  const overlay=document.createElement('div');
  overlay.id='cropOverlayDiv';
  area.style.position='relative';
  overlay.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden;';
  overlay.innerHTML=`
    <svg id="cropSvg" width="100%" height="100%" style="position:absolute;inset:0;">
      <defs><mask id="cropMask"><rect width="100%" height="100%" fill="white"/><rect id="cropHole" fill="black"/></mask></defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#cropMask)"/>
      <rect id="cropBox" fill="none" stroke="white" stroke-width="1.5"/>
      <line id="cL1" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
      <line id="cL2" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
      <line id="cL3" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
      <line id="cL4" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
    </svg>
    <div class="crop-h" data-h="tl" style="top:0;left:0;border-top:3px solid white;border-left:3px solid white;border-radius:2px 0 0 0;"></div>
    <div class="crop-h" data-h="tr" style="top:0;right:0;border-top:3px solid white;border-right:3px solid white;border-radius:0 2px 0 0;"></div>
    <div class="crop-h" data-h="bl" style="bottom:0;left:0;border-bottom:3px solid white;border-left:3px solid white;border-radius:0 0 0 2px;"></div>
    <div class="crop-h" data-h="br" style="bottom:0;right:0;border-bottom:3px solid white;border-right:3px solid white;border-radius:0 0 2px 0;"></div>
    <div class="crop-h" data-h="t" style="top:0;left:50%;transform:translateX(-50%);border-top:3px solid white;width:24px;height:14px;"></div>
    <div class="crop-h" data-h="b" style="bottom:0;left:50%;transform:translateX(-50%);border-bottom:3px solid white;width:24px;height:14px;"></div>
    <div class="crop-h" data-h="l" style="left:0;top:50%;transform:translateY(-50%);border-left:3px solid white;width:14px;height:24px;"></div>
    <div class="crop-h" data-h="r" style="right:0;top:50%;transform:translateY(-50%);border-right:3px solid white;width:14px;height:24px;"></div>`;
  const style=document.createElement('style');
  style.textContent='.crop-h{position:absolute;width:22px;height:22px;cursor:pointer;pointer-events:all;touch-action:none;}';
  overlay.appendChild(style);
  area.appendChild(overlay);
  cropHandles.rect={x:0.05,y:0.05,w:0.9,h:0.9};
  updateCropOverlay();
  overlay.querySelectorAll('.crop-h').forEach(h=>{
    h.addEventListener('touchstart',cropHandleStart,{passive:false});
    h.addEventListener('mousedown',cropHandleStart);
  });
  document.addEventListener('touchmove',cropHandleMove,{passive:false});
  document.addEventListener('touchend',cropHandleEnd,{passive:true});
  document.addEventListener('mousemove',cropHandleMove);
  document.addEventListener('mouseup',cropHandleEnd);
}

function updateCropOverlay(){
  const canvas=document.getElementById('editCanvas'),overlay=document.getElementById('cropOverlayDiv');
  if(!canvas||!overlay) return;
  const cr=canvas.getBoundingClientRect(),ar=overlay.getBoundingClientRect();
  const w=cr.width,h=cr.height;
  const ox=cr.left-ar.left,oy=cr.top-ar.top;
  const r=cropHandles.rect;
  const x=ox+r.x*w,y=oy+r.y*h,bw=r.w*w,bh=r.h*h;
  const hole=overlay.querySelector('#cropHole'),box=overlay.querySelector('#cropBox');
  if(hole){hole.setAttribute('x',x);hole.setAttribute('y',y);hole.setAttribute('width',bw);hole.setAttribute('height',bh);}
  if(box){box.setAttribute('x',x);box.setAttribute('y',y);box.setAttribute('width',bw);box.setAttribute('height',bh);}
  const l1=overlay.querySelector('#cL1'),l2=overlay.querySelector('#cL2'),l3=overlay.querySelector('#cL3'),l4=overlay.querySelector('#cL4');
  if(l1){l1.setAttribute('x1',x+bw/3);l1.setAttribute('y1',y);l1.setAttribute('x2',x+bw/3);l1.setAttribute('y2',y+bh);}
  if(l2){l2.setAttribute('x1',x+bw*2/3);l2.setAttribute('y1',y);l2.setAttribute('x2',x+bw*2/3);l2.setAttribute('y2',y+bh);}
  if(l3){l3.setAttribute('x1',x);l3.setAttribute('y1',y+bh/3);l3.setAttribute('x2',x+bw);l3.setAttribute('y2',y+bh/3);}
  if(l4){l4.setAttribute('x1',x);l4.setAttribute('y1',y+bh*2/3);l4.setAttribute('x2',x+bw);l4.setAttribute('y2',y+bh*2/3);}
  // Repositionner poignées
  const hPos={tl:[x-11,y-11],tr:[x+bw-11,y-11],bl:[x-11,y+bh-11],br:[x+bw-11,y+bh-11],t:[x+bw/2-11,y-11],b:[x+bw/2-11,y+bh-11],l:[x-11,y+bh/2-11],r:[x+bw-11,y+bh/2-11]};
  overlay.querySelectorAll('.crop-h').forEach(h=>{const pos=hPos[h.dataset.h];if(pos){h.style.left=pos[0]+'px';h.style.top=pos[1]+'px';}});
}

function cropHandleStart(e){
  e.preventDefault();
  cropHandles.active=true;cropHandles.handle=e.currentTarget.dataset.h;
  const touch=e.touches?e.touches[0]:e;
  cropHandles.startX=touch.clientX;cropHandles.startY=touch.clientY;
  cropHandles.startRect={...cropHandles.rect};
}

function cropHandleMove(e){
  if(!cropHandles.active) return;
  if(e.cancelable) e.preventDefault();
  const touch=e.touches?e.touches[0]:e;
  const canvas=document.getElementById('editCanvas');if(!canvas)return;
  const cr=canvas.getBoundingClientRect();
  const dx=(touch.clientX-cropHandles.startX)/cr.width;
  const dy=(touch.clientY-cropHandles.startY)/cr.height;
  const sr=cropHandles.startRect,r={...sr},h=cropHandles.handle,min=0.05;
  if(h==='tl'||h==='l'||h==='bl'){r.x=Math.max(0,Math.min(sr.x+dx,sr.x+sr.w-min));r.w=sr.w-(r.x-sr.x);}
  if(h==='tr'||h==='r'||h==='br'){r.w=Math.max(min,Math.min(sr.w+dx,1-sr.x));}
  if(h==='tl'||h==='t'||h==='tr'){r.y=Math.max(0,Math.min(sr.y+dy,sr.y+sr.h-min));r.h=sr.h-(r.y-sr.y);}
  if(h==='bl'||h==='b'||h==='br'){r.h=Math.max(min,Math.min(sr.h+dy,1-sr.y));}
  cropHandles.rect=r;updateCropOverlay();
}

function cropHandleEnd(){cropHandles.active=false;}

function setCropRatioBtn(ratio,btn){
  cropRatioValue=ratio;
  document.querySelectorAll('.crop-ratio-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  if(ratio){
    const canvas=document.getElementById('editCanvas');if(!canvas)return;
    const cw=canvas.width,ch=canvas.height,curr=cw/ch;
    let nx=0.05,ny=0.05,nw=0.9,nh=0.9;
    if(curr>ratio){nw=(ch*ratio)/cw*0.9;nx=(1-nw)/2;}
    else{nh=(cw/ratio)/ch*0.9;ny=(1-nh)/2;}
    cropHandles.rect={x:nx,y:ny,w:nw,h:nh};
  } else {
    cropHandles.rect={x:0.05,y:0.05,w:0.9,h:0.9};
  }
  updateCropOverlay();
}

function applyCrop(){
  const canvas=document.getElementById('editCanvas'),ctx=canvas.getContext('2d');
  const filter=canvas.style.filter;canvas.style.filter='';
  const r=cropHandles.rect;
  const cropX=Math.round(r.x*canvas.width),cropY=Math.round(r.y*canvas.height);
  const cropW=Math.round(r.w*canvas.width),cropH=Math.round(r.h*canvas.height);
  if(cropW<10||cropH<10){showToast('Zone de recadrage trop petite');return;}
  const temp=document.createElement('canvas');temp.width=cropW;temp.height=cropH;
  const tCtx=temp.getContext('2d');if(filter)tCtx.filter=filter;
  tCtx.drawImage(canvas,cropX,cropY,cropW,cropH,0,0,cropW,cropH);tCtx.filter='none';
  canvas.width=cropW;canvas.height=cropH;ctx.drawImage(temp,0,0);
  const area=document.getElementById('editorImageArea');
  const headerH=document.getElementById('editorHeader')?.offsetHeight||60;
  const maxW=area.offsetWidth,maxH=window.innerHeight-headerH-60;
  const ratio=Math.min(maxW/cropW,maxH/cropH,1);
  canvas.style.width=Math.round(cropW*ratio)+'px';canvas.style.height=Math.round(cropH*ratio)+'px';canvas.style.filter='';
  editState.history.push(ctx.getImageData(0,0,cropW,cropH));editState.baseImage=ctx.getImageData(0,0,cropW,cropH);
  const old=document.getElementById('cropOverlayDiv');if(old)old.remove();
  cropHandles.rect={x:0.05,y:0.05,w:0.9,h:0.9};
  document.getElementById('cropToolbar').style.display='none';
  showToast('✂️ Recadrage appliqué');
}

function rotateCrop(){
  const canvas=document.getElementById('editCanvas'),ctx=canvas.getContext('2d');canvas.style.filter='';
  const temp=document.createElement('canvas');temp.width=canvas.height;temp.height=canvas.width;
  const tCtx=temp.getContext('2d');tCtx.translate(temp.width/2,temp.height/2);tCtx.rotate(Math.PI/2);tCtx.drawImage(canvas,-canvas.width/2,-canvas.height/2);
  canvas.width=temp.width;canvas.height=temp.height;ctx.drawImage(temp,0,0);
  const area=document.getElementById('editorImageArea');
  const maxW=area.offsetWidth,maxH=window.innerHeight-120;
  const ratio=Math.min(maxW/canvas.width,maxH/canvas.height,1);
  canvas.style.width=Math.round(canvas.width*ratio)+'px';canvas.style.height=Math.round(canvas.height*ratio)+'px';
  editState.history.push(ctx.getImageData(0,0,canvas.width,canvas.height));editState.baseImage=ctx.getImageData(0,0,canvas.width,canvas.height);
  const old=document.getElementById('cropOverlayDiv');if(old)old.remove();
  setTimeout(()=>initCropOverlay(),100);
  showToast('↺ Rotation 90°');
}

// ===== TEXTE LIVE DÉPLAÇABLE =====
function activateTextTool(){
  const btn=document.getElementById('textToolBtn');
  document.querySelectorAll('.annot-tool').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  editState.tool='text';
  showTextDialog();
}

function showTextDialog(){
  const dlg=document.getElementById('textDialog');
  if(!dlg) return;
  // Ajouter zone d'aperçu si pas encore présente
  if(!document.getElementById('textPreview')){
    const preview=document.createElement('div');
    preview.id='textPreview';
    preview.style.cssText="background:#1c1c1e;border-radius:8px;padding:10px;text-align:center;min-height:40px;margin-bottom:12px;font-family:'DM Sans',Arial,sans-serif;font-weight:bold;color:white;font-size:24px;word-break:break-all;";
    preview.textContent='Aperçu';
    const firstChild=dlg.querySelector('div');
    if(firstChild) dlg.insertBefore(preview,firstChild.nextSibling);
  }
  dlg.style.display='flex';
  const input=document.getElementById('textInput'),sizeEl=document.getElementById('textSizeSlider'),sizeVal=document.getElementById('textSizeValue');
  if(sizeEl&&sizeVal){
    sizeEl.value=32;sizeVal.textContent='32';
    liveText.size=32;
    // iOS: utiliser les deux events pour garantir le déclenchement
    const onSizeChange=()=>{
      liveText.size=parseInt(sizeEl.value);
      sizeVal.textContent=sizeEl.value;
      updateLiveText();
    };
    sizeEl.oninput=onSizeChange;
    sizeEl.addEventListener('change',onSizeChange);
    sizeEl.addEventListener('touchmove',onSizeChange,{passive:true});
  }
  if(input){
    input.value='';
    const onInputChange=()=>{liveText.text=input.value;updateLiveText();};
    input.oninput=onInputChange;
    setTimeout(()=>input.focus(),100);
  }
}

function confirmTextDialog(){
  const input=document.getElementById('textInput'),text=input?input.value.trim():'';
  if(!text){cancelTextDialog();return;}
  liveText.text=text;liveText.color=textColor;liveText.size=parseInt(document.getElementById('textSizeSlider')?.value||32);
  const dlg=document.getElementById('textDialog');if(dlg)dlg.style.display='none';
  placeLiveTextOnCanvas();
}

function placeLiveTextOnCanvas(){
  const canvas=document.getElementById('editCanvas'),area=document.getElementById('editorImageArea');
  if(!canvas||!area) return;
  const old=document.getElementById('liveTextEl');if(old)old.remove();
  const cr=canvas.getBoundingClientRect(),ar=area.getBoundingClientRect();
  const div=document.createElement('div');
  div.id='liveTextEl';
  liveText.x=cr.left-ar.left+cr.width/2-50;liveText.y=cr.top-ar.top+cr.height/2-20;
  div.style.cssText=`position:absolute;left:${liveText.x}px;top:${liveText.y}px;color:${liveText.color};font-size:${liveText.size}px;font-family:'DM Sans',Arial,sans-serif;font-weight:bold;cursor:grab;user-select:none;white-space:nowrap;z-index:20;text-shadow:0 1px 3px rgba(0,0,0,0.8);touch-action:none;border:1.5px dashed rgba(255,255,255,0.6);padding:4px 8px;border-radius:4px;`;
  div.textContent=liveText.text;
  area.style.position='relative';
  area.appendChild(div);
  liveText.el=div;
  div.addEventListener('touchstart',e=>{e.preventDefault();liveText.dragging=true;liveText.startX=e.touches[0].clientX-liveText.x;liveText.startY=e.touches[0].clientY-liveText.y;div.style.cursor='grabbing';},{passive:false});
  div.addEventListener('mousedown',e=>{liveText.dragging=true;liveText.startX=e.clientX-liveText.x;liveText.startY=e.clientY-liveText.y;div.style.cursor='grabbing';});
  document.addEventListener('touchmove',e=>{if(!liveText.dragging)return;e.preventDefault();liveText.x=e.touches[0].clientX-liveText.startX;liveText.y=e.touches[0].clientY-liveText.startY;div.style.left=liveText.x+'px';div.style.top=liveText.y+'px';},{passive:false});
  document.addEventListener('mousemove',e=>{if(!liveText.dragging)return;liveText.x=e.clientX-liveText.startX;liveText.y=e.clientY-liveText.startY;div.style.left=liveText.x+'px';div.style.top=liveText.y+'px';});
  document.addEventListener('touchend',()=>{liveText.dragging=false;div.style.cursor='grab';},{passive:true});
  document.addEventListener('mouseup',()=>{liveText.dragging=false;div.style.cursor='grab';});
  showLiveTextConfirmBtn();
}

function updateLiveText(){
  const div=document.getElementById('liveTextEl');
  if(!div) return;
  div.textContent=liveText.text||'Texte...';
  div.style.fontSize=liveText.size+'px';
  div.style.color=liveText.color;
  // Mettre à jour aussi la preview dans le dialogue si pas encore placé
  const preview=document.getElementById('textPreview');
  if(preview){
    preview.textContent=liveText.text||'Aperçu';
    preview.style.fontSize=Math.min(liveText.size,24)+'px';
    preview.style.color=liveText.color;
  }
}

function showLiveTextConfirmBtn(){
  const old=document.getElementById('liveTextConfirmBtn');if(old)old.remove();
  const btn=document.createElement('button');
  btn.id='liveTextConfirmBtn';
  btn.textContent='✓ Graver le texte';
  btn.style.cssText="position:fixed;bottom:calc(env(safe-area-inset-bottom,0px)+170px);left:50%;transform:translateX(-50%);background:#30D158;border:none;color:white;padding:10px 24px;border-radius:20px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;z-index:250;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.3);";
  btn.onclick=commitLiveText;
  document.body.appendChild(btn);
}

function commitLiveText(){
  const div=document.getElementById('liveTextEl'),btn=document.getElementById('liveTextConfirmBtn');
  if(btn)btn.remove();if(!div)return;
  const canvas=document.getElementById('editCanvas'),area=document.getElementById('editorImageArea');
  if(!canvas||!area)return;
  const cr=canvas.getBoundingClientRect(),divRect=div.getBoundingClientRect();
  const cx=(divRect.left-cr.left+divRect.width/2)*canvas.width/cr.width;
  const cy=(divRect.top-cr.top+divRect.height*0.75)*canvas.height/cr.height;
  const scaledSize=liveText.size*(canvas.width/cr.width);
  const ctx=canvas.getContext('2d');
  ctx.font=`bold ${scaledSize}px 'DM Sans',Arial,sans-serif`;
  ctx.fillStyle=liveText.color;ctx.strokeStyle='rgba(0,0,0,0.7)';ctx.lineWidth=scaledSize*0.06;
  const tw=ctx.measureText(liveText.text).width;
  ctx.strokeText(liveText.text,cx-tw/2,cy);ctx.fillText(liveText.text,cx-tw/2,cy);
  editState.history.push(ctx.getImageData(0,0,canvas.width,canvas.height));
  div.remove();editState.tool=null;
  document.querySelectorAll('.annot-tool').forEach(b=>b.classList.remove('active'));
  showToast('Texte gravé ✅');
}

function setTextColor(color,el){
  textColor=color;liveText.color=color;
  document.querySelectorAll('.text-color-dot').forEach(e=>e.classList.remove('active'));
  el.classList.add('active');updateLiveText();
}

function cancelTextDialog(){
  const dlg=document.getElementById('textDialog');if(dlg)dlg.style.display='none';
  const div=document.getElementById('liveTextEl');if(div)div.remove();
  const btn=document.getElementById('liveTextConfirmBtn');if(btn)btn.remove();
  editState.tool=null;document.querySelectorAll('.annot-tool').forEach(b=>b.classList.remove('active'));
}

function placeTextAtPosition(){commitLiveText();}
function addTextAnnot(){activateTextTool();}

// ===== ANNULER / CONFIRMER ÉDITEUR =====
function cancelEdit(){
  const overlay=document.getElementById('textPlacementOverlay'),dlg=document.getElementById('textDialog');
  if(overlay)overlay.style.display='none';if(dlg)dlg.style.display='none';
  const div=document.getElementById('liveTextEl');if(div)div.remove();
  const btn=document.getElementById('liveTextConfirmBtn');if(btn)btn.remove();
  const oldCrop=document.getElementById('cropOverlayDiv');if(oldCrop)oldCrop.remove();
  document.removeEventListener('touchmove',cropHandleMove);document.removeEventListener('touchend',cropHandleEnd);
  document.removeEventListener('mousemove',cropHandleMove);document.removeEventListener('mouseup',cropHandleEnd);
  document.getElementById('photoEditor').style.display='none';
  document.getElementById('cameraFullscreen').style.display='flex';
  startCamera();
}

function confirmEdit(){
  const div=document.getElementById('liveTextEl');if(div)commitLiveText();
  const overlay=document.getElementById('textPlacementOverlay'),dlg=document.getElementById('textDialog');
  if(overlay)overlay.style.display='none';if(dlg)dlg.style.display='none';
  const oldCrop=document.getElementById('cropOverlayDiv');if(oldCrop)oldCrop.remove();
  document.removeEventListener('touchmove',cropHandleMove);document.removeEventListener('touchend',cropHandleEnd);
  document.removeEventListener('mousemove',cropHandleMove);document.removeEventListener('mouseup',cropHandleEnd);
  const canvas=document.getElementById('editCanvas');
  const filter=canvas.style.filter;
  let dataUrl;
  if(filter&&filter.trim()!==''){
    const temp=document.createElement('canvas');temp.width=canvas.width;temp.height=canvas.height;
    const tCtx=temp.getContext('2d');tCtx.filter=filter;tCtx.drawImage(canvas,0,0);tCtx.filter='none';
    dataUrl=temp.toDataURL('image/jpeg',0.93);
  } else dataUrl=canvas.toDataURL('image/jpeg',0.93);
  canvas.style.filter='';
  if(editingPhotoIndex>=0&&editingPhotoIndex<sessionPhotos.length){
    sessionPhotos[editingPhotoIndex].dataUrl=dataUrl;sessionPhotos[editingPhotoIndex].saved=false;
  }
  updateFilmstripThumb();updateSavePendingBtn();renderFilmstripGrid();
  document.getElementById('photoEditor').style.display='none';
  document.getElementById('cameraFullscreen').style.display='flex';
  startCamera();showToast('✅ Modifications enregistrées');
}

// ===== ÉDITEUR VIDÉO =====
function openVideoEditor(blob){document.getElementById('videoEditor').style.display='flex';document.getElementById('cameraFullscreen').style.display='none';document.getElementById('previewVideo').src=URL.createObjectURL(blob);}
function cancelVideoEdit(){document.getElementById('videoEditor').style.display='none';document.getElementById('cameraFullscreen').style.display='flex';startCamera();}
async function saveVideoToOneDrive(){
  if(!currentVideoBlob||!state.currentClient){showToast('Aucune vidéo ou client');return;}
  if(!state.accessToken){showToast('⚠️ Connexion requise');return;}
  showToast('⬆️ Sauvegarde vidéo...');
  const ts=new Date(),filename=formatDateForFilename(ts)+'_video.webm';
  try{
    const path=`/me/drive/root:/${CONFIG.oneDriveRoot}/${state.currentClient.Title}/10_Photos/Chantier/${filename}:/content`;
    const r=await fetch(`https://graph.microsoft.com/v1.0${path}`,{method:'PUT',headers:{Authorization:`Bearer ${state.accessToken}`,'Content-Type':'video/webm'},body:currentVideoBlob});
    if(r.ok){showToast('✅ Vidéo sauvegardée !');cancelVideoEdit();}else showToast('⚠️ Erreur');
  }catch(e){showToast('⚠️ Erreur réseau');}
}
