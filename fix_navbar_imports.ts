import fs from 'fs';

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

// Remove Bookmark icon import
content = content.replace(/  Bookmark,\n/, '');

fs.writeFileSync('src/components/Navbar.tsx', content);
