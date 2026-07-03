import { useMemo, useRef, useState } from 'react'
import { PATTERNS, PATTERN_MAP } from '../data/combos.js'
import { applyPatternIds, parseComboInput } from '../utils/comboParser.js'
import { handResultToTaiSync } from '../utils/gameRules.js'
import { claimSettlement, patchTai, setTai, settleFunds } from '../hooks/useRoom.js'

const COUNT_PATTERNS = PATTERNS.filter((p) => p.type === 'count')
const TOGGLE_PATTERNS = PATTERNS.filter((p) => p.type === 'toggle')

export default function TaiCalculator({ room, roomCode }) {
  const tai = room.tai
  const { di, tai: taiUnit, selectedIds, counts, dealerActive, dealerStreak, diceBonusLit } = tai

  const [query, setQuery] = useState('')
  const [zimoConfirmOpen, setZimoConfirmOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  const handSync = handResultToTaiSync(room.game.lastHandResult, room.game.names)
  const settledHandId = room.settledHandId

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  function lockingTogglesFor(countId) {
    return TOGGLE_PATTERNS.filter((p) => p.excludeCounts?.includes(countId) && selectedSet.has(p.id))
  }

  const suggestions = useMemo(() => {
    const q = query.trim()
    if (q === '') return []
    return PATTERNS.filter((p) => {
      if (p.type === 'label' || p.type === 'break') return false
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
  const baseTai = dealerTai + toggleTai + countTai
  let totalTai = baseTai
  if (diceBonusLit?.label === '骰盅') totalTai = baseTai + 2
  else if (diceBonusLit?.label === '豹子') totalTai = baseTai * 2
  else if (diceBonusLit?.label === '紅豹') totalTai = baseTai * 3
  const totalMoney = Number(di || 0) + totalTai * Number(taiUnit || 0)

  const pendingSettlement = handSync && handSync.winner !== null && handSync.id !== settledHandId
  const selfDrawForMoney = handSync && handSync.loser === null ? true : selectedSet.has('自摸')
  const dealerSurcharge =
    pendingSettlement && selfDrawForMoney && handSync.dealerPlayer >= 0 && handSync.dealerPlayer !== handSync.winner
      ? { from: handSync.dealerPlayer, to: handSync.winner, amount: Number(taiUnit || 0) }
      : null

  // 啟用一批牌型（套用互斥規則、歸零相斥的花牌計數），計算完寫回共享狀態
  function activateToggles(ids) {
    const validIds = ids.filter((id) => PATTERN_MAP.get(id))
    if (validIds.length === 0) return
    const nextSelected = applyPatternIds(selectedIds, validIds)
    const nextCounts = { ...counts }
    validIds.forEach((id) => {
      if (selectedSet.has(id)) return
      PATTERN_MAP.get(id).excludeCounts?.forEach((cid) => {
        nextCounts[cid] = 0
      })
    })
    patchTai(roomCode, { selectedIds: nextSelected, counts: nextCounts })
  }

  function toggleCombo(id) {
    if (selectedSet.has(id)) {
      patchTai(roomCode, { selectedIds: selectedIds.filter((x) => x !== id) })
      return
    }
    activateToggles([id])
  }

  function handleZimoClick() {
    if (selectedSet.has('自摸')) {
      if (window.confirm('確定要取消自摸嗎？')) toggleCombo('自摸')
      return
    }
    if (handSync && handSync.winner !== null && !handSync.selfDraw) {
      setZimoConfirmOpen(true)
      return
    }
    toggleCombo('自摸')
  }

  function confirmZimoYes() {
    toggleCombo('自摸')
    setZimoConfirmOpen(false)
  }

  function changeCount(id, delta) {
    if (delta > 0 && lockingTogglesFor(id).length > 0) return
    const max = PATTERN_MAP.get(id).max
    const next = Math.min(max, Math.max(0, (counts[id] || 0) + delta))
    patchTai(roomCode, { counts: { ...counts, [id]: next } })
  }

  function handleSuggestionClick(pattern) {
    if (pattern.type === 'count') changeCount(pattern.id, 1)
    else activateToggles([pattern.id])
    setQuery('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  function submitInput() {
    const { found, leftover, dealerStreak: parsedStreak } = parseComboInput(query)
    if (parsedStreak !== null) patchTai(roomCode, { dealerActive: true, dealerStreak: parsedStreak })
    const toggleIds = found.filter((id) => PATTERN_MAP.get(id)?.type === 'toggle')
    const countIds = found.filter((id) => PATTERN_MAP.get(id)?.type === 'count')
    if (toggleIds.length > 0) activateToggles(toggleIds)
    countIds.forEach((id) => changeCount(id, 1))
    setQuery(leftover)
    setShowSuggestions(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitInput()
    }
  }

  // 結算：先用交易認領這局的結算權（避免多台重複扣款）→ 過帳資金 → 清空台數狀態
  async function settleUp() {
    if (pendingSettlement) {
      const won = await claimSettlement(roomCode, handSync.id)
      if (won) {
        const amount = totalMoney
        await settleFunds(roomCode, (funds) => {
          const next = [...funds]
          if (selfDrawForMoney) {
            next[handSync.winner] += amount * 3
            for (let i = 0; i < 4; i++) if (i !== handSync.winner) next[i] -= amount
          } else {
            next[handSync.winner] += amount
            next[handSync.loser] -= amount
          }
          if (dealerSurcharge) {
            next[dealerSurcharge.from] -= dealerSurcharge.amount
            next[dealerSurcharge.to] += dealerSurcharge.amount
          }
          return next
        })
      }
    }
    setTai(roomCode, {
      di,
      tai: taiUnit,
      selectedIds: [],
      counts: {},
      dealerActive: false,
      dealerStreak,
      diceBonusLit: null,
    })
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
            onChange={(e) => patchTai(roomCode, { di: e.target.value })}
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
            value={taiUnit}
            onChange={(e) => patchTai(roomCode, { tai: e.target.value })}
            className="settings-banner__input"
          />
        </div>
      </div>

      <div className="dealer-panel">
        <div className="dealer-panel__col">
          <button
            type="button"
            className={`dealer-panel__toggle ${dealerActive ? 'dealer-panel__toggle--active' : ''}`}
            onClick={() => patchTai(roomCode, { dealerActive: !dealerActive })}
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
                patchTai(roomCode, { dealerStreak: n, dealerActive: true })
              }}
              className="field__input"
            />
          </div>
        </div>
      </div>

      <div className="result-banner">
        <div className="result-banner__grid">
          <div className="result-banner__item">
            <span className="result-banner__label">總台數</span>
            <span className="result-banner__value">{totalTai} 台</span>
          </div>
          <div className="result-banner__item">
            <span className="result-banner__label">總金額</span>
            <span className="result-banner__value result-banner__value--money">${totalMoney.toLocaleString()}</span>
          </div>
        </div>
        <button type="button" className="result-banner__settle" onClick={settleUp}>
          💰 結算
        </button>
      </div>

      {pendingSettlement && (
        <p className="settle-hint">
          結算後將自動記帳：
          {selfDrawForMoney
            ? `${handSync.names[handSync.winner]} 自摸，其餘三家各付 $${totalMoney.toLocaleString()}`
            : `${handSync.names[handSync.loser]} 放槍，付 $${totalMoney.toLocaleString()} 給 ${handSync.names[handSync.winner]}`}
          {dealerSurcharge &&
            `｜莊家 ${handSync.names[dealerSurcharge.from]} 另付 $${dealerSurcharge.amount.toLocaleString()} 給贏家`}
        </p>
      )}

      {zimoConfirmOpen && (
        <div className="modal-overlay" onClick={() => setZimoConfirmOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="modal-card__title">你幹嘛 剛剛真的有自摸嗎？</p>
            <div className="zimo-confirm__actions">
              <button type="button" className="zimo-confirm__yes" onClick={confirmZimoYes}>
                真的自摸
              </button>
              <button type="button" className="zimo-confirm__no" onClick={() => setZimoConfirmOpen(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`dice-bonus-panel ${diceBonusLit ? 'dice-bonus-panel--lit' : ''}`}>
        <span className="dice-bonus-panel__name">🎲 骰盅／豹子／紅豹</span>
        <span className="dice-bonus-panel__detail">
          {diceBonusLit ? `${diceBonusLit.label} ${diceBonusLit.detail}` : '尚未出現'}
        </span>
      </div>

      <h3 className="panel__subtitle">直接點選組合</h3>
      <div className="combo-grid">
        {PATTERNS.map((combo) => {
          if (combo.type === 'break') return <div key={combo.id} className="combo-grid__break" />
          if (combo.type === 'label') {
            return (
              <div key={combo.id} className="combo-grid__label">
                <span>{combo.id}</span>
              </div>
            )
          }
          if (combo.type === 'count') {
            const lockedBy = lockingTogglesFor(combo.id)
            const isLocked = lockedBy.length > 0
            return (
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
                    disabled={isLocked || (counts[combo.id] || 0) >= combo.max}
                    aria-label={`增加${combo.id}`}
                  >
                    ＋
                  </button>
                </div>
                {isLocked && (
                  <span className="combo-button__lock-note">已選{lockedBy.map((p) => p.id).join('、')}，鎖定</span>
                )}
              </div>
            )
          }
          const isSelected = selectedSet.has(combo.id)
          return (
            <button
              key={combo.id}
              type="button"
              className={`combo-button ${isSelected ? 'combo-button--active' : ''}`}
              onClick={() => (combo.id === '自摸' ? handleZimoClick() : toggleCombo(combo.id))}
            >
              <span className="combo-button__name">{combo.id}</span>
              <span className="combo-button__tai">+{combo.tai} 台</span>
            </button>
          )
        })}
      </div>

      <div className="field field--autocomplete">
        <label htmlFor="combo-input">或輸入胡牌組合</label>
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
    </section>
  )
}
