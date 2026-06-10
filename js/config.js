// ===== CONFIG =====
const CONFIG = {
  clientId: '6cab6163-d4de-4a5a-a9f4-36f4058be920',
  tenantId: 'a8238caf-f2db-4be1-93a7-ce2789e11107',
  redirectUri: 'https://emilie-pepin-designer-interieur.github.io/emilie-pepin-designer-interieur/',
  scopes: 'https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/Notes.ReadWrite.All https://graph.microsoft.com/Tasks.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Contacts.ReadWrite offline_access',
  sharePointHost: 'emiliepepin.sharepoint.com',
  sharePointSiteName: 'EmiliePepinDesignerInterieur',
  oneDriveRoot: 'Emilie Pepin Designer Interieur/CLIENTS',
};

// ===== STATE =====
let state = {
  currentClient: null, clients: [], accessToken: null, siteId: null,
  timerInterval: null, timerRunning: false, timerSeconds: 0,
  cameraStream: null, cameraActive: false, timeEntries: [], moodImages: []
};


// ===== CAMÉRA STATE =====
let cameraFacing = 'environment';
let currentMode = 'photo';
let zoomCSS = 1.0;
let zoomLevels = [];
let pinchStartDist = 0;
let pinchStartZoom = 1.0;
let zoomIndicatorTimer = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordTimerInterval = null;
let recordSeconds = 0;
let flashEnabled = false;
let gridVisible = false;
let currentVideoBlob = null;
let sessionPhotos = [];
let offlineQueue = [];
let editingPhotoIndex = -1;
let selectedPhotoIndex = -1;
let cropRatioValue = null;
let textColor = '#FFFFFF';
let editState = { tool:null, color:'#FF453A', size:4, drawing:false, startX:0, startY:0, history:[], baseImage:null, brightness:0, contrast:0, saturation:0 };
let cropHandles = { active:false, handle:null, startX:0, startY:0, startRect:{x:0,y:0,w:1,h:1}, rect:{x:0,y:0,w:1,h:1} };
let liveText = { el:null, text:'', x:0, y:0, size:32, color:'#FFFFFF', dragging:false, startX:0, startY:0 };
let viewerCurrentIndex = 0;
let viewerStartX = 0;

