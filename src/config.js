// Runtime configuration for the Google Drive layer.
// Defaults ship with the build; anything the user enters in Settings is kept in localStorage
// so the OAuth client id can be added after publishing without a rebuild.

export const DEFAULTS = {
  clientId: '834072849408-kerfr1jhg6nc05h3dpk0965juj3b9379.apps.googleusercontent.com', // public web OAuth client id (project han-signout-app); Settings can override
  folderId: '1IDOdz37IQJaYDX7PVFlqB7VFzyfiNXMM',       // seed "Pathology reports" folder; unreachable accounts get their own (see src/drive.js)
  folderName: 'Pathology reports',                    // name of the folder the app creates for an account that cannot use folderId
  sheetName: 'Sign-out cases',
  sheetId: '',                                        // filled in once the Sheet is created/found
  accounts: {},                                       // per-signed-in-address { folderId, sheetId }; see accountConfig()
  scopeMode: 'file',                                  // 'file' = drive.file (least privilege); 'full' = drive (if the folder is not writable)
  allowedEmails: []                                   // [] = any Google account may sign in; add addresses to restrict (see src/gate.js)
};

const KEY = 'signout.config.v1';

export function loadConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) : {};
    for (const k of Object.keys(saved)) {
      if (typeof saved[k] === 'string') saved[k] = saved[k].trim();
      if (saved[k] === '' || saved[k] == null) delete saved[k]; // blanks never mask defaults
    }
    // The allow-list is the one array here; a corrupted value must not become a truthy non-list
    // that later code treats as a restriction nobody can satisfy.
    if ('allowedEmails' in saved && !Array.isArray(saved.allowedEmails)) delete saved.allowedEmails;
    // Same for the per-account store: a corrupted value must not be spread over the defaults.
    if ('accounts' in saved && (typeof saved.accounts !== 'object' || saved.accounts === null || Array.isArray(saved.accounts))) delete saved.accounts;
    // A mistyped or truncated client id yields Google's "invalid_client"; fall back to the shipped one.
    if (saved.clientId && !/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(saved.clientId)) delete saved.clientId;
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

/** One browser, several colleagues: the address is the key, folded the way the gate folds it. */
export function accountKey(email) {
  return String(email ?? '').trim().toLowerCase();
}

/**
 * The config as it applies to one signed-in address. Drive ids are per account, because a folder
 * one colleague owns is not a folder another can write to — each account resolves its own and the
 * answer is remembered under their address. `account: ''` (nobody signed in yet) is the plain config.
 */
export function accountConfig(config, email) {
  const account = accountKey(email);
  if (!account) return { ...config, account: '' };
  const slot = (config.accounts && config.accounts[account]) || {};
  return { ...config, ...slot, account };
}

/**
 * Remember a resolved Drive id for the account this config belongs to, and mirror it onto the
 * live object so the rest of the session skips the lookup. With no account (local development,
 * browser QA) it falls back to the shared config so behaviour there is unchanged.
 */
export function rememberForAccount(config, patch) {
  const account = accountKey(config?.account);
  if (!account) { Object.assign(config, patch); return saveConfig(patch); }
  const base = loadConfig();
  const accounts = { ...(base.accounts || {}), [account]: { ...(base.accounts?.[account] || {}), ...patch } };
  saveConfig({ accounts });
  Object.assign(config, patch);
  return config;
}

export function scopesFor(config) {
  const drive = config.scopeMode === 'full'
    ? 'https://www.googleapis.com/auth/drive'
    : 'https://www.googleapis.com/auth/drive.file';
  return [drive, 'https://www.googleapis.com/auth/spreadsheets'].join(' ');
}
