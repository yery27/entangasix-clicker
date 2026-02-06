import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionPath = path.join(__dirname, '../public/version.json');

const versionData = {
    version: Date.now().toString(),
    timestamp: new Date().toISOString()
};

fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

console.log('✅ Version file generated:', versionData);
