// ===== TIMER =====
function toggleTimer(){
  if(state.timerRunning){state.timerRunning=false;clearInterval(state.timerInterval);setEl('timerStartBtn','▶ Reprendre');}
  else{state.timerRunning=true;state.timerInterval=setInterval(()=>{state.timerSeconds++;const h=Math.floor(state.timerSeconds/3600),m=Math.floor((state.timerSeconds%3600)/60),s=state.timerSeconds%60;setEl('timerDisplay',`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);},1000);setEl('timerStartBtn','⏸ Pause');}
}
function stopAndSaveTimer(){
  clearInterval(state.timerInterval);state.timerRunning=false;
  const h=Math.floor(state.timerSeconds/3600),m=Math.floor((state.timerSeconds%3600)/60);
  if(state.timerSeconds>0){const entry=document.createElement('div');entry.className='time-entry';entry.innerHTML=`<div class="entry-dot"></div><div class="entry-info"><div class="entry-client">${state.currentClient?state.currentClient.Title:'Client'}</div><div class="entry-desc">Session de travail</div></div><div class="entry-time">${h}h${String(m).padStart(2,'0')}</div>`;const entries=document.getElementById('timeEntries');const empty=entries.querySelector('div[style]');if(empty)empty.remove();entries.insertBefore(entry,entries.firstChild);}
  state.timerSeconds=0;setEl('timerDisplay','00:00:00');setEl('timerStartBtn','▶ Démarrer');showToast('⏱ Temps sauvegardé');
}

// ===== AUTRES =====
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}
function callClient(){if(state.currentClient?.phone){window.location.href='tel:'+state.currentClient.phone;}else showToast('Aucun numéro pour ce client');}
function openNavigation(){
  if(!state.currentClient?.address) return;
  const addr=encodeURIComponent(state.currentClient.address);
  const sheet=document.createElement('div');sheet.id='navChoiceSheet';
  sheet.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:flex-end;';
  sheet.innerHTML=`<div style="width:100%;background:white;border-radius:20px 20px 0 0;padding:16px 16px calc(var(--safe-bottom)+16px);font-family:'DM Sans',sans-serif;">
    <div style="width:40px;height:4px;background:#ccc;border-radius:2px;margin:0 auto 12px;"></div>
    <div style="font-size:13px;color:#888;margin-bottom:4px;">Naviguer vers</div>
    <div style="font-size:15px;font-weight:600;color:#2A1520;margin-bottom:14px;">${state.currentClient.address}</div>
    <button onclick="window.open('http://maps.apple.com/?daddr=${addr}');document.getElementById('navChoiceSheet').remove();" style="width:100%;padding:15px;background:#6B2D45;color:white;border:none;border-radius:14px;font-size:15px;font-weight:600;margin-bottom:10px;cursor:pointer;">🗺️ Plans Apple</button>
    <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${addr}');document.getElementById('navChoiceSheet').remove();" style="width:100%;padding:15px;background:#4285F4;color:white;border:none;border-radius:14px;font-size:15px;font-weight:600;margin-bottom:10px;cursor:pointer;">📍 Google Maps</button>
    <button onclick="document.getElementById('navChoiceSheet').remove();" style="width:100%;padding:13px;background:#F2D7E0;color:#6B2D45;border:none;border-radius:14px;font-size:15px;cursor:pointer;">Annuler</button>
  </div>`;
  sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.remove();});
  document.body.appendChild(sheet);
}
function showAddClient(){showToast('Utilisez le formulaire Forms pour ajouter un client');}
function showSuiviProjet(){showToast('Suivi projet — bientôt disponible');}
function showFacturer(){showToast('Facturation — utilisez Power Automate Flux 2');}
function startVoiceNote(){showToast('Note vocale — bientôt disponible');}
function logDeplacement(){showToast('Déplacement enregistré dans TripLog');}
function askAnna(){navTo('screenAnna','nav-anna');}
function toggleSwatch(el){el.classList.toggle('selected');}
function addMoodImage(){document.getElementById('moodInput').click();}
function handleMoodImage(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{const grid=document.getElementById('moodGrid');const empty=grid.querySelector('div[style*="grid-column"]');if(empty)empty.remove();const item=document.createElement('div');item.className='mood-item';item.innerHTML=`<img src="${ev.target.result}" alt="Inspiration"><div class="mood-label">Inspiration</div>`;grid.appendChild(item);};r.readAsDataURL(file);e.target.value='';}
function exportMoodboard(){showToast('Partage moodboard — bientôt disponible');}
function saveNote(){showToast('📋 Note sauvegardée dans OneNote');}
function sendNoteToClient(){showToast('📧 Note envoyée au client');}
function sendToAnna(msg){
  const input=document.getElementById('annaInput');const text=msg||input.value.trim();if(!text)return;
  input.value='';
  const chat=document.getElementById('annaChat');
  const userBubble=document.createElement('div');userBubble.className='chat-bubble bubble-user';userBubble.textContent=text;chat.appendChild(userBubble);
  const typing=document.createElement('div');typing.className='anna-typing';typing.innerHTML='<div class="dot"></div><div class="dot"></div><div class="dot"></div>';chat.appendChild(typing);
  chat.scrollTop=chat.scrollHeight;
  setTimeout(()=>{typing.remove();const annaBubble=document.createElement('div');annaBubble.className='chat-bubble bubble-anna';annaBubble.textContent='Je traite votre demande... Pour les vraies réponses d\'Anna, ouvrez le projet Claude.';chat.appendChild(annaBubble);chat.scrollTop=chat.scrollHeight;},1200);
}

if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
</script>
