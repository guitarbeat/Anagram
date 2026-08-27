import fs from 'fs';

let content = fs.readFileSync('src/components/SolverSection.tsx', 'utf-8');

// Add imports
content = content.replace(
  /import \{([^}]+)\} from 'lucide-react';/,
  (match, imports) => {
    let newImports = imports;
    if (!newImports.includes('Trash2')) newImports += '  Trash2,\n';
    if (!newImports.includes('ChevronRight')) newImports += '  ChevronRight,\n';
    return `import {${newImports}} from 'lucide-react';`;
  }
);

content = content.replace(
  /import \{([^}]+)\} from '\.\.\/utils\/anagramSolver';/,
  (match, imports) => {
    let newImports = imports;
    if (!newImports.includes('getValidNextWords')) newImports += '  getValidNextWords,\n';
    if (!newImports.includes('subtract')) newImports += '  subtract,\n';
    if (!newImports.includes('arrSize')) newImports += '  arrSize,\n';
    return `import {${newImports}} from '../utils/anagramSolver';`;
  }
);

// Add state
content = content.replace(
  /const \[savedIndex, setSavedIndex\] = useState<number \| null>\(null\);/,
  `const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [placedWords, setPlacedWords] = useState<string[]>([]);`
);

// Add letter logic
content = content.replace(
  /\/\/ Letter breakdown calculations[\s\S]*?letterChips\.sort\(\(a, b\) => b\[1\] - a\[1\] \|\| a\[0\]\.localeCompare\(b\[0\]\)\);/,
  `// Letter breakdown calculations
  const normalizedSource = normalize(sourceText);
  const sourceLetterCounts = countsArray(sourceText);
  let currentRem = new Uint8Array(sourceLetterCounts);
  for (const w of placedWords) {
    currentRem = subtract(currentRem, countsArray(w));
  }
  const remainingLetterCount = arrSize(currentRem);

  const letterChips: [string, number][] = [];
  for (let i = 0; i < 26; i++) {
    if (currentRem[i] > 0) {
      letterChips.push([String.fromCharCode(97 + i), currentRem[i]]);
    }
  }
  letterChips.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const validNextWords = useMemo(() => {
    if (remainingLetterCount === 0) return [];
    return getValidNextWords(currentRem, vocabDepth);
  }, [remainingLetterCount, currentRem, vocabDepth]);
`
);

// Remove old anchor suggestions logic
content = content.replace(
  /const refreshAnchors = \(\) => \{[\s\S]*?refreshAnchors\(\);\n  \}, \[sourceText, vocabDepth\]\);/,
  `useEffect(() => {
    setPlacedWords([]);
  }, [sourceText]);`
);

// Update dependency array of the solve trigger
content = content.replace(
  /\[normalizedSource, maxWords, resultLimit, anchorInput, customWords, vocabDepth\]\);/,
  `[normalizedSource, maxWords, resultLimit, anchorInput, customWords, vocabDepth, placedWords]);`
);

// Make solveAnagrams use placedWords
content = content.replace(
  /anchorText: anchorInput,/,
  `anchorText: [anchorInput, ...placedWords].filter(Boolean).join(','),`
);

fs.writeFileSync('src/components/SolverSection.tsx', content);
