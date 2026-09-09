// Runtime configuration for the Google Drive layer.
// Defaults ship with the build; anything the user enters in Settings is kept in localStorage
// so the OAuth client id can be added after publishing without a rebuild.

export const DEFAULTS = {
  clientId: '834072849408-kerfr1jhg6nc05h3dpk0965juj3b9379.apps.googleusercontent.com', // public web OAuth client id (project han-signout-app); Settings can override
  folderId: '1IDOdz37IQJaYDX7PVFlqB7VFzyfiNXMM',       // "Pathology reports" folder
  sheetName: 'Sign-out cases',
  sheetId: '',                                        // filled in once the Sheet is created/found
  scopeMode: 'file'                                   // 'file' = drive.file (least privilege); 'full' = drive (if the folder is not writable)
};

const KEY = 'signout.config.v1';

export function loadConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) : {};
    for (const k of Object.keys(saved)) if (saved[k] === '' || saved[k] == null) delete saved[k]; // blanks never mask defaults
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(patch) {
  const next = { ...loadConfig(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* preview iframe */ }
  return next;
}

export function scopesFor(config) {
  const drive = config.scopeMode === 'full'
    ? 'https://www.googleapis.com/auth/drive'
    : 'https://www.googleapis.com/auth/drive.file';
  return [drive, 'https://www.googleapis.com/auth/spreadsheets'].join(' ');
}
