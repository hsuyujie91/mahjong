import { PATTERNS, PATTERN_MAP } from '../data/combos.js'

const CJK_DIGITS = { 零: 0, 〇: 0, 一: 1, 兩: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }

export function cjkNumeralToInt(str) {
  if (/^[0-9]+$/.test(str)) return parseInt(str, 10)

  const tenIndex = str.indexOf('十')
  if (tenIndex === -1) {
    let total = 0
    for (const ch of str) {
      if (CJK_DIGITS[ch] !== undefined) total = total * 10 + CJK_DIGITS[ch]
    }
    return total
  }

  const beforeTen = str.slice(0, tenIndex)
  const afterTen = str.slice(tenIndex + 1)
  const tens = beforeTen === '' ? 1 : (CJK_DIGITS[beforeTen] ?? 1)
  const ones = afterTen === '' ? 0 : (CJK_DIGITS[afterTen] ?? 0)
  return tens * 10 + ones
}

const LIAN_ZHUANG_REGEX = /連([0-9零〇一兩二三四五六七八九十]+)拉([0-9零〇一兩二三四五六七八九十]+)/

// 由長到短排序，避免短名稱（如「門清」）搶先吃掉長名稱（如「門清一摸三」）的字元
// label 只是畫面分隔說明，不能被解析成組合
const SORTED_PATTERN_IDS = PATTERNS.filter((p) => p.type !== 'label')
  .map((p) => p.id)
  .sort((a, b) => b.length - a.length)

function extractPatterns(text) {
  const found = []
  let leftover = ''
  let i = 0
  while (i < text.length) {
    const match = SORTED_PATTERN_IDS.find((name) => text.startsWith(name, i))
    if (match) {
      found.push(match)
      i += match.length
    } else {
      leftover += text[i]
      i += 1
    }
  }
  return { found, leftover }
}

// 解析使用者一次輸入的完整文字（可用空白分隔，也可連續輸入），
// 回傳辨識到的胡牌組合 id、連莊次數（若有輸入「連N拉N」）、以及無法辨識的殘留文字
export function parseComboInput(rawText) {
  let text = rawText.replace(/\s+/g, '')

  let dealerStreak = null
  const lianMatch = text.match(LIAN_ZHUANG_REGEX)
  if (lianMatch) {
    dealerStreak = cjkNumeralToInt(lianMatch[1])
    text = text.slice(0, lianMatch.index) + text.slice(lianMatch.index + lianMatch[0].length)
  }

  const { found, leftover } = extractPatterns(text)
  const uniqueFound = [...new Set(found)]

  return { found: uniqueFound, leftover, dealerStreak }
}

// 依台數由低到高排序後依序加入，確保同一相斥／包含關係群組中，
// 台數最高者會是最後套用的，符合「僅保留最高台數者」的規則
export function applyPatternIds(currentSelected, idsInOrder) {
  const ordered = [...idsInOrder].sort((a, b) => (PATTERN_MAP.get(a)?.tai ?? 0) - (PATTERN_MAP.get(b)?.tai ?? 0))
  let result = [...currentSelected]
  for (const id of ordered) {
    const pattern = PATTERN_MAP.get(id)
    if (!pattern) continue
    result = result.filter((pid) => !pattern.exclude.includes(pid))
    if (!result.includes(id)) result.push(id)
  }
  return result
}
