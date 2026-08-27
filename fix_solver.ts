import fs from 'fs';

let content = fs.readFileSync('src/components/SolverSection.tsx', 'utf-8');
content = content.replace(
  /\{\/\* Results Header \*\/\}/,
  `      </section>\n      {/* Results Header */}`
);

fs.writeFileSync('src/components/SolverSection.tsx', content);
