// Flat config. The job here is not style — it is catching the class of mistake that
// 896 passing tests cannot see: code that never runs, a value assigned and thrown
// away, a name that does not exist. The audit found an unreachable duplicated
// `return` in src/config.js that had been sitting there through every phase.
//
// Formatting rules are deliberately absent. Nothing in this repo is reformatted by
// this config, so a lint run never touches a diff.

export default [
  {
    files: ['src/**/*.js', 'generators/**/*.js', 'templates/**/*.js', 'tools/**/*.js', 'tests/**/*.js', 'legacy/**/*.js', 'lab/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        structuredClone: 'readonly',
        crypto: 'readonly',
        CSS: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        queueMicrotask: 'readonly',
        location: 'readonly',
        history: 'readonly',
        Image: 'readonly',
        AbortController: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        Intl: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        HTMLElement: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        MutationObserver: 'readonly',
        google: 'readonly',
        gapi: 'readonly',
      },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      // Correctness — these are errors.
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-obj-calls': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sparse-arrays': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      // Warn, not error: the synoptic generators use `(m = s.match(/re/)) ? ... : ...`
      // inside template literals to capture and test in one step. All 11 current
      // instances (breast_shared, lung_carcinoma, ovary_ft_peritoneum) were read and are
      // deliberate. A genuine `if (x = 1)` typo would still surface here.
      'no-cond-assign': 'warn',
      'no-fallthrough': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],

      // Hygiene — warnings, so they never block a release on their own.
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-prototype-builtins': 'warn',
      'no-case-declarations': 'warn',
    },
  },
  {
    // Test files define and discard a lot of scratch values by design.
    files: ['tests/**/*.js'],
    rules: { 'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }] },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'analysis/**', 'vendor/**', 'docs/**'],
  },
];
