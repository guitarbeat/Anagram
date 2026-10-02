import nlp from 'compromise';
import { pos } from './lexicon';

/**
 * Transforms raw all-caps anagram phrases into intentional, beautifully punctuated literary prose.
 * Inserts em-dashes (—), colons (:), commas, and periods based on clause boundaries and semantic tags.
 * Example: "SHE WROTE A CHARACTER ZERO AND LOOK ROMANCE ALIGNS" -> "She wrote a character—Zero. And look: romance aligns."
 */
export function smartPunctuate(phrase: string, lockedAnchor?: string): string {
  const clean = phrase.trim();
  if (!clean) return '';

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase() + '.';
  }

  // Check if locked anchor forms the first segment
  let anchorWordCount = 0;
  if (lockedAnchor && lockedAnchor.trim()) {
    const anchorWords = lockedAnchor.trim().split(/\s+/).filter(Boolean);
    if (words.slice(0, anchorWords.length).map(w => w.toLowerCase()).join(' ') === anchorWords.map(w => w.toLowerCase()).join(' ')) {
      anchorWordCount = anchorWords.length;
    }
  }

  const doc = nlp(clean.toLowerCase());
  const clauses: string[] = [];
  let currentWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    const tag = pos(w);
    const nextW = i < words.length - 1 ? words[i + 1].toLowerCase() : null;

    currentWords.push(words[i]);

    // Split at anchor boundary
    if (anchorWordCount > 0 && i === anchorWordCount - 1 && i < words.length - 1) {
      clauses.push(currentWords.join(' '));
      currentWords = [];
      continue;
    }

    // Split before coordinating conjunctions ("and", "but", "so", "yet", "or")
    if (nextW && ['and', 'but', 'so', 'yet', 'while', 'though'].includes(nextW) && currentWords.length >= 2) {
      clauses.push(currentWords.join(' '));
      currentWords = [];
      continue;
    }

    // Split after strong punctuation points: after direct quote words, name tags, or parenthetical items
    if (['look', 'behold', 'listen', 'hark', 'see'].includes(w) && nextW && i < words.length - 2) {
      clauses.push(currentWords.join(' '));
      currentWords = [];
      continue;
    }
  }

  if (currentWords.length > 0) {
    clauses.push(currentWords.join(' '));
  }

  if (clauses.length <= 1) {
    // Single clause: natural title-case / sentence-case formatting
    return formatSingleSentence(words);
  }

  // Format multi-clause sentences with em-dashes and colons
  const formattedClauses: string[] = [];
  for (let c = 0; c < clauses.length; c++) {
    const cWords = clauses[c].split(/\s+/).filter(Boolean);
    if (cWords.length === 0) continue;

    let formatted = cWords.map((w, idx) => {
      if (idx === 0 && (c === 0 || ['and', 'but', 'so', 'yet'].includes(w.toLowerCase()))) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }
      // Check for proper nouns / names
      const docW = nlp(w);
      if (docW.has('#Person') || docW.has('#Place') || docW.has('#ProperNoun')) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }
      return w.toLowerCase();
    }).join(' ');

    formattedClauses.push(formatted);
  }

  // Join clauses with em-dashes, colons, or periods
  let result = formattedClauses[0];
  for (let c = 1; c < formattedClauses.length; c++) {
    const prev = formattedClauses[c - 1].toLowerCase();
    const curr = formattedClauses[c];
    const firstW = curr.split(/\s+/)[0].toLowerCase();

    if (firstW === 'and' || firstW === 'but' || firstW === 'so' || firstW === 'yet') {
      result += `. ${curr}`;
    } else if (prev.endsWith('look') || prev.endsWith('see') || prev.endsWith('behold')) {
      result += `: ${curr}`;
    } else if (c === 1 && anchorWordCount > 0) {
      result += `—${curr}`;
    } else {
      result += `. ${curr}`;
    }
  }

  if (!/[.!?]$/.test(result)) {
    result += '.';
  }

  return result;
}

function formatSingleSentence(words: string[]): string {
  const formatted = words.map((w, idx) => {
    if (idx === 0) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }
    const docW = nlp(w);
    if (docW.has('#Person') || docW.has('#Place') || docW.has('#ProperNoun')) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }
    return w.toLowerCase();
  }).join(' ');

  return formatted.endsWith('.') || formatted.endsWith('!') || formatted.endsWith('?')
    ? formatted
    : formatted + '.';
}
