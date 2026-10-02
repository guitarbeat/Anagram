import { useState, useCallback, useMemo } from 'react';

export interface UseAnchorPinningOptions {
  initialAnchor?: string;
  initialPinned?: boolean;
  onNotification?: (msg: string, type: 'info' | 'success') => void;
}

export function useAnchorPinning({
  initialAnchor = '',
  initialPinned = false,
  onNotification,
}: UseAnchorPinningOptions = {}) {
  const [filterText, setFilterText] = useState<string>(initialAnchor);
  const [isAnchorPinned, setIsAnchorPinned] = useState<boolean>(initialPinned);

  const pinnedWords = useMemo(() => {
    if (!isAnchorPinned || !filterText.trim()) return [];
    return filterText
      .split(/[\s,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
  }, [filterText, isAnchorPinned]);

  const togglePinWord = useCallback(
    (word: string) => {
      const cleanWord = word.trim();
      if (!cleanWord) return;

      const currentPinned = (isAnchorPinned && filterText.trim())
        ? filterText.split(/[\s,]+/).map((w) => w.trim()).filter(Boolean)
        : [];

      const wordLower = cleanWord.toLowerCase();
      const exists = currentPinned.some((w) => w.toLowerCase() === wordLower);

      let newPinnedWords: string[];
      if (exists) {
        newPinnedWords = currentPinned.filter((w) => w.toLowerCase() !== wordLower);
      } else {
        newPinnedWords = [...currentPinned, cleanWord];
      }

      if (newPinnedWords.length === 0) {
        setFilterText('');
        setIsAnchorPinned(false);
        onNotification?.(`Unlocked "${cleanWord}"`, 'info');
      } else {
        setFilterText(newPinnedWords.join(', '));
        setIsAnchorPinned(true);
        onNotification?.(
          exists ? `Unlocked "${cleanWord}"` : `Locked in "${cleanWord}"`,
          'success'
        );
      }
    },
    [isAnchorPinned, filterText, onNotification]
  );

  const clearPinned = useCallback(() => {
    setFilterText('');
    setIsAnchorPinned(false);
  }, []);

  return {
    filterText,
    setFilterText,
    isAnchorPinned,
    setIsAnchorPinned,
    pinnedWords,
    togglePinWord,
    clearPinned,
  };
}
