import fs from 'fs';

let content = fs.readFileSync('src/components/SolverSection.tsx', 'utf-8');

// Remove Chain Builder button
content = content.replace(
  /\{onOpenWordChain && \([\s\S]*?<\/button>\n\s*?\)\}/,
  ''
);

fs.writeFileSync('src/components/SolverSection.tsx', content);
