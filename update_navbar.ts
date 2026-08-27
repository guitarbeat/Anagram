import fs from 'fs';

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

// Update TabType type
content = content.replace(/ \| 'saved'/, '');
content = content.replace(/  savedCount: number;\n/, '');
content = content.replace(/  savedCount,\n/, '');

// Remove Saved button
content = content.replace(
  /\{\/\* 5\. Saved Tab \*\/\}\s*<button[\s\S]*?<\/button>\n/m,
  ''
);

fs.writeFileSync('src/components/Navbar.tsx', content);
