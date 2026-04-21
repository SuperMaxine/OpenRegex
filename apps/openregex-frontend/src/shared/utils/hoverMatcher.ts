/**
 * Evaluates whether a specific token hovered in the Pattern Editor
 * matches an abstract description item in the Cheat Sheet.
 * Supports symmetric matching allowing concrete-to-abstract and abstract-to-concrete.
 * * Note: Placed in shared/utils because it is cross-cutting between Pattern Editor and Cheat Sheet.
 */
export function isCheatSheetItemHovered(token1: string | null | undefined, token2: string | null | undefined): boolean {
  if (!token1 || !token2) return false;
  if (token1 === token2) return true;

  const matchDirection = (concrete: string, abstract: string) => {
    if (concrete === abstract) return true;

    // Grouping & Lookarounds
    if (concrete === '(' && abstract === '(...)') return true;
    if (concrete === '(?:' && abstract === '(?:...)') return true;
    if (concrete.startsWith('(?P<') && abstract === '(?P<name>...)') return true;
    if (concrete.startsWith('(?<') && !concrete.startsWith('(?<=') && abstract === '(?<name>...)') return true;
    if (concrete === '(?=' && abstract === '(?=...)') return true;
    if (concrete === '(?!' && abstract === '(?!...)') return true;
    if (concrete === '(?<=' && abstract === '(?<=...)') return true;
    if (concrete === '(?<!' && abstract === '(?<!...)') return true;
    if (concrete === '(?>' && abstract === '(?>...)') return true;
    if (concrete === '(?|' && abstract === '(?|...|...)') return true;

    // Scoped inline flags e.g. (?i:...) matches (?flags-flags:...)
    if (/^\(\?[a-zA-Z-]+:\)$/.test(concrete) && abstract === '(?flags-flags:...)') return true;

    // Fuzzy matchers
    const fuzzyMatch = concrete.match(/^\{([esid])<=\d+\}$/);
    if (fuzzyMatch && abstract === `(?:...){${fuzzyMatch[1]}<=N}`) return true;
    if (concrete === '(?:' && abstract.startsWith('(?:...){')) return true;

    // Backreferences
    if (/^\\[1-9]\d*$/.test(concrete) && abstract === '\\1') return true;
    if (/^\(\?[1-9]\d*\)$/.test(concrete) && abstract === '(?1)') return true;
    if (concrete.startsWith('(?P=') && abstract === '(?P=name)') return true;
    if (concrete.startsWith('\\g<') && abstract === '\\g<name>') return true;
    if (concrete.startsWith('(?&') && abstract === '(?&name)') return true;
    if (concrete === '(?R)' && abstract === '(?R)') return true;

    // Character classes
    if (concrete.startsWith('[^') && abstract === '[^a-z]') return true;
    if (concrete.startsWith('[') && !concrete.startsWith('[^') && abstract === '[a-z]') return true;

    // Unicode properties
    if (concrete.startsWith('\\p{') && abstract === '\\p{L}') return true;
    if (concrete.startsWith('\\P{') && abstract === '\\P{L}') return true;

    // Quantifiers
    const cleanToken = concrete.replace(/[?+]$/, '');
    if (concrete.startsWith('{')) {
      const isLazy = concrete.endsWith('?');
      const isPossessive = concrete.endsWith('+');
      const isAbstractLazy = abstract.endsWith('?');
      const isAbstractPossessive = abstract.endsWith('+');

      if (isLazy !== isAbstractLazy || isPossessive !== isAbstractPossessive) return false;

      const isMn = /\{m\s*,\s*n\}/i.test(abstract) || /\{min\s*,\s*max\}/i.test(abstract) || /\{n\s*,\s*m\}/i.test(abstract);
      const isNcomma = /\{n\s*,\s*\}/i.test(abstract) || /\{min\s*,\s*\}/i.test(abstract);
      const isN = /\{n\}/i.test(abstract) || /\{m\}/i.test(abstract);

      const hasComma = cleanToken.includes(',');
      const parts = cleanToken.split(',');
      const afterComma = parts.length > 1 ? parts[1].replace('}', '').trim() : '';
      const hasTwoNumbers = hasComma && afterComma.length > 0;

      if (hasTwoNumbers && isMn) return true;
      if (hasComma && !hasTwoNumbers && isNcomma) return true;
      if (!hasComma && isN) return true;
    }

    // Escapes (Fallback for \w, \d, \b, \A, etc.)
    if (concrete.startsWith('\\') && concrete.length >= 2) {
      const baseToken = concrete.substring(0, 2);
      if (abstract === baseToken) return true;
    }

    return false;
  };

  return matchDirection(token1, token2) || matchDirection(token2, token1);
}