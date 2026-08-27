import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{activeTab === 'saved' && \([\s\S]*?\/>\n\s*?\)\}\n/;
content = content.replace(regex, '');

fs.writeFileSync('src/App.tsx', content);
