import { useMemo, useState } from 'react'
import SeatTable from './SeatTable.jsx'

const SEAT_RESULT = {
  1: { label: '莊家', emoji: '👑' },
  2: { label: '莊家右邊', emoji: '➡️' },
  3: { label: '莊家對面', emoji: '⬆️' },
  4: { label: '莊家左邊', emoji: '⬅️' },
}

function evaluateDice(rawValue) {
  if (rawValue.trim() === '') {
    return { status: 'empty' }
  }

  const value = Number(rawValue)

  if (!Number.isInteger(value) || value < 3) {
    return { status: 'invalid' }
  }

  if (value > 18) {
    return { status: 'too-large' }
  }

  const remainder = value % 4 === 0 ? 4 : value % 4
  return { status: 'ok', remainder, value }
}

export default function DiceSeatCalculator() {
  const [input, setInput] = useState('')
  const [lastRoll, setLastRoll] = useState(null)

  const result = useMemo(() => evaluateDice(input), [input])

  function rollDice() {
    const rolls = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1)
    setLastRoll(rolls)
    setInput(String(rolls.reduce((sum, n) => sum + n, 0)))
  }

  return (
    <section className="panel">
      <h2 className="panel__title">🎲 算抓牌位子</h2>

      <div className="field">
        <label htmlFor="dice-input">骰子點數總和</label>
        <div className="dice-input-row">
          <input
            id="dice-input"
            type="number"
            inputMode="numeric"
            min="3"
            max="18"
            placeholder="例如：11"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setLastRoll(null)
            }}
            className="field__input field__input--dice"
          />
          <button type="button" className="dice-roll-button" onClick={rollDice}>
            🎲 擲骰子
          </button>
        </div>
      </div>

      {result.status === 'too-large' && (
        <div className="banner banner--error">數字過大，請重骰！骰子總和最多是 18。</div>
      )}
      {result.status === 'invalid' && (
        <div className="banner banner--error">請輸入 3～18 之間的整數。</div>
      )}
      {result.status === 'ok' && (
        <div className="banner banner--success">
          {SEAT_RESULT[result.remainder].emoji} 由「{SEAT_RESULT[result.remainder].label}」抓牌！
        </div>
      )}

      <SeatTable activeSeat={result.status === 'ok' ? result.remainder : null} />

      {lastRoll && (
        <p className="dice-roll-result">
          🎲 {lastRoll.join(' + ')} ＝ {lastRoll.reduce((sum, n) => sum + n, 0)}
        </p>
      )}
    </section>
  )
}
