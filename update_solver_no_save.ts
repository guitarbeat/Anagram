import fs from 'fs';

let content = fs.readFileSync('src/components/SolverSection.tsx', 'utf-8');

// Remove import
content = content.replace(/import \{ saveAnagram \} from '\.\.\/utils\/storage';\n/, '');

// Remove Bookmark icon
content = content.replace(/  Bookmark,\n/, '');

// Remove props
content = content.replace(/  onFavoritesUpdated: \(\) => void;\n/, '');
content = content.replace(/  onFavoritesUpdated,\n/, '');

// Remove state
content = content.replace(/  const \[savedIndex, setSavedIndex\] = useState<number \| null>\(null\);\n/, '');

// Remove handleSave
content = content.replace(/  const handleSave = \([\s\S]*?setTimeout\(\(\) => setSavedIndex\(null\), 2000\);\n  \};\n/, '');

// Remove button
content = content.replace(/                  <button\n                    onClick=\{\(\) => handleSave\(item\.phrase, idx\)\}[\s\S]*?<\/button>\n/, '');

fs.writeFileSync('src/components/SolverSection.tsx', content);
