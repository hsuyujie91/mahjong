import { useMemo, useRef, useState } from 'react'
import { BA_XIAN_GUO_HAI_ID, HUA_GANG_ID, HUA_GANG_LOCK_COUNT, PATTERNS, PATTERN_MAP } from '../data/combos.js'
import { applyPatternIds, parseComboInput } from '../utils/comboParser.js'

const COUNT_PATTERNS = PATTERNS.filter((p) => p.type === 'count')

export default function TaiCalculator() {
  const [di, setDi] = useState(100)
  const [tai, setTai] = useState(50)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [counts, setCounts] = useState({})
  const [dealerActive, setDealerActive] = useState(false)
  const [dealerStreak, setDealerStreak] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const huaGangCount = counts[HUA_GANG_ID] || 0
  const isBaXianSelected = selectedSet.has(BA_XIAN_GUO_HAI_ID)
  const isBaXianLocked = huaGangCount >= HUA_GANG_LOCK_COUNT && !isBaXianSelected
  const isHuaGangPlusLocked = isBaXianSelected

  const suggestions = useMemo(() => {
    const q = query.trim()
    if (q === '') return []
    return PATTERNS.filter((p) => {
      if (p.type === 'label') return false
      if (p.type === 'toggle' && selectedSet.has(p.id)) return false
      return p.id.includes(q)
    })
  }, [query, selectedSet])

  const selectedToggleCombos = useMemo(
    () => selectedIds.map((id) => PATTERN_MAP.get(id)).filter(Boolean),
    [selectedIds],
  )

  const dealerTai = dealerActive ? 2 * dealerStreak + 1 : 0
  const toggleTai = selectedToggleCombos.reduce((sum, combo) => sum + combo.tai, 0)
  const countTai = COUNT_PATTERNS.reduce((sum, p) => sum + p.tai * (counts[p.id] || 0), 0)
  const totalTai = dealerTai + toggleTai + countTai
  const totalMoney = Number(di || 0) + totalTai * Number(tai || 0)

  function addOne(id) {
    setSelectedIds((prev) => applyPatternIds(prev, [id]))
  }

  function toggleCombo(id) {
    if (id === BA_XIAN_GUO_HAI_ID && isBaXianLocked) return
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : applyPatternIds(prev, [id])))
  }

  function changeCount(id, delta) {
    if (id === HUA_GANG_ID && delta > 0 && isHuaGangPlusLocked) return
    const max = PATTERN_MAP.get(id).max
    setCounts((prev) => {
      const next = Math.min(max, Math.max(0, (prev[id] || 0) + delta))
      return { ...prev, [id]: next }
    })
  }

  function handleSuggestionClick(pattern) {
    if (pattern.type === 'count') {
      changeCount(pattern.id, 1)
    } else {
      addOne(pattern.id)
    }
    setQuery('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  function submitInput() {
    const { found, leftover, dealerStreak: parsedStreak } = parseComboInput(query)

    if (parsedStreak !== null) {
      setDealerActive(true)
      setDealerStreak(parsedStreak)
    }

    if (found.length > 0) {
      setSelectedIds((prev) => applyPatternIds(prev, found.filter((id) => id !== BA_XIAN_GUO_HAI_ID || !isBaXianLocked)))
    }

    setQuery(leftover)
    setShowSuggestions(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitInput()
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">🀄 計算台數</h2>

      <div className="settings-banner">
        <div className="settings-banner__item">
          <span className="settings-banner__label">底</span>
          <input
            id="di-input"
            type="number"
            min="0"
            step="10"
            value={di}
            onChange={(e) => setDi(e.target.value)}
            className="settings-banner__input"
          />
        </div>
        <div className="settings-banner__item">
          <span className="settings-banner__label">台</span>
          <input
            id="tai-input"
            type="number"
            min="0"
            step="10"
            value={tai}
            onChange={(e) => setTai(e.target.value)}
            className="settings-banner__input"
          />
        </div>
      </div>

      <div className="result-banner">
        <div className="result-banner__item">
          <span className="result-banner__label">總台數</span>
          <span className="result-banner__value">{totalTai} 台</span>
        </div>
        <div className="result-banner__item">
          <span className="result-banner__label">總金額</span>
          <span className="result-banner__value result-banner__value--money">
            ${totalMoney.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="dealer-panel">
        <div className="dealer-panel__col">
          <button
            type="button"
            className={`dealer-panel__toggle ${dealerActive ? 'dealer-panel__toggle--active' : ''}`}
            onClick={() => setDealerActive((a) => !a)}
          >
            <span className="dealer-panel__name">👑 莊家</span>
            <span className="dealer-panel__formula">2n＋1台</span>
          </button>
        </div>
        <div className="dealer-panel__col">
          <div className="dealer-panel__streak">
            <label htmlFor="dealer-streak">連莊次數</label>
            <input
              id="dealer-streak"
              type="number"
              min="0"
              value={dealerStreak}
              onChange={(e) => {
                const n = Math.max(0, Number(e.target.value) || 0)
                setDealerStreak(n)
                setDealerActive(true)
              }}
              className="field__input"
            />
          </div>
        </div>
      </div>

      <div className="field field--autocomplete">
        <label htmlFor="combo-input">輸入胡牌組合</label>
        <div className="combo-input-row">
          <input
            id="combo-input"
            ref={inputRef}
            type="text"
            placeholder="例如：清一色碰碰胡自摸，或連三拉三"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            onKeyDown={handleKeyDown}
            className="field__input"
            autoComplete="off"
          />
          <button type="button" className="combo-input-row__add" onClick={submitInput}>
            加入
          </button>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((combo) => (
              <li key={combo.id}>
                <button type="button" onMouseDown={() => handleSuggestionClick(combo)}>
                  {combo.id}
                  <span className="suggestions__tai">+{combo.tai} 台</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3 className="panel__subtitle">或直接點選組合</h3>
      <div className="combo-grid">
        {PATTERNS.map((combo) =>
          combo.type === 'label' ? (
            <div key={combo.id} className="combo-grid__label">
              <span>{combo.id}</span>
            </div>
          ) : combo.type === 'count' ? (
            <div key={combo.id} className="combo-button combo-button--count">
              <span className="combo-button__name">{combo.id}</span>
              <span className="combo-button__tai">+{combo.tai} 台／張</span>
              <div className="stepper">
                <button type="button" onClick={() => changeCount(combo.id, -1)} aria-label={`減少${combo.id}`}>
                  −
                </button>
                <span className="stepper__value">{counts[combo.id] || 0}</span>
                <button
                  type="button"
                  onClick={() => changeCount(combo.id, 1)}
                  disabled={combo.id === HUA_GANG_ID && (isHuaGangPlusLocked || huaGangCount >= combo.max)}
                  aria-label={`增加${combo.id}`}
                >
                  ＋
                </button>
              </div>
              {combo.id === HUA_GANG_ID && isHuaGangPlusLocked && (
                <span className="combo-button__lock-note">已選八仙過海，鎖定</span>
              )}
            </div>
          ) : (
            <button
              key={combo.id}
              type="button"
              disabled={combo.id === BA_XIAN_GUO_HAI_ID && isBaXianLocked}
              className={`combo-button ${selectedSet.has(combo.id) ? 'combo-button--active' : ''}`}
              onClick={() => toggleCombo(combo.id)}
              title={combo.id === BA_XIAN_GUO_HAI_ID && isBaXianLocked ? '花槓已達 2 次，與八仙過海互斥' : undefined}
            >
              <span className="combo-button__name">{combo.id}</span>
              <span className="combo-button__tai">+{combo.tai} 台</span>
            </button>
          ),
        )}
      </div>
    </section>
  )
}
