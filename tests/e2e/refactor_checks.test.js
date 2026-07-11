import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { addTest } from './runner.js';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const adminFile = path.join(projectRoot, 'frontend/src/pages/Admin.tsx');
const adminDir = path.join(projectRoot, 'frontend/src/pages/admin');
const shopFile = path.join(projectRoot, 'frontend/src/pages/Shop.tsx');
const homeFile = path.join(projectRoot, 'frontend/src/pages/Home.tsx');
const cssFile = path.join(projectRoot, 'frontend/src/App.css');

function countAnyInFile(filePath) {
    if (!fs.existsSync(filePath)) return 0;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Strip comments to prevent matching 'any' inside comments
    const cleanContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
        
    const patterns = [
        /:\s*any\b/g,
        /\bas\s+any\b/g,
        /<\s*any\s*>/g,
        /<\s*any\s*,/g,
        /,\s*any\s*>/g
    ];
    
    let count = 0;
    for (const pattern of patterns) {
        const matches = cleanContent.match(pattern);
        if (matches) {
            count += matches.length;
        }
    }
    return count;
}

// 1. Admin.tsx line count must be < 300
addTest(4, 'Refactor R1: Admin.tsx line count is under 300 lines', async () => {
    if (!fs.existsSync(adminFile)) {
        throw new Error(`Admin.tsx does not exist at ${adminFile}`);
    }
    const content = fs.readFileSync(adminFile, 'utf8');
    const lines = content.split(/\r?\n/).length;
    assert.ok(lines < 300, `Admin.tsx is ${lines} lines, which is not < 300 lines`);
});

// 2. Absence of local toasts/showToast in Admin.tsx and useToastStore usage
addTest(4, 'Refactor R2: Global useToastStore replaces local toasts/showToast in Admin.tsx and child panels', async () => {
    if (!fs.existsSync(adminFile)) {
        throw new Error(`Admin.tsx does not exist at ${adminFile}`);
    }
    const content = fs.readFileSync(adminFile, 'utf8');
    
    // Check local toast state absence
    const hasLocalToastState = /useState\s*<\s*Toast\s*\[\s*\]\s*>\s*\(\s*\[\s*\]\s*\)/.test(content) || 
                               /useState\s*\(\s*\[\s*\]\s*\)/.test(content) && content.includes('setToasts');
    assert.strictEqual(hasLocalToastState, false, 'Admin.tsx must not declare local toasts state');
    
    // Check local showToast function absence
    const hasLocalShowToastFunction = /const\s+showToast\s*=\s*\((type|:|success|error)/.test(content) || 
                                      /function\s+showToast\s*\(/.test(content);
    assert.strictEqual(hasLocalShowToastFunction, false, 'Admin.tsx must not define local showToast function');
    
    // Check useToastStore presence
    const usesToastStore = content.includes('useToastStore');
    assert.strictEqual(usesToastStore, true, 'Admin.tsx must use global useToastStore');
    
    // Check all sub-panels under admin/ do not receive showToast as a prop or specify it in their prop interface
    if (fs.existsSync(adminDir)) {
        const subFiles = fs.readdirSync(adminDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
        for (const file of subFiles) {
            const subFilePath = path.join(adminDir, file);
            const subContent = fs.readFileSync(subFilePath, 'utf8');
            
            // Check if showToast is defined in component parameters or interface definition
            const hasShowToastProp = /showToast\s*[:\r\n\s]*(?:(?:showToast\s*,)|(?:showToast\s*[:\s]*\([^)]*\)\s*=>)|(?:showToast\s*[:\s]*any)|(?:showToast\s*[:\s]*Function))/i.test(subContent) ||
                                     /export\s+default\s+function\s+\w+\s*\([^)]*showToast/i.test(subContent) ||
                                     /interface\s+\w+Props\s*\{[^}]*showToast/i.test(subContent);
            assert.strictEqual(hasShowToastProp, false, `${file} should not have showToast prop drilled or defined in its prop interfaces`);
            
            // If it displays toast alerts, it should import useToastStore
            if (subContent.includes('showToast(') && !subContent.includes('showToast =')) {
                const importsToastStore = subContent.includes('useToastStore');
                assert.strictEqual(importsToastStore, true, `${file} uses showToast() but does not import or call useToastStore()`);
            }
        }
    }
});

// 3. React Query (useQuery) usage in Shop.tsx and Home.tsx
addTest(4, 'Refactor R3: Shop.tsx and Home.tsx use React Query for category/product/color fetching', async () => {
    if (!fs.existsSync(shopFile)) {
        throw new Error(`Shop.tsx does not exist at ${shopFile}`);
    }
    if (!fs.existsSync(homeFile)) {
        throw new Error(`Home.tsx does not exist at ${homeFile}`);
    }
    
    const shopContent = fs.readFileSync(shopFile, 'utf8');
    const homeContent = fs.readFileSync(homeFile, 'utf8');
    
    // Verify react-query imports and useQuery queries
    const shopUsesQuery = shopContent.includes('@tanstack/react-query') && shopContent.includes('useQuery');
    const homeUsesQuery = homeContent.includes('@tanstack/react-query') && homeContent.includes('useQuery');
    
    assert.strictEqual(shopUsesQuery, true, 'Shop.tsx must import and use React Query (useQuery)');
    assert.strictEqual(homeUsesQuery, true, 'Home.tsx must import and use React Query (useQuery)');
    
    // Check that raw fetches/useEffect state updates for colors/categories/products are removed or replaced
    const shopRawFetchColors = shopContent.includes("fetch('/api/colors')") || shopContent.includes("fetch(`/api/colors`)") || shopContent.includes('fetch("/api/colors")');
    const shopRawFetchCategories = shopContent.includes("fetch('/api/categories')") || shopContent.includes("fetch(`/api/categories`)") || shopContent.includes('fetch("/api/categories")');
    const shopRawFetchProducts = shopContent.includes("fetch(`/api/products") || shopContent.includes('fetch("/api/products') || shopContent.includes('fetch("/api/products?');
    
    assert.strictEqual(shopRawFetchColors, false, 'Shop.tsx should not perform raw fetch for colors inside useEffect');
    assert.strictEqual(shopRawFetchCategories, false, 'Shop.tsx should not perform raw fetch for categories inside useEffect');
    assert.strictEqual(shopRawFetchProducts, false, 'Shop.tsx should not perform raw fetch for products inside useEffect');
    
    const homeRawFetchColors = homeContent.includes("fetch('/api/colors')") || homeContent.includes("fetch(`/api/colors`)") || homeContent.includes('fetch("/api/colors")');
    const homeRawFetchCategories = homeContent.includes("fetch('/api/categories')") || homeContent.includes("fetch(`/api/categories`)") || homeContent.includes('fetch("/api/categories")');
    const homeRawFetchProducts = homeContent.includes("fetch(`/api/products") || homeContent.includes('fetch("/api/products') || homeContent.includes('fetch("/api/products?');
    
    assert.strictEqual(homeRawFetchColors, false, 'Home.tsx should not perform raw fetch for colors inside useEffect');
    assert.strictEqual(homeRawFetchCategories, false, 'Home.tsx should not perform raw fetch for categories inside useEffect');
    assert.strictEqual(homeRawFetchProducts, false, 'Home.tsx should not perform raw fetch for products inside useEffect');
});

// 4. Non-existence of frontend/src/App.css
addTest(4, 'Refactor R4: frontend/src/App.css must be deleted', async () => {
    const exists = fs.existsSync(cssFile);
    assert.strictEqual(exists, false, 'frontend/src/App.css still exists and should be deleted');
});

// 5. Reduction of 20+ instances of 'any' types
addTest(4, 'Refactor R4: TS type safety check (resolved at least 20 instances of any)', async () => {
    let total = countAnyInFile(adminFile);
    
    if (fs.existsSync(adminDir)) {
        const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
        for (const file of files) {
            total += countAnyInFile(path.join(adminDir, file));
        }
    }
    
    // Baseline was 66 total 'any' instances. Must resolve at least 20, meaning total 'any' count must be <= 46.
    const baseline = 66;
    const requiredReduction = 20;
    const maxAllowedAny = baseline - requiredReduction;
    
    assert.ok(total <= maxAllowedAny, `Total 'any' instances is ${total}, which is more than the maximum allowed ${maxAllowedAny} (requires resolving at least 20 instances of 'any' from baseline of 66)`);
});

// 6. Successful build compilation in frontend/
addTest(4, 'Refactor Build: Frontend project build compilation compiles successfully', async () => {
    const frontendPath = path.join(projectRoot, 'frontend');
    try {
        execSync('npm run build', {
            cwd: frontendPath,
            env: { ...process.env, PATH: "C:\\Users\\Cyrix HealthCare\\AppData\\Local\\node-portable\\node-v22.16.0-win-x64;" + process.env.PATH },
            stdio: 'pipe'
        });
    } catch (err) {
        throw new Error(`Frontend build compilation failed: ${err.message}\n${err.stderr ? err.stderr.toString() : ''}`);
    }
});
