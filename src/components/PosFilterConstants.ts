import type { POS } from '../engine/types';

export interface PosFilterItem {
  id: POS | 'all' | 'other';
  label: string;
  desc: string;
  details: string;
  textColor: string;
  borderColor: string;
  activeBg: string;
}

export const POS_FILTERS: readonly PosFilterItem[] = [
  {
    id: 'all',
    label: 'All',
    desc: 'All dictionary word types',
    details: 'Complete set of words formed by available letters',
    textColor: 'text-zinc-700',
    borderColor: 'border-zinc-200',
    activeBg: 'bg-zinc-900 text-white border-zinc-900',
  },
  {
    id: 'noun',
    label: 'Nouns',
    desc: 'Objects, entities, people & places',
    details: 'Substantive naming words and entities',
    textColor: 'text-zinc-700',
    borderColor: 'border-zinc-200',
    activeBg: 'bg-zinc-900 text-white border-zinc-900',
  },
  {
    id: 'verb',
    label: 'Verbs',
    desc: 'Action words, states & auxiliary verbs',
    details: 'Actions, states of being, and modal verbs',
    textColor: 'text-zinc-700',
    borderColor: 'border-zinc-200',
    activeBg: 'bg-zinc-900 text-white border-zinc-900',
  },
  {
    id: 'adj',
    label: 'Adjectives',
    desc: 'Descriptors, qualities & attributes',
    details: 'Sensory properties, modifiers, and descriptors',
    textColor: 'text-zinc-700',
    borderColor: 'border-zinc-200',
    activeBg: 'bg-zinc-900 text-white border-zinc-900',
  },
  {
    id: 'adv',
    label: 'Adverbs',
    desc: 'Modifiers of verbs & adjectives',
    details: 'Expressions of manner, degree, time, and frequency',
    textColor: 'text-zinc-700',
    borderColor: 'border-zinc-200',
    activeBg: 'bg-zinc-900 text-white border-zinc-900',
  },
  {
    id: 'other',
    label: 'Other',
    desc: 'Pronouns, prepositions, articles, conjunctions, & misc',
    details: 'pron (pronouns), prep (prepositions), art (articles/determiners), conj (conjunctions), other (misc)',
    textColor: 'text-zinc-700',
    borderColor: 'border-zinc-200',
    activeBg: 'bg-zinc-900 text-white border-zinc-900',
  },
] as const;

