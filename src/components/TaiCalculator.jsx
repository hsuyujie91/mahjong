import { useEffect, useMemo, useRef, useState } from 'react'
import { PATTERNS, PATTERN_MAP } from '../data/combos.js'
import { applyPatternIds, parseComboInput } from '../utils/comboParser.js'

const COUNT_PATTERNS = PATTERNS.filter((p) => p.type === 'count')
const TOGGLE_PATTERNS = PATTERNS.filter((p) => p.type === 'toggle')

export default function TaiCalculator({
  handSync,
  settledHandId,
  onHandSettled,
  onSettleMoney,
  di,
  tai,
  onDiChange,
  onTaiChange,
}) {
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [counts, setCounts] = useState({})
  const [dealerActive, setDealerActive] = useState(false)
  const [dealerStreak, setDealerStreak] = useState(0)
  const [diceBonusLit, setDiceBonusLit] = useState(null)
  const [zimoConfirmOpen, setZimoConfirmOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  // 開桌模式每局結算（胡牌／流局）後會推送莊家連莊、骰子加成、是否自摸，這裡自動帶入
  useEffect(() => {
    if (!handSync) return
    setDealerActive(handSync.dealerActive)
    setDealerStreak(handSync.dealerStreak)
    setDiceBonusLit(handSync.diceBonus)
    if (handSync.selfDraw) {
      activateToggles(['自摸'])
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== '自摸'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handSync?.id])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // 哪些已選的牌型會鎖住某個計數型（花牌／花槓）不能再加
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
  // 骰盅（+2台）／豹子（×2台）／紅豹（×3台）套用在基礎台數之上
  let totalTai = baseTai
  if (diceBonusLit?.label === '骰盅') totalTai = baseTai + 2
  else if (diceBonusLit?.label === '豹子') totalTai = baseTai * 2
  else if (diceBonusLit?.label === '紅豹') totalTai = baseTai * 3
  const totalMoney = Number(di || 0) + totalTai * Number(tai || 0)

  const pendingSettlement = handSync && handSync.winner !== null && handSync.id !== settledHandId

  // 資金用的自摸判定：若原本就沒有記錄放槍者（真自摸，loser 為 null），沒有人可以扣款，
  // 只能維持自摸算法；有放槍者時才依「自摸」勾選狀態決定要用自摸還是放槍的算法（供手動更正用）
  const selfDrawForMoney = handSync && handSync.loser === null ? true : selectedSet.has('自摸')

  // 一般玩家自摸時，莊家（若非贏家）要多付一台的錢給自摸玩家
  const dealerSurcharge =
    pendingSettlement && selfDrawForMoney && handSync.dealerPlayer >= 0 && handSync.dealerPlayer !== handSync.winner
      ? { from: handSync.dealerPlayer, to: handSync.winner, amount: Number(tai || 0) }
      : null

  // 結算：清空已勾選的組合台數（花牌／花槓計數、莊家勾選、骰子加成燈號也一併歸零），
  // 底、台金額、連莊次數設定過就不會被結算動到。
  // 若這局有勝負（開桌模式同步過來的最新一局尚未結算過金額），順便自動過帳：
  // 自摸由贏家收三家的錢，放槍只有放槍者付錢給贏家，莊家自摸時另外多收一台差額
  function settleUp() {
    if (pendingSettlement) {
      onSettleMoney?.({
        winner: handSync.winner,
        loser: handSync.loser,
        selfDraw: selfDrawForMoney,
        amount: totalMoney,
        dealerSurcharge,
      })
      onHandSettled?.(handSync.id)
    }
    setSelectedIds([])
    setCounts({})
    setDealerActive(false)
    setDiceBonusLit(null)
  }

  // 啟用一批牌型：套用互斥／連帶規則，並將與其相斥的花牌、花槓計數歸零
  // （選取牌型永遠允許，不會被既有的計數鎖住 —— 鎖住的是計數的「＋」，見 lockingTogglesFor）
  function activateToggles(ids) {
    const validIds = ids.filter((id) => PATTERN_MAP.get(id))
    if (validIds.length === 0) return

    const countsToReset = new Set()
    validIds.forEach((id) => {
      if (selectedSet.has(id)) return
      const pattern = PATTERN_MAP.get(id)
      pattern.excludeCounts?.forEach((cid) => countsToReset.add(cid))
    })

    setSelectedIds((prev) => applyPatternIds(prev, validIds))
    if (countsToReset.size > 0) {
      setCounts((prev) => {
        const next = { ...prev }
        countsToReset.forEach((cid) => {
          next[cid] = 0
        })
        return next
      })
    }
  }

  function toggleCombo(id) {
    if (selectedSet.has(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id))
      return
    }
    activateToggles([id])
  }

  // 「自摸」牽動資金算法，取消或補選都要先確認，避免誤觸改變輸贏金額
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

  function confirmZimoNo() {
    setZimoConfirmOpen(false)
  }

  function changeCount(id, delta) {
    if (delta > 0 && lockingTogglesFor(id).length > 0) return
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
      activateToggles([pattern.id])
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
            onChange={(e) => onDiChange?.(e.target.value)}
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
            onChange={(e) => onTaiChange?.(e.target.value)}
            className="settings-banner__input"
          />
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

      <div className="result-banner">
        <div className="result-banner__grid">
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
        <div className="modal-overlay" onClick={confirmZimoNo}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="modal-card__title">你幹嘛 剛剛真的有自摸嗎？</p>
            <div className="zimo-confirm__actions">
              <button type="button" className="zimo-confirm__yes" onClick={confirmZimoYes}>
                真的自摸
              </button>
              <button type="button" className="zimo-confirm__no" onClick={confirmZimoNo}>
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
          if (combo.type === 'break') {
            return <div key={combo.id} className="combo-grid__break" />
          }

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
                  <span className="combo-button__lock-note">
                    已選{lockedBy.map((p) => p.id).join('、')}，鎖定
                  </span>
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
