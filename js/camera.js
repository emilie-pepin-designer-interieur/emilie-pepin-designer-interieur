// ===== CAMÉRA =====
function goToPhotos() {
  if(state.currentClient) setEl('photosClientNameCam',state.currentClient.Title);
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.style.display='';});
  const screen = document.getElementById('screenPhotos');
  if(screen){screen.classList.add('active');screen.style.display='flex';}
  const nav = document.getElementById('bottomNav'); if(nav) nav.classList.add('nav-hidden');
  document.getElementById('cameraFullscreen').style.display='flex';
  document.getElementById('photoEditor').style.display='none';
  document.getElementById('videoEditor').style.display='none';
  document.getElementById('filmstripPanel').style.display='none';
  document.getElementById('photoActionMenu').style.display='none';
  updateFilmstripThumb(); updateSavePendingBtn();
  window.scrollTo(0,0);
  setTimeout(()=>{startCamera();bindShutterButton();},150);
}

function bindShutterButton(){
  const btn = document.getElementById('shutterBtn');
  if(!btn) return;
  // Supprimer anciens listeners
  if(btn._shutterBound) return;
  btn._shutterBound = true;
  // iOS PWA: utiliser touchend pour garantir le déclenchement
  btn.addEventListener('touchstart', (e)=>{
    e.preventDefault();
    btn.style.transform='scale(0.88)';
  }, {passive:false});
  btn.addEventListener('touchend', (e)=>{
    e.preventDefault();
    btn.style.transform='scale(1)';
    captureMedia();
  }, {passive:false});
}

function exitCameraMode() {
  stopCamera();
  const nav=document.getElementById('bottomNav'); if(nav) nav.classList.remove('nav-hidden');
  const screen=document.getElementById('screenPhotos');
  if(screen){screen.style.display='none';screen.classList.remove('active');}
  showScreen('screenClient');
}

async function startCamera() {
  try {
    if(state.cameraStream) stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:cameraFacing},width:{ideal:1920},height:{ideal:1080}},
      audio:currentMode==='video'
    });
    state.cameraStream=stream; state.cameraActive=true;
    const video=document.getElementById('cameraVideo');
    video.srcObject=stream;
    await new Promise(r=>video.onloadedmetadata=r);
    video.play();
    applyZoomCSS(zoomCSS);
    setupPinchZoom();
    await detectZoomLevels(stream);
  } catch(e) { showToast('⚠️ Accès caméra refusé'); }
}

function stopCamera() {
  if(state.cameraStream){state.cameraStream.getTracks().forEach(t=>t.stop());state.cameraStream=null;}
  state.cameraActive=false;
}

// ===== ZOOM =====
async function detectZoomLevels(stream) {
  const ua=navigator.userAgent;
  const isIPad=/iPad/.test(ua)||(navigator.maxTouchPoints>1&&/MacIntel/.test(ua));
  const isIPhone=/iPhone/.test(ua);
  let levels=[];
  try {
    const track=stream.getVideoTracks()[0];
    const caps=track.getCapabilities?track.getCapabilities():{};
    if(caps.zoom&&caps.zoom.max>1){
      levels=[{label:'.5x',scale:0.8},{label:'1x',scale:1.0},{label:'2x',scale:2.0},{label:'3x',scale:3.0}];
    }
  } catch(e){}
  if(levels.length===0){
    if(isIPhone||isIPad) levels=[{label:'.5x',scale:0.8},{label:'1x',scale:1.0},{label:'2x',scale:2.0}];
    else levels=[{label:'1x',scale:1.0},{label:'2x',scale:2.0},{label:'3x',scale:3.0}];
  }
  zoomLevels=levels;
  const startIdx=levels.findIndex(l=>l.label==='1x');
  const si=startIdx>=0?startIdx:0;
  zoomCSS=levels[si].scale;
  applyZoomCSS(zoomCSS);
  renderZoomPills();
  setTimeout(()=>{document.querySelectorAll('.zoom-pill').forEach((b,i)=>b.classList.toggle('zoom-pill-active',i===si));},100);
}

function renderZoomPills() {
  const row=document.getElementById('zoomPillsRow');
  if(!row) return;
  row.innerHTML=zoomLevels.map((l,i)=>`<button onclick="setZoomByIndex(${i})" id="zpill_${i}" class="zoom-pill ${i===0?'zoom-pill-active':''}">${l.label}</button>`).join('');
}

function setZoomByIndex(i) {
  if(i<0||i>=zoomLevels.length) return;
  zoomCSS=zoomLevels[i].scale; applyZoomCSS(zoomCSS);
  showZoomIndicator(zoomLevels[i].label);
  document.querySelectorAll('.zoom-pill').forEach((b,j)=>b.classList.toggle('zoom-pill-active',j===i));
}

function setupPinchZoom() {
  const wrapper=document.getElementById('videoWrapper');
  if(!wrapper) return;
  ['_pS','_pM','_pE'].forEach(k=>{if(wrapper[k]){wrapper.removeEventListener('touchstart',wrapper[k]);wrapper.removeEventListener('touchmove',wrapper[k]);wrapper.removeEventListener('touchend',wrapper[k]);}});
  wrapper._pS=(e)=>{if(e.touches.length===2){pinchStartDist=getPinchDist(e);pinchStartZoom=zoomCSS;}};
  wrapper._pM=(e)=>{
    if(e.touches.length!==2) return; e.preventDefault();
    let s=typeof e.scale!=='undefined'?pinchStartZoom*e.scale:pinchStartZoom*(getPinchDist(e)/pinchStartDist);
    const minZ=zoomLevels.length>0?zoomLevels[0].scale:0.8;
    const maxZ=zoomLevels.length>0?zoomLevels[zoomLevels.length-1].scale*1.5:6;
    zoomCSS=Math.min(Math.max(minZ,s),maxZ);
    applyZoomCSS(zoomCSS); showZoomIndicator(zoomCSS.toFixed(1)+'x');
  };
  wrapper._pE=()=>{pinchStartDist=0;};
  wrapper.addEventListener('touchstart',wrapper._pS,{passive:true});
  wrapper.addEventListener('touchmove',wrapper._pM,{passive:false});
  wrapper.addEventListener('touchend',wrapper._pE,{passive:true});
}

function getPinchDist(e){return Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);}
function applyZoomCSS(scale){const v=document.getElementById('cameraVideo');if(v){v.style.transform=`translate3d(0,0,0) scale(${scale})`;v.style.webkitTransform=`translate3d(0,0,0) scale(${scale})`;}zoomCSS=scale;}
function showZoomIndicator(label){const el=document.getElementById('zoomIndicator');if(!el)return;el.style.display='block';el.textContent=label;clearTimeout(zoomIndicatorTimer);zoomIndicatorTimer=setTimeout(()=>el.style.display='none',1400);}

// ===== GRILLE =====
function toggleGrid(){
  gridVisible=!gridVisible;
  const g=document.getElementById('cameraGrid'),btn=document.getElementById('gridBtn');
  if(g) g.style.display=gridVisible?'block':'none';
  if(btn) btn.style.background=gridVisible?'rgba(255,214,10,0.5)':'rgba(0,0,0,0.45)';
}

// ===== MODE =====
function setMode(mode){
  currentMode=mode;
  const mP=document.getElementById('modePhoto'),mV=document.getElementById('modeVideo');
  if(mP){mP.style.color=mode==='photo'?'white':'rgba(255,255,255,0.45)';mP.style.fontWeight=mode==='photo'?'700':'500';}
  if(mV){mV.style.color=mode==='video'?'white':'rgba(255,255,255,0.45)';mV.style.fontWeight=mode==='video'?'700':'500';}
  const inner=document.getElementById('shutterInner');
  if(inner){if(mode==='video'){inner.style.borderRadius='8px';inner.style.background='#FF453A';inner.style.width='34px';inner.style.height='34px';inner.style.margin='auto';}
  else{inner.style.borderRadius='50%';inner.style.background='white';inner.style.width='70px';inner.style.height='70px';inner.style.margin='0';}}
}

// ===== CAPTURE =====
function captureMedia(){
  const btn=document.getElementById('shutterBtn');
  if(btn){btn.style.transform='scale(0.88)';setTimeout(()=>btn.style.transform='scale(1)',120);}
  if(currentMode==='photo') takePhoto();
  else if(mediaRecorder&&mediaRecorder.state==='recording') stopRecording();
  else startRecording();
}

function takePhoto(){
  const video=document.getElementById('cameraVideo'),canvas=document.getElementById('photoCanvas');
  if(!video||!canvas) return;
  const w=video.videoWidth||1280,h=video.videoHeight||720;
  canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d');
  if(zoomCSS>1){const sw=w/zoomCSS,sh=h/zoomCSS;ctx.drawImage(video,(w-sw)/2,(h-sh)/2,sw,sh,0,0,w,h);}
  else if(zoomCSS<1){const sw=w/zoomCSS,sh=h/zoomCSS;ctx.drawImage(video,(w-sw)/2,(h-sh)/2,sw,sh,0,0,w,h);}
  else ctx.drawImage(video,0,0);
  const dataUrl=canvas.toDataURL('image/jpeg',0.93);
  const ts=new Date(),filename=formatDateForFilename(ts)+'_'+String(sessionPhotos.length+1).padStart(3,'0')+'.jpg';
  const photo={dataUrl,saved:false,filename,oneDriveId:null};
  sessionPhotos.push(photo);
  updateFilmstripThumb(); updateSavePendingBtn();
  autoSavePhoto(photo,sessionPhotos.length-1);
  showToast('📸 Photo prise');
}

function formatDateForFilename(d){
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
}

// ===== SAUVEGARDE AUTO =====
async function autoSavePhoto(photo,index){
  if(!navigator.onLine){offlineQueue.push(index);showToast('📴 Hors ligne — photo en attente');return;}
  if(!state.accessToken||!state.currentClient){offlineQueue.push(index);return;}
  const ok=await uploadPhotoToOneDrive(photo.dataUrl,photo.filename);
  if(ok){sessionPhotos[index].saved=true;updateFilmstripThumb();updateSavePendingBtn();}
  else offlineQueue.push(index);
}

window.addEventListener('online',async()=>{
  if(offlineQueue.length===0) return;
  showToast(`📶 Sync de ${offlineQueue.length} photo${offlineQueue.length>1?'s':''}...`);
  const queue=[...offlineQueue]; offlineQueue=[];
  for(const idx of queue){
    if(sessionPhotos[idx]&&!sessionPhotos[idx].saved){
      const ok=await uploadPhotoToOneDrive(sessionPhotos[idx].dataUrl,sessionPhotos[idx].filename);
      if(ok) sessionPhotos[idx].saved=true; else offlineQueue.push(idx);
    }
  }
  updateFilmstripThumb(); updateSavePendingBtn();
  showToast(`✅ ${queue.length-offlineQueue.length} photo${queue.length>1?'s':''} synchronisée${queue.length>1?'s':''}`);
});
window.addEventListener('offline',()=>showToast('📴 Hors ligne — photos en attente'));

// ===== PELLICULE =====
function updateFilmstripThumb(){
  const thumb=document.getElementById('filmstripThumb'),countEl=document.getElementById('filmstripCount');
  if(!thumb) return;
  const pending=sessionPhotos.filter(p=>!p.saved&&p.dataUrl).length;
  // Trouver la meilleure image à afficher (dernière avec src valide)
  const withSrc = sessionPhotos.filter(p=>p.dataUrl||p.odThumbnail||p.odUrl);
  if(withSrc.length>0){
    const last=withSrc[withSrc.length-1];
    const src=last.dataUrl||last.odThumbnail||last.odUrl||'';
    thumb.innerHTML=`<img src="${src}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
      ${pending>0?`<div style="position:absolute;bottom:2px;right:2px;background:#FF9F0A;color:white;font-size:9px;font-weight:700;font-family:'DM Sans',sans-serif;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;">${pending}</div>`:''}`;
  } else {
    thumb.innerHTML=`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  }
  if(countEl){countEl.style.display=pending>0?'flex':'none';countEl.textContent=pending;}
}

function handleFilmstripTap(){
  if(sessionPhotos.length===0){openFilmstrip();return;}
  openPhotoViewer(sessionPhotos.length-1);
}

function toggleFilmstrip(){
  const panel=document.getElementById('filmstripPanel');
  if(!panel||panel.style.display==='none'||!panel.style.display) openFilmstrip(); else closeFilmstrip();
}

async function openFilmstrip(){
  const panel=document.getElementById('filmstripPanel');
  if(!panel) return;
  setEl('filmstripTitle',state.currentClient?state.currentClient.Title:'Session');
  panel.style.display='block';
  renderFilmstripGrid();
  if(state.accessToken&&state.currentClient) await loadOneDrivePhotos();
}

function closeFilmstrip(){const p=document.getElementById('filmstripPanel');if(p)p.style.display='none';}
function closeFilmstripOutside(e){if(e.target===document.getElementById('filmstripPanel'))closeFilmstrip();}

async function loadOneDrivePhotos(){
  const loading=document.getElementById('filmstripLoading'),empty=document.getElementById('filmstripEmpty');
  if(loading) loading.style.display='block';
  try {
    const clientName=state.currentClient.Title;
    const data=await graphGet(`/me/drive/root:/${CONFIG.oneDriveRoot}/${clientName}/10_Photos/Chantier:/children?$orderby=lastModifiedDateTime desc&$top=50`);
    if(data?.value?.length>0){
      const sessionFilenames=new Set(sessionPhotos.map(p=>p.filename));
      for(const f of data.value){
        if(!f.name.match(/\.(jpg|jpeg|png|heic)/i)) continue;
        if(sessionFilenames.has(f.name)) continue;
        sessionPhotos.push({dataUrl:null,odUrl:f['@microsoft.graph.downloadUrl']||null,odThumbnail:f.thumbnails?.[0]?.medium?.url||null,filename:f.name,saved:true,oneDriveId:f.id});
      }
      renderFilmstripGrid();
    }
  } catch(e){console.error('OneDrive:',e);}
  finally{if(loading)loading.style.display='none';}
}

function renderFilmstripGrid(){
  const grid=document.getElementById('filmstripGrid'),empty=document.getElementById('filmstripEmpty');
  if(!grid) return;
  if(sessionPhotos.length===0){grid.innerHTML='';if(empty)empty.style.display='block';return;}
  if(empty) empty.style.display='none';
  grid.innerHTML=sessionPhotos.map((p,i)=>{
    // Utiliser dataUrl en priorité, puis thumbnail OneDrive (URL directe)
    const src=p.dataUrl||(p.odThumbnail||'');
    const hasSrc=src&&src.length>0;
    return `<div onclick="openPhotoActionMenu(${i})" style="position:relative;aspect-ratio:1;overflow:hidden;background:#2a2a2a;cursor:pointer;border-radius:2px;">
      ${hasSrc
        ? `<img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" onerror="this.parentElement.querySelector('.od-label').style.display='flex';this.style.display='none';">`
        : ''}
      <div class="od-label" style="display:${hasSrc?'none':'flex'};width:100%;height:100%;align-items:center;justify-content:center;flex-direction:column;gap:4px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
        <span style="color:rgba(255,255,255,0.3);font-size:9px;font-family:'DM Sans',sans-serif;">OneDrive</span>
      </div>
      <div style="position:absolute;top:3px;right:3px;background:${p.saved?'#30D158':'#FF9F0A'};color:white;font-size:9px;font-weight:700;padding:2px 4px;border-radius:4px;font-family:'DM Sans',sans-serif;">${p.saved?'✓':'↑'}</div>
    </div>`;
  }).join('');
}

// ===== LECTEUR PHOTO APPLE-STYLE =====
function openPhotoViewer(index){
  viewerCurrentIndex=index;
  let viewer=document.getElementById('photoViewer');
  if(!viewer){
    viewer=document.createElement('div');
    viewer.id='photoViewer';
    viewer.style.cssText='position:fixed;inset:0;z-index:300;background:#000;display:flex;flex-direction:column;';
    viewer.innerHTML=`
      <div style="padding:calc(env(safe-area-inset-top,44px)+8px) 16px 10px;display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.8);flex-shrink:0;">
        <button onclick="closePhotoViewer()" style="background:none;border:none;color:white;font-size:15px;font-family:'DM Sans',sans-serif;cursor:pointer;padding:8px;">Fermer</button>
        <span id="viewerCounter" style="color:white;font-size:13px;font-family:'DM Sans',sans-serif;"></span>
        <button onclick="annotateFromViewer()" style="background:none;border:none;color:#0A84FF;font-size:15px;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;padding:8px;">Modifier</button>
      </div>
      <div id="viewerMain" style="flex:1;position:relative;overflow:hidden;display:flex;align-items:center;min-height:0;">
        <div id="viewerTrack" style="display:flex;height:100%;will-change:transform;"></div>
      </div>
      <div id="viewerStrip" style="height:76px;display:flex;gap:3px;padding:6px 8px;overflow-x:auto;background:rgba(0,0,0,0.85);-webkit-overflow-scrolling:touch;scrollbar-width:none;align-items:center;flex-shrink:0;padding-bottom:calc(env(safe-area-inset-bottom,0px)+6px);"></div>`;
    document.body.appendChild(viewer);
    const main=viewer.querySelector('#viewerMain');
    main.addEventListener('touchstart',e=>{viewerStartX=e.touches[0].clientX;},{passive:true});
    main.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-viewerStartX;
      if(Math.abs(dx)>50){if(dx<0)viewerNav(1);else viewerNav(-1);}
    },{passive:true});
  }
  viewer.style.display='flex';
  renderViewerPhotos();
  scrollViewerTo(index,false);
  renderViewerStrip();
}

function renderViewerPhotos(){
  const track=document.getElementById('viewerTrack');
  if(!track) return;
  track.style.transition='none';
  track.innerHTML=sessionPhotos.map((p,i)=>{
    const src=p.dataUrl||p.odUrl||'';
    return `<div style="min-width:100vw;height:100%;display:flex;align-items:center;justify-content:center;background:#000;">
      ${src?`<img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;" loading="lazy">`:`<div style="color:rgba(255,255,255,0.3);font-size:13px;font-family:'DM Sans',sans-serif;">Chargement...</div>`}
    </div>`;
  }).join('');
}

function scrollViewerTo(index,animated){
  const track=document.getElementById('viewerTrack'),counter=document.getElementById('viewerCounter');
  if(track){track.style.transition=animated?'transform 0.3s ease':'none';track.style.transform=`translateX(${-index*100}vw)`;}
  if(counter) counter.textContent=`${index+1} / ${sessionPhotos.length}`;
  viewerCurrentIndex=index;
  document.querySelectorAll('.viewer-strip-item').forEach((el,i)=>el.style.border=i===index?'2px solid white':'2px solid transparent');
}

function renderViewerStrip(){
  const strip=document.getElementById('viewerStrip');
  if(!strip) return;
  strip.innerHTML=sessionPhotos.map((p,i)=>{
    const src=p.dataUrl||p.odThumbnail||'';
    return `<div class="viewer-strip-item" onclick="scrollViewerTo(${i},true)"
      style="min-width:60px;height:60px;border-radius:8px;overflow:hidden;cursor:pointer;flex-shrink:0;border:${i===viewerCurrentIndex?'2px solid white':'2px solid transparent'};">
      ${src?`<img src="${src}" style="width:100%;height:100%;object-fit:cover;">`:`<div style="width:100%;height:100%;background:#333;"></div>`}
    </div>`;
  }).join('');
}

function viewerNav(dir){
  const ni=viewerCurrentIndex+dir;
  if(ni>=0&&ni<sessionPhotos.length) scrollViewerTo(ni,true);
}
function closePhotoViewer(){const v=document.getElementById('photoViewer');if(v)v.style.display='none';}
function annotateFromViewer(){closePhotoViewer();editingPhotoIndex=viewerCurrentIndex;const p=sessionPhotos[viewerCurrentIndex];if(p?.dataUrl)openPhotoEditor(p.dataUrl);}

// ===== MENU ACTION PHOTO =====
function openPhotoActionMenu(index){
  selectedPhotoIndex=index;
  const photo=sessionPhotos[index]; if(!photo) return;
  const menu=document.getElementById('photoActionMenu'),preview=document.getElementById('photoMenuPreview');
  if(preview){preview.src=photo.dataUrl||photo.odThumbnail||photo.odUrl||'';preview.style.display=preview.src&&preview.src!==window.location.href?'block':'none';}
  if(menu) menu.style.display='block';
}
function closePhotoActionMenu(e){const menu=document.getElementById('photoActionMenu');if(!menu)return;if(!e||e.target===menu||e.target.closest('button'))menu.style.display='none';}
function annotateSelectedPhoto(){
  document.getElementById('photoActionMenu').style.display='none';
  closeFilmstrip();
  if(selectedPhotoIndex<0) return;
  const photo=sessionPhotos[selectedPhotoIndex];
  editingPhotoIndex=selectedPhotoIndex;
  if(photo.dataUrl){openPhotoEditor(photo.dataUrl);}
  else if(photo.odUrl){
    showToast('⏳ Chargement...');
    fetch(photo.odUrl).then(r=>r.blob()).then(blob=>{const reader=new FileReader();reader.onload=ev=>{sessionPhotos[selectedPhotoIndex].dataUrl=ev.target.result;openPhotoEditor(ev.target.result);};reader.readAsDataURL(blob);}).catch(()=>showToast('⚠️ Impossible de charger'));
  }
}
async function deleteSelectedPhoto(){
  document.getElementById('photoActionMenu').style.display='none';
  if(selectedPhotoIndex<0) return;
  const photo=sessionPhotos[selectedPhotoIndex];
  if(!confirm('Supprimer cette photo de OneDrive ?')) return;
  if(photo.oneDriveId&&state.accessToken){
    const r=await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${photo.oneDriveId}`,{method:'DELETE',headers:{Authorization:`Bearer ${state.accessToken}`}});
    if(r.ok||r.status===204){sessionPhotos.splice(selectedPhotoIndex,1);renderFilmstripGrid();updateFilmstripThumb();showToast('🗑️ Supprimée');}
    else showToast('⚠️ Erreur suppression');
  } else {
    sessionPhotos.splice(selectedPhotoIndex,1);renderFilmstripGrid();updateFilmstripThumb();showToast('🗑️ Supprimée');
  }
}

// ===== SAUVEGARDE ONEDRIVE =====
function updateSavePendingBtn(){
  const btn=document.getElementById('savePendingBtn'),countEl=document.getElementById('savePendingCount');
  if(!btn) return;
  const pending=sessionPhotos.filter(p=>!p.saved).length;
  btn.style.display=pending>0?'flex':'none';
  if(countEl) countEl.textContent=pending;
}

async function saveAllPendingPhotos(){
  const pending=sessionPhotos.filter((p)=>!p.saved&&p.dataUrl);
  if(pending.length===0){showToast('Toutes les photos sont sauvegardées ✅');return;}
  if(!state.currentClient){showToast('⚠️ Sélectionnez un client');return;}
  closeFilmstrip();
  showToast(`⬆️ ${pending.length} photo${pending.length>1?'s':''}...`);
  let saved=0;
  for(const photo of pending){const ok=await uploadPhotoToOneDrive(photo.dataUrl,photo.filename);if(ok){photo.saved=true;saved++;}}
  updateFilmstripThumb();updateSavePendingBtn();renderFilmstripGrid();
  showToast(saved===pending.length?`✅ ${saved} photo${saved>1?'s':''} sauvegardée${saved>1?'s':''}`:`⚠️ ${saved}/${pending.length} sauvegardées`);
}

async function saveCurrentPhotoToOneDrive(){
  if(editingPhotoIndex<0||editingPhotoIndex>=sessionPhotos.length){showToast('Aucune photo');return;}
  const canvas=document.getElementById('editCanvas');
  const filter=canvas.style.filter;
  let dataUrl;
  if(filter&&filter.trim()!==''){
    const temp=document.createElement('canvas');temp.width=canvas.width;temp.height=canvas.height;
    const tCtx=temp.getContext('2d');tCtx.filter=filter;tCtx.drawImage(canvas,0,0);tCtx.filter='none';
    dataUrl=temp.toDataURL('image/jpeg',0.93);
  } else dataUrl=canvas.toDataURL('image/jpeg',0.93);
  canvas.style.filter='';
  sessionPhotos[editingPhotoIndex].dataUrl=dataUrl;
  showToast('⬆️ Sauvegarde...');
  const ok=await uploadPhotoToOneDrive(dataUrl,sessionPhotos[editingPhotoIndex].filename);
  if(ok){sessionPhotos[editingPhotoIndex].saved=true;showToast('✅ Sauvegardée dans OneDrive !');updateFilmstripThumb();updateSavePendingBtn();renderFilmstripGrid();}
  else showToast('⚠️ Connexion Microsoft 365 requise');
}

async function uploadPhotoToOneDrive(dataUrl,filename){
  if(!state.accessToken||!state.currentClient) return false;
  try {
    const res=await fetch(dataUrl);const blob=await res.blob();
    const path=`/me/drive/root:/${CONFIG.oneDriveRoot}/${state.currentClient.Title}/10_Photos/Chantier/${filename}:/content`;
    const r=await fetch(`https://graph.microsoft.com/v1.0${path}`,{method:'PUT',headers:{Authorization:`Bearer ${state.accessToken}`,'Content-Type':'image/jpeg'},body:blob});
    return r.ok;
  } catch(e){return false;}
}

function updatePhotosGallery(){renderFilmstripGrid();}

// ===== FLIP + FLASH + GALERIE =====
function flipCamera(){cameraFacing=cameraFacing==='environment'?'user':'environment';stopCamera();startCamera();}
// flashMode: 'auto' | 'on' | 'off'
let flashMode = 'auto';
function toggleFlash(){
  const modes = ['auto','on','off'];
  flashMode = modes[(modes.indexOf(flashMode)+1) % modes.length];
  const btn = document.getElementById('flashBtn');
  if(btn){
    const icons = {auto:'⚡A', on:'⚡', off:'⚡̶'};
    const bgs = {auto:'rgba(0,0,0,0.45)', on:'rgba(255,210,0,0.7)', off:'rgba(80,80,80,0.7)'};
    btn.textContent = icons[flashMode];
    btn.style.background = bgs[flashMode];
  }
  // Appliquer torch si supporté (Android)
  if(state.cameraStream){
    const t=state.cameraStream.getVideoTracks()[0];
    if(t){try{t.applyConstraints({advanced:[{torch:flashMode==='on'}]});}catch(e){}}
  }
  showToast(flashMode==='auto'?'Flash : Auto':flashMode==='on'?'Flash : Activé':'Flash : Désactivé');
}
function openGallery(){document.getElementById('galleryInput').click();}
function handleGalleryFiles(e){
  const files=Array.from(e.target.files||[]);if(!files.length)return;
  files.forEach(file=>{
    if(file.type.startsWith('video/')){currentVideoBlob=file;openVideoEditor(file);return;}
    if(!file.type.startsWith('image/')) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const ts=new Date(),filename=formatDateForFilename(ts)+'_gal_'+String(sessionPhotos.length+1).padStart(3,'0')+'.jpg';
      const photo={dataUrl:ev.target.result,saved:false,filename,oneDriveId:null};
      sessionPhotos.push(photo);updateFilmstripThumb();updateSavePendingBtn();
      autoSavePhoto(photo,sessionPhotos.length-1);
    };
    reader.readAsDataURL(file);
  });
  setTimeout(()=>showToast(`📷 ${files.filter(f=>f.type.startsWith('image/')).length} photo${files.length>1?'s':''} importée${files.length>1?'s':''}`),300);
  e.target.value='';
}

// ===== VIDÉO =====
function startRecording(){
  if(!state.cameraStream) return;
  recordedChunks=[];
  const opts=['video/webm;codecs=vp9','video/webm','video/mp4'].find(t=>{try{return MediaRecorder.isTypeSupported(t);}catch(e){return false;}})||'';
  try{mediaRecorder=opts?new MediaRecorder(state.cameraStream,{mimeType:opts}):new MediaRecorder(state.cameraStream);}catch(e){mediaRecorder=new MediaRecorder(state.cameraStream);}
  mediaRecorder.ondataavailable=e=>{if(e.data.size>0)recordedChunks.push(e.data);};
  mediaRecorder.onstop=()=>{currentVideoBlob=new Blob(recordedChunks,{type:'video/webm'});openVideoEditor(currentVideoBlob);};
  mediaRecorder.start();
  const ri=document.getElementById('recordingIndicator');if(ri)ri.style.display='flex';
  recordSeconds=0;
  recordTimerInterval=setInterval(()=>{recordSeconds++;const m=Math.floor(recordSeconds/60).toString().padStart(2,'0'),s=(recordSeconds%60).toString().padStart(2,'0');setEl('recordTimer',m+':'+s);},1000);
  const inner=document.getElementById('shutterInner');if(inner)inner.style.borderRadius='8px';
}
function stopRecording(){
  if(mediaRecorder&&mediaRecorder.state==='recording')mediaRecorder.stop();
  clearInterval(recordTimerInterval);
  const ri=document.getElementById('recordingIndicator');if(ri)ri.style.display='none';
  setMode('video');
}
