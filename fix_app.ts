import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add useReducedMotion import
content = content.replace(
  /import \{ AnimatePresence, motion \} from 'motion\/react';/,
  "import { AnimatePresence, motion, useReducedMotion } from 'motion/react';"
);

// Add useReducedMotion hook
content = content.replace(
  /export default function App\(\) \{/,
  "export default function App() {\n  const reduce = useReducedMotion();"
);

// Update motion.div to use it
const newMotionDiv = `<motion.div
            key={activeTab}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >`;

content = content.replace(
  /<motion\.div\s+key=\{activeTab\}\s+initial=\{\{ opacity: 0, y: 15 \}\}\s+animate=\{\{ opacity: 1, y: 0 \}\}\s+exit=\{\{ opacity: 0, y: -15 \}\}\s+transition=\{\{ duration: 0\.2, ease: "easeOut" \}\}\s*>/m,
  newMotionDiv
);

fs.writeFileSync('src/App.tsx', content);

let solver = fs.readFileSync('src/components/SolverSection.tsx', 'utf-8');
solver = solver.replace(/: '—'/g, ": '-'");
fs.writeFileSync('src/components/SolverSection.tsx', solver);
