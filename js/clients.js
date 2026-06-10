// ===== CLIENTS =====
function setEl(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function getInitials(n){return(n||'').split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase()||'?';}
function statusLabel(s){return{active:'● En cours',pending:'○ En attente',completed:'✓ Terminé'}[s]||s;}
function escHtml(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function filterClients(q){renderClients(state.clients.filter(c=>c.Title.toLowerCase().includes(q.toLowerCase())));}

async function loadClients() {
  if(!state.accessToken){showConnectBanner(true);renderClients([]);return;}
  showConnectBanner(false);
  showToast('🔄 Chargement des clients...');
  const siteId = await getSiteId();
  if(!siteId){showToast('⚠️ Impossible de joindre SharePoint');renderClients([]);return;}
  const data = await graphGet(`/sites/${siteId}/lists/Clients/items?$expand=fields&$top=200`);
  if(data?.value?.length > 0) {
    state.clients = data.value.map((item,i)=>({
      id:item.id, numId:i,
      Title:item.fields.Title||'Client sans nom',
      project:item.fields.Projet||item.fields.TypeProjet||'Projet en cours',
      status:item.fields.Statut||'active',
      email:item.fields.Courriel||item.fields.Email||'',
      phone:item.fields.Telephone||item.fields.T_x00e9_l_x00e9_phone||'',
      address:item.fields.Adresse||item.fields.Adresse_x0020_chantier||'',
      heures:'0h', facture:'0$', photos:0
    }));
    showToast(`✅ ${state.clients.length} client${state.clients.length>1?'s':''} chargé${state.clients.length>1?'s':''}!`);
  } else {
    showToast('ℹ️ Aucun client'); state.clients=[];
  }
  renderClients(state.clients);
  setEl('dashClients', state.clients.filter(c=>c.status==='active').length||state.clients.length);
  setEl('dashSub', `${state.clients.length} clients · Microsoft 365 ✅`);
  setEl('clientsLabel', `Clients (${state.clients.length})`);
}

function renderClients(clients) {
  const list = document.getElementById('clientList');
  if(!list) return;
  if(clients.length===0){
    list.innerHTML = state.accessToken
      ? '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Aucun client</div></div>'
      : '<div class="empty-state"><div class="empty-icon">🌸</div><div class="empty-title">Non connecté</div><div class="empty-desc">Connectez-vous à Microsoft 365</div></div>';
    return;
  }
  list.innerHTML = clients.map(c=>`
    <div class="client-card" onclick="openClient('${c.id}')">
      <div class="client-avatar">${getInitials(c.Title)}</div>
      <div class="client-info">
        <div class="client-name">${escHtml(c.Title)}</div>
        <div class="client-project">${escHtml(c.project)}</div>
        <span class="client-status status-${c.status}">${statusLabel(c.status)}</span>
      </div>
      <svg class="client-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`).join('');
}

function openClient(id) {
  const c = state.clients.find(x=>x.id===id);
  if(!c) return;
  state.currentClient = c;
  setEl('clientHeaderName',c.Title); setEl('clientHeaderProject',c.project);
  setEl('heroAvatar',getInitials(c.Title)); setEl('heroName',c.Title); setEl('heroProject',c.project);
  setEl('statHeures',c.heures); setEl('statFacture',c.facture); setEl('statPhotos',c.photos||0);
  setEl('photosClientNameCam',c.Title); setEl('timerClientName',c.Title);
  const addrEl = document.getElementById('clientAddress');
  if(addrEl){if(c.address){addrEl.textContent='📍 '+c.address;addrEl.style.display='block';}else addrEl.style.display='none';}
  showScreen('screenClient');
}

// ===== NAVIGATION =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.style.display='';s.style.position='';s.style.inset='';s.style.zIndex='';});
  const el = document.getElementById(id);
  if(el){el.classList.add('active');if(id==='screenPhotos')el.style.display='flex';}
  if(id!=='screenPhotos'){const nav=document.getElementById('bottomNav');if(nav)nav.classList.remove('nav-hidden');}
  window.scrollTo(0,0);
}
function navTo(screen,navId) {
  showScreen(screen);
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const ni=document.getElementById(navId); if(ni)ni.classList.add('active');
}

