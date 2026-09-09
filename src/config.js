// Runtime configuration for the Google Drive layer.
// Defaults ship with the build; anything the user enters in Settings is kept in localStorage
// so the OAuth client id can be added after publishing without a rebuild.

export const DEFAULTS = {
  clientId: '',                                       // Web OAuth client id from Google Cloud (Phase 2 manual step)
  folderId: '1IDOdz37IQJaYDX7PVFlqB7VFzyfiNXMM',       // "Pathology reports" folder
  sheetName: 'Sign-out cases',
  sheetId: '',                                        // filled in once the Sheet is created/found
  scopeMode: 'file'                                   // 'file' = drive.file (least privilege); 'full' = drive (if the folder is not writable)
};

const KEY = 'signout.config.v1';

export function loadConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
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
