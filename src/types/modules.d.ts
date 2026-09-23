declare module 'an-array-of-english-words' {
  const words: string[];
  export default words;
}

declare module 'subtlex-word-frequencies' {
  export interface SubtlexEntry {
    word: string;
    count: number;
  }
  const frequencies: SubtlexEntry[];
  export default frequencies;
}
