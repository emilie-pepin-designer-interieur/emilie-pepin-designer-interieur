// ===== INIT =====
window.addEventListener('load', async () => {
  const now = new Date();
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const dd = document.getElementById('dashDate');
  if(dd) dd.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const nd = document.getElementById('noteDate');
  if(nd) nd.value = now.toISOString().split('T')[0];
  setTimeout(() => {
    const ls = document.getElementById('loadingScreen');
    if(ls) { ls.style.opacity='0'; setTimeout(()=>ls.style.display='none',500); }
  }, 1600);
  await initAuth();
});

// ===== AUTH =====
let msalInstance = null;
function initMsal() {
  try {
    msalInstance = new msal.PublicClientApplication({
      auth: { clientId:CONFIG.clientId, authority:`https://login.microsoftonline.com/${CONFIG.tenantId}`, redirectUri:CONFIG.redirectUri },
      cache: { cacheLocation:'localStorage', storeAuthStateInCookie:true }
    });
    return true;
  } catch(e) { return false; }
}
async function initAuth() {
  const ok = initMsal();
  if(ok) {
    try {
      await msalInstance.initialize();
      const resp = await msalInstance.handleRedirectPromise();
      if(resp?.accessToken) { state.accessToken = resp.accessToken; showToast('✅ Connecté !'); }
      else {
        const accounts = msalInstance.getAllAccounts();
        if(accounts.length > 0) {
          try { const s = await msalInstance.acquireTokenSilent({scopes:CONFIG.scopes.split(' '),account:accounts[0]}); state.accessToken = s.accessToken; } catch(e) {}
        }
      }
    } catch(e) { console.error('Auth:', e); }
  }
  updateLoginButton();
  await loadClients();
}
async function loginToMicrosoft() {
  if(msalInstance) { try { await msalInstance.loginRedirect({scopes:CONFIG.scopes.split(' '),loginHint:'info@emiliepepin.ca'}); } catch(e) { manualLogin(); } }
  else manualLogin();
}
function manualLogin() {
  window.location.href = `https://login.microsoftonline.com/${CONFIG.tenantId}/oauth2/v2.0/authorize?client_id=${CONFIG.clientId}&response_type=token&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}&scope=${encodeURIComponent(CONFIG.scopes)}&login_hint=info%40emiliepepin.ca&response_mode=fragment`;
}
function logoutMicrosoft() {
  try { if(msalInstance) msalInstance.logoutRedirect({postLogoutRedirectUri:CONFIG.redirectUri}); } catch(e) {}
  state.accessToken=null; state.clients=[]; state.siteId=null;
  updateLoginButton(); showConnectBanner(true); renderClients([]);
}
function updateLoginButton() {
  const btn = document.getElementById('loginBtn');
  if(!btn) return;
  if(state.accessToken) { btn.textContent='✅ Connecté'; btn.classList.add('connected'); }
  else { btn.textContent='🔐 Connexion'; btn.classList.remove('connected'); }
}
function handleLoginBtn() {
  if(state.accessToken) { if(confirm('Se déconnecter?')) logoutMicrosoft(); } else loginToMicrosoft();
}
function showConnectBanner(show) { const el=document.getElementById('connectBanner'); if(el) el.style.display=show?'block':'none'; }

// ===== GRAPH API =====
async function graphGet(url) {
  if(!state.accessToken) return null;
  try {
    const r = await fetch(`https://graph.microsoft.com/v1.0${url}`,{headers:{Authorization:`Bearer ${state.accessToken}`}});
    if(r.status===401){state.accessToken=null;updateLoginButton();showToast('⚠️ Session expirée');return null;}
    return r.ok ? await r.json() : null;
  } catch(e) { return null; }
}
async function graphPost(url,body) {
  if(!state.accessToken) return null;
  try {
    const r = await fetch(`https://graph.microsoft.com/v1.0${url}`,{method:'POST',headers:{Authorization:`Bearer ${state.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    return r.ok ? await r.json() : null;
  } catch(e) { return null; }
}
async function getSiteId() {
  if(state.siteId) return state.siteId;
  const d = await graphGet(`/sites/${CONFIG.sharePointHost}:/sites/${CONFIG.sharePointSiteName}`);
  if(d) { state.siteId=d.id; return d.id; }
  return null;
}

