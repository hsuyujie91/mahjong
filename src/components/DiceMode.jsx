import { useState } from 'react'
import GameSeatTable from './GameSeatTable.jsx'
import { WINDS, createDiceState, diceBonus, drawerSeat, seatWind } from '../utils/gameRules.js'
import { dispatchDice } from '../hooks/useRoom.js'

const SEAT_LABELS = ['下方', '右邊', '上方', '左邊']

export default function DiceMode({ room, roomCode }) {
  const dice = room.dice
  const [manual, setManual] = useState('')
  const [nameEditOpen, setNameEditOpen] = useState(false)

  function dispatch(action) {
    return dispatchDice(roomCode, action)
  }

  function rollRandom() {
    const d = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1)
    dispatch({ type: 'DICE_ROLL', total: d.reduce((s, n) => s + n, 0), dice: d })
    setManual('')
  }

  function submitManual(v) {
    setManual(v)
    const total = Number(v)
    if (Number.isInteger(total) && total >= 3 && total <= 18) {
      dispatch({ type: 'DICE_ROLL', total, dice: null })
    }
  }

  // ── 設定：輸入名字、選第一位莊家 ──
  if (dice.phase !== 'play') {
    return (
      <section className="panel">
        <h2 className="panel__title">🎲 擲骰</h2>
        <p className="game-hint">
          純擲骰工具：輸入四位玩家、指定第一位莊家後即可開始。之後任何人都能擲骰，系統會顯示抓牌位子、骰盅、莊家與圈風。
        </p>
        <div className="game-names">
          {dice.names.map((n, i) => (
            <input
              key={i}
              className="field__input"
              value={n}
              maxLength={8}
              onChange={(e) => dispatch({ type: 'DICE_SET_NAME', index: i, name: e.target.value })}
              placeholder={`玩家${i + 1}`}
            />
          ))}
        </div>
        <p className="game-prompt">指定第一位莊家：</p>
        <div className="dice-dealer-pick">
          {dice.names.map((n, i) => (
            <button key={i} type="button" className="game-btn game-btn--ghost" onClick={() => dispatch({ type: 'DICE_START', seat: i })}>
              👑 {n}
            </button>
          ))}
        </div>
      </section>
    )
  }

  // ── 擲骰進行中 ──
  const dealerSeat = dice.dealerSeat
  const rolled = dice.lastRollTotal != null
  const drawSeat = rolled ? drawerSeat(dealerSeat, dice.lastRollTotal) : null
  const players = dice.names.map((name, i) => ({ name, wind: WINDS[seatWind(i, dealerSeat)], seat: i }))
  const bonus = dice.lastRollDice && diceBonus(dice.lastRollDice)

  return (
    <section className="panel">
      <h2 className="panel__title">🎲 擲骰</h2>

      <div className="game-status">
        <span className="game-chip">第 {dice.majiang + 1} 將</span>
        <span className="game-chip">{WINDS[dice.roundWind]}風圈</span>
        <span className="game-chip game-chip--dealer">👑 莊家：{dice.names[dealerSeat]}</span>
        <button type="button" className="game-chip game-chip--action" onClick={() => setNameEditOpen((v) => !v)}>
          ✏️ 改名
        </button>
      </div>

      {nameEditOpen && (
        <div className="name-editor">
          <p className="name-editor__title">改暱稱（任何人都能改所有人的）</p>
          <div className="game-names">
            {dice.names.map((n, i) => (
              <input
                key={i}
                className="field__input"
                value={n}
                maxLength={8}
                onChange={(e) => dispatch({ type: 'DICE_SET_NAME', index: i, name: e.target.value })}
                placeholder={`玩家${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label>骰子點數總和</label>
        <div className="dice-input-row">
          <input
            type="number"
            min="3"
            max="18"
            className="field__input"
            placeholder="手動輸入總和"
            value={manual}
            onChange={(e) => submitManual(e.target.value)}
          />
          <button type="button" className="dice-roll-button" onClick={rollRandom}>
            🎲 擲骰子
          </button>
        </div>
      </div>

      {rolled && (
        <p className="dice-roll-result">
          🎲 {dice.lastRollDice ? `${dice.lastRollDice.join(' + ')} ＝ ` : '總和 '}
          {dice.lastRollTotal}
          {bonus && (
            <span className="dice-bonus-badge">
              {bonus.label} {bonus.detail}
            </span>
          )}
        </p>
      )}

      <GameSeatTable
        players={players}
        viewerSeat={0}
        dealerSeat={dealerSeat}
        highlightSeat={drawSeat}
        centerText={WINDS[dice.roundWind]}
      />

      {drawSeat !== null && (
        <div className="banner banner--success">
          由「{dice.names[drawSeat]}」（{SEAT_LABELS[drawSeat]}）從倒數 {18 - dice.lastRollTotal} 張開始抓牌！
        </div>
      )}

      <div className="game-actions">
        <div className={`game-dealer-indicator ${dice.dealerStreak > 1 ? 'game-dealer-indicator--lit' : ''}`}>
          👑 連莊{dice.dealerStreak}次
        </div>
      </div>

      <div className="dice-buttons">
        <button type="button" className="game-btn game-btn--primary" onClick={() => dispatch({ type: 'DICE_STAY' })}>
          🔥 連莊
        </button>
        <button type="button" className="game-btn game-btn--ghost" onClick={() => dispatch({ type: 'DICE_STAY' })}>
          🌊 流局
        </button>
        <button type="button" className="game-btn game-btn--ghost" onClick={() => dispatch({ type: 'DICE_PASS' })}>
          🔄 下莊
        </button>
      </div>

      <div className="game-reset">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('重新設定擲骰（重選莊家、名字）？')) dispatch({ type: 'DICE_RESET' })
          }}
        >
          重新設定
        </button>
      </div>
    </section>
  )
}
