#!/usr/bin/env node
/**
 * patch-api-urls.js - Post-process www/ files for Capacitor app
 *
 * Transformations:
 * 1. Rewrite API_BASE in auth.js to use window.__API_BASE__
 * 2. Rewrite getAPIBaseURL() in fortune-api.js to use window.__API_BASE__
 * 3. Rewrite fetch('/api/...') to fetch(window.__API_BASE__ + '/api/...') in all files
 * 4. Inject <script src="/js/api-config.js"> as first script in all HTML files
 * 5. Inject <script src="/js/capacitor-init.js"> after api-config.js
 * 6. Platform-specific ad handling (--platform=ios removes Baidu ad references)
 *
 * Usage:
 *   node scripts/patch-api-urls.js                    # default (Android, keep ads)
 *   node scripts/patch-api-urls.js --platform=ios     # iOS, remove Baidu ads
 */

const fs = require('fs');
const path = require('path');

// --- Parse args ---
const args = process.argv.slice(2);
let platform = 'android'; // default
for (let i = 0; i < args.length; i++) {
  // Handle both --platform=ios and --platform ios
  if (args[i].startsWith('--platform=')) {
    platform = args[i].split('=')[1].toLowerCase();
  } else if (args[i] === '--platform' && args[i + 1]) {
    platform = args[i + 1].toLowerCase();
  }
}

const WWW_DIR = path.join(__dirname, '..', 'www');

if (!fs.existsSync(WWW_DIR)) {
  console.error('Error: www/ directory not found. Run "npm run sync" first.');
  process.exit(1);
}

console.log(`Patching API URLs for platform: ${platform}`);

// --- Helper: recursively find files ---
function findFiles(dir, ext) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFiles(fullPath, ext));
    } else if (!ext || entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

// --- Helper: read & write file ---
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

// --- 1. Patch js/auth.js ---
function patchAuthJS() {
  const filePath = path.join(WWW_DIR, 'js', 'auth.js');
  if (!fs.existsSync(filePath)) {
    console.log('  Skipping auth.js (not found)');
    return;
  }

  let content = readFile(filePath);

  // Change: var API_BASE = ''; → var API_BASE = window.__API_BASE__ || '';
  if (content.includes("var API_BASE = '';")) {
    content = content.replace(
      /var API_BASE = '';/g,
      "var API_BASE = window.__API_BASE__ || '';"
    );
    console.log('  Patched auth.js: API_BASE → window.__API_BASE__');
  } else {
    console.log('  auth.js: API_BASE already patched or pattern not found');
  }

  writeFile(filePath, content);
}

// --- 2. Patch js/fortune-api.js ---
function patchFortuneAPIJS() {
  const filePath = path.join(WWW_DIR, 'js', 'fortune-api.js');
  if (!fs.existsSync(filePath)) {
    console.log('  Skipping fortune-api.js (not found)');
    return;
  }

  let content = readFile(filePath);

  // Replace the entire getAPIBaseURL() function body
  const oldFuncPattern = /function getAPIBaseURL\(\)\s*\{[\s\S]*?\n\}/;
  const newFunc = `function getAPIBaseURL() {
    // Capacitor app: use injected API base URL
    if (window.__API_BASE__) return window.__API_BASE__;
    // Fallback: same-origin (empty string = relative to current host)
    return '';
}`;

  if (oldFuncPattern.test(content)) {
    content = content.replace(oldFuncPattern, newFunc);
    console.log('  Patched fortune-api.js: getAPIBaseURL() → window.__API_BASE__');
  } else {
    console.log('  fortune-api.js: getAPIBaseURL() pattern not found');
  }

  writeFile(filePath, content);
}

// --- 3. Patch fetch('/api/...') in all HTML and JS files ---
function patchFetchAPI() {
  const htmlFiles = findFiles(WWW_DIR, '.html');
  const jsFiles = findFiles(path.join(WWW_DIR, 'js'), '.js');
  const allFiles = [...htmlFiles, ...jsFiles];

  let totalPatched = 0;

  for (const filePath of allFiles) {
    let content = readFile(filePath);
    const original = content;

    // Pattern: fetch('/api/...') or fetch("/api/...")
    // Replace with: fetch(window.__API_BASE__ + '/api/...')
    // But NOT if it already has window.__API_BASE__
    content = content.replace(
      /fetch\(\s*['"]\/api\//g,
      "fetch(window.__API_BASE__ + '/api/"
    );

    // Also handle fetch(`${API_BASE}/api/...`) style (template literal)
    content = content.replace(
      /fetch\(\s*`\$\{API_BASE\}\/api\//g,
      'fetch(`${window.__API_BASE__ || API_BASE}/api/'
    );

    if (content !== original) {
      writeFile(filePath, content);
      totalPatched++;
      const relPath = path.relative(WWW_DIR, filePath);
      const matches = original.match(/fetch\(\s*['"`]\/api\//g);
      const count = matches ? matches.length : 0;
      console.log(`  Patched ${relPath} (${count} fetch calls)`);
    }
  }

  console.log(`  Total files with fetch() patched: ${totalPatched}`);
}

// --- 4. Inject scripts into all HTML files ---
function injectScripts() {
  const htmlFiles = findFiles(WWW_DIR, '.html');
  let injected = 0;

  for (const filePath of htmlFiles) {
    let content = readFile(filePath);

    // Skip if already injected
    if (content.includes('api-config.js')) {
      continue;
    }

    // Find the first <script tag and inject before it
    const scriptsToInject = [
      '<script src="/js/api-config.js"></script>',
      '<script src="/js/capacitor-init.js"></script>',
    ].join('\n    ');

    // Try to find <head> section and inject before first existing script
    if (content.includes('<script')) {
      content = content.replace(
        /(<script[\s>])/i,
        `${scriptsToInject}\n    $1`
      );
    } else if (content.includes('</head>')) {
      // No scripts at all, inject before </head>
      content = content.replace(
        /<\/head>/i,
        `    ${scriptsToInject}\n  </head>`
      );
    }

    writeFile(filePath, content);
    injected++;
  }

  console.log(`  Injected scripts into ${injected} HTML files`);
}

// --- 5. Platform-specific: iOS ad removal ---
function patchAdsForPlatform() {
  if (platform !== 'ios') {
    console.log(`  Platform: ${platform} — keeping Baidu ads as-is`);
    return;
  }

  console.log('  Platform: iOS — removing Baidu ad references');

  const htmlFiles = findFiles(WWW_DIR, '.html');

  for (const filePath of htmlFiles) {
    let content = readFile(filePath);
    const original = content;

    // Remove <script src="/js/ads.js"></script>
    content = content.replace(/\s*<script\s+src=["']\/js\/ads\.js["']\s*><\/script>\s*/gi, '\n');

    // Remove the ad modal div (id="adModal")
    content = content.replace(/<div\s+class=["']ad-modal["']\s+id=["']adModal["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '<!-- Ad modal removed for iOS -->');

    // Remove ad-related style blocks (if inline)
    // This is a best-effort removal; some ads are loaded dynamically

    if (content !== original) {
      writeFile(filePath, content);
      const relPath = path.relative(WWW_DIR, filePath);
      console.log(`  Removed ads from ${relPath}`);
    }
  }

  // Also patch ads.js to be a no-op on iOS
  const adsPath = path.join(WWW_DIR, 'js', 'ads.js');
  if (fs.existsSync(adsPath)) {
    let adsContent = readFile(adsPath);
    // Force AdConfig.enabled = false
    adsContent = adsContent.replace(
      /enabled:\s*true/gi,
      'enabled: false  /* disabled for iOS */'
    );
    adsContent = adsContent.replace(
      /enabled:\s*false/gi,
      'enabled: false  /* disabled for iOS */'
    );
    writeFile(adsPath, adsContent);
    console.log('  Disabled ads.js for iOS platform');
  }
}

// --- 6. Patch external links to open in system browser ---
function patchExternalLinks() {
  const htmlFiles = findFiles(WWW_DIR, '.html');
  let patched = 0;

  for (const filePath of htmlFiles) {
    let content = readFile(filePath);
    const original = content;

    // Add target="_blank" to links to beian.miit.gov.cn or other external gov sites
    content = content.replace(
      /<a\s+(href=["']https?:\/\/(?:beian\.miit\.gov\.cn|www\.beian\.gov\.cn)[^"']*["'])(?![^>]*target=)/gi,
      '<a $1 target="_blank" rel="noopener noreferrer"'
    );

    if (content !== original) {
      writeFile(filePath, content);
      patched++;
    }
  }

  if (patched > 0) {
    console.log(`  Patched external links in ${patched} files (target="_blank")`);
  }
}

// --- Run all patches ---
console.log('');
patchAuthJS();
patchFortuneAPIJS();
patchFetchAPI();
injectScripts();
patchAdsForPlatform();
patchExternalLinks();

console.log('');
console.log('All patches applied successfully!');
