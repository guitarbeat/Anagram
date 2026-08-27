import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Remove WordChainBuilder
content = content.replace(/import \{ WordChainBuilder \} from '\.\/components\/WordChainBuilder';/, '');
content = content.replace(/\{activeTab === 'chain' && \([\s\S]*?\)\}/, '');
content = content.replace(/onOpenWordChain=\{handleOpenWordChain\}/, '');

fs.writeFileSync('src/App.tsx', content);
