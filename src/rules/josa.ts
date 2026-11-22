// 한국어 조사 자동 선택. 동적 단어 뒤에 '을/를', '이/가', '은/는', '와/과', '으로/로'를 붙일 때 사용.
type Pair = "을/를" | "이/가" | "은/는" | "와/과" | "으로/로";

function lastHangul(word: string) {
  for (let i = word.length - 1; i >= 0; i--) {
    const c = word.charCodeAt(i) - 0xac00;
    if (c >= 0 && c < 11172) return c;
    if (/[0-9A-Za-z]/.test(word[i])) return null;
  }
  return null;
}

export function particle(word: string, pair: Pair): string {
  const c = lastHangul(word);
  const has = c !== null && c % 28 !== 0;
  switch (pair) {
    case "을/를": return has ? "을" : "를";
    case "이/가": return has ? "이" : "가";
    case "은/는": return has ? "은" : "는";
    case "와/과": return has ? "과" : "와";
    case "으로/로": return has && c! % 28 !== 8 ? "으로" : "로";
  }
}
/** 단어 + 조사 */
export const j = (word: string, pair: Pair) => word + particle(word, pair);
/** '단어' + 조사 (작은따옴표 인용) */
export const jq = (word: string, pair: Pair) => `'${word}'` + particle(word, pair);
