import { useEffect, useReducer, useState } from 'react'
import GameSeatTable from './GameSeatTable.jsx'
import {
  WINDS,
  createInitialState,
  diceBonus,
  drawerSeat,
  firstDealerWind,
  gameReducer,
  seatOfWind,
} from '../utils/gameRules.js'

const STORAGE_KEY = 'mahjong-game-state'
const SEAT_PICK_LABELS = ['下方', '右邊', '上方', '左邊']
const REL_CLASS = ['bottom', 'right', 'top', 'left']

function initState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved?.v === 1 && saved.phase) return saved
    }
  } catch {
    // 存檔壞掉就重開一桌
  }
  return createInitialState()
}

export default function GameMode({ onHandResolved, onGameReset }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initState)
  const [viewerOverride, setViewerOverride] = useState(null)
  const [winPickerOpen, setWinPickerOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // 每局結算（胡牌／流局）後，把莊家連莊、骰子加成、胡牌輸贏名單同步給計算台數頁面
  useEffect(() => {
    if (!state.lastHandResult || !onHandResolved) return
    const result = state.lastHandResult
    onHandResolved({
      id: result.id,
      dealerActive: result.dealerContinued,
      dealerStreak: result.dealerStreak,
      diceBonus: result.diceBonus,
      winner: result.type === 'win' ? result.winner : null,
      loser: result.type === 'win' ? result.loser : null,
      selfDraw: result.type === 'win' ? result.selfDraw : false,
      names: state.names,
    })
  }, [state.lastHandResult, onHandResolved, state.names])

  const eastPlayer = state.windOfPlayer.indexOf(0)
  const dealerPlayer = state.dealerWind === null ? -1 : state.windOfPlayer.indexOf(state.dealerWind)

  // 換莊時視角自動跟著新莊家（手機交給莊家擲骰）
  useEffect(() => {
    if (state.phase === 'play' && dealerPlayer >= 0) setViewerOverride(dealerPlayer)
  }, [state.phase, dealerPlayer])

  const viewerPlayer = viewerOverride ?? (dealerPlayer >= 0 ? dealerPlayer : eastPlayer)

  const seated = state.seatOfPlayer.every((s) => s !== null)
  const players = seated
    ? state.names.map((name, i) => ({
        name,
        wind: WINDS[state.windOfPlayer[i]],
        seat: state.seatOfPlayer[i],
      }))
    : []

  function rollDice() {
    const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1)
    const total = dice.reduce((sum, n) => sum + n, 0)
    dispatch({ type: 'SET_ROLL', total, dice })
  }

  function resetGame() {
    if (window.confirm('確定要重新開桌嗎？目前的牌局紀錄會清空。')) {
      setViewerOverride(null)
      dispatch({ type: 'RESET' })
      onGameReset?.()
    }
  }

  function resolveWin(loser) {
    dispatch({ type: 'WIN_HAND', winner: viewerPlayer, loser, selfDraw: loser === null })
    setWinPickerOpen(false)
  }

  function declareDraw() {
    dispatch({ type: 'DRAW_HAND' })
  }

  const diceField = (labelText) => (
    <div className="field">
      <label>{labelText}</label>
      <button type="button" className="dice-roll-button dice-roll-button--full" onClick={rollDice}>
        🎲 擲骰子
      </button>
    </div>
  )

  const bonus = state.lastRollDice && diceBonus(state.lastRollDice)
  const rollDetail = state.lastRollDice && (
    <p className="dice-roll-result">
      🎲 {state.lastRollDice.join(' + ')} ＝ {state.lastRollTotal}
      {bonus && (
        <span className="dice-bonus-badge">
          {bonus.label} {bonus.detail}
        </span>
      )}
    </p>
  )

  // ── 開桌（輸入名字）──
  if (state.phase === 'lobby') {
    return (
      <section className="panel">
        <h2 className="panel__title">🎴 開桌模式</h2>
        <p className="game-hint">
          請依序抽風位 → 選座 → 擲骰定莊，請四位玩家用同一支手機輪流操作，系統會記錄座位、莊家輪替及圈風，設定後畫面下方座位即代表玩家本人。
        </p>
        <div className="game-names">
          {state.names.map((n, i) => (
            <input
              key={i}
              className="field__input"
              value={n}
              maxLength={8}
              onChange={(e) => dispatch({ type: 'SET_NAME', index: i, name: e.target.value })}
              placeholder={`玩家${i + 1}`}
            />
          ))}
        </div>
        <button type="button" className="game-btn game-btn--primary game-btn--full" onClick={() => dispatch({ type: 'START_DRAW' })}>
          開始抽風位
        </button>
      </section>
    )
  }

  // ── 抽風位 ──
  if (state.phase === 'draw') {
    return (
      <section className="panel">
        <h2 className="panel__title">🎴 抽風位（1/3）</h2>
        {state.drawTurn <= 3 ? (
          <p className="game-prompt">
            請 <strong>{state.names[state.drawTurn]}</strong> 點選一張蓋牌（{state.drawTurn + 1}／4）
          </p>
        ) : (
          <p className="game-prompt">四家風位抽好了！</p>
        )}
        <div className="wind-tiles">
          {[0, 1, 2, 3].map((t) =>
            state.tileTakenBy[t] === null ? (
              <button
                key={t}
                type="button"
                className="wind-tile wind-tile--down"
                onClick={() => dispatch({ type: 'DRAW_TILE', tile: t })}
                aria-label={`蓋牌${t + 1}`}
              >
                🎴
              </button>
            ) : (
              <div key={t} className="wind-tile wind-tile--up">
                <span className="wind-tile__wind">{WINDS[state.tileWinds[t]]}</span>
                <span className="wind-tile__owner">{state.names[state.tileTakenBy[t]]}</span>
              </div>
            ),
          )}
        </div>
        {state.drawTurn > 3 && (
          <button type="button" className="game-btn game-btn--primary game-btn--full" onClick={() => dispatch({ type: 'GO_PICK_SEAT' })}>
            下一步：東風玩家選座位
          </button>
        )}
        <div className="game-reset">
          <button type="button" onClick={resetGame}>重新開桌</button>
        </div>
      </section>
    )
  }

  // ── 東風選座 ──
  if (state.phase === 'seat') {
    return (
      <section className="panel">
        <h2 className="panel__title">🪑 選擇座位（2/3）</h2>
        <p className="game-prompt">
          請 <strong>{state.names[eastPlayer]}</strong>（抽到東風）選擇想坐的位子
        </p>
        <div className="seat-table seat-table--game">
          <div className="seat-table__center seat-table__center--wind">東</div>
          {[0, 1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              className={`seat-table__seat seat-table__seat--${REL_CLASS[s]} seat-table__seat--pick`}
              onClick={() => dispatch({ type: 'PICK_SEAT', seat: s })}
            >
              {SEAT_PICK_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="game-reset">
          <button type="button" onClick={resetGame}>重新開桌</button>
        </div>
      </section>
    )
  }

  // ── 擲骰定第一個莊家 ──
  if (state.phase === 'first-dealer') {
    const rolled = state.lastRollTotal !== null
    const firstWind = rolled ? firstDealerWind(state.lastRollTotal) : null
    const firstPlayer = rolled ? state.windOfPlayer.indexOf(firstWind) : -1
    const highlight = rolled ? seatOfWind(firstWind, state.eastSeat) : null
    return (
      <section className="panel">
        <h2 className="panel__title">🎲 擲骰定莊（3/3）</h2>
        <p className="game-prompt">
          四家已就座！請由 <strong>{state.names[eastPlayer]}</strong>（東風）擲骰子
        </p>
        {diceField('骰子點數總和')}
        {rollDetail}
        <GameSeatTable
          players={players}
          viewerSeat={state.seatOfPlayer[eastPlayer]}
          dealerSeat={null}
          highlightSeat={highlight}
          centerText="東"
        />
        {rolled && (
          <div className="banner banner--success">
            👑 {state.names[firstPlayer]}（{WINDS[firstWind]}風）為第一個莊家！
          </div>
        )}
        {rolled && (
          <button
            type="button"
            className="game-btn game-btn--primary game-btn--full"
            onClick={() => dispatch({ type: 'CONFIRM_FIRST_DEALER' })}
          >
            開始對局（東風圈）
          </button>
        )}
        <div className="game-reset">
          <button type="button" onClick={resetGame}>重新開桌</button>
        </div>
      </section>
    )
  }

  // ── 對局中 ──
  const dealerSeat = state.seatOfPlayer[dealerPlayer]
  const viewerSeat = state.seatOfPlayer[viewerPlayer]
  const rolled = state.lastRollTotal !== null
  const drawSeat = rolled ? drawerSeat(dealerSeat, state.lastRollTotal) : null
  const drawPlayer = drawSeat !== null ? state.seatOfPlayer.indexOf(drawSeat) : -1

  return (
    <section className="panel">
      <h2 className="panel__title">🀅 對局中</h2>

      <div className="game-status">
        <span className="game-chip">第 {state.majiang + 1} 將</span>
        <span className="game-chip">{WINDS[state.roundWind]}風圈</span>
        <span className="game-chip game-chip--dealer">👑 莊家：{state.names[dealerPlayer]}</span>
      </div>

      <div className="viewer-switch">
        <span className="viewer-switch__label">我的視角</span>
        {state.names.map((n, i) => (
          <button
            key={i}
            type="button"
            className={i === viewerPlayer ? 'active' : ''}
            onClick={() => setViewerOverride(i)}
          >
            {n}
          </button>
        ))}
      </div>

      {diceField(`骰子點數總和（由莊家 ${state.names[dealerPlayer]} 擲骰）`)}
      {rollDetail}

      <GameSeatTable
        players={players}
        viewerSeat={viewerSeat}
        dealerSeat={dealerSeat}
        highlightSeat={drawSeat}
        centerText={WINDS[state.roundWind]}
      />

      {drawPlayer >= 0 && (
        <div className="banner banner--success">
          由「{state.names[drawPlayer]}」從倒數 {18 - state.lastRollTotal} 張開始抓牌！
        </div>
      )}

      <div className="game-actions">
        <div
          className={`game-dealer-indicator ${state.dealerStreak > 1 ? 'game-dealer-indicator--lit' : ''}`}
        >
          👑 連莊{state.dealerStreak}次
        </div>
      </div>

      {winPickerOpen ? (
        <div className="win-picker">
          <p className="win-picker__title">🀄 {state.names[viewerPlayer]} 胡牌！請選擇放槍者</p>
          <div className="win-picker__grid">
            {[0, 1, 2, 3]
              .filter((i) => i !== viewerPlayer)
              .map((i) => (
                <button key={i} type="button" className="win-picker__btn" onClick={() => resolveWin(i)}>
                  {state.names[i]}
                </button>
              ))}
            <button type="button" className="win-picker__btn win-picker__btn--self" onClick={() => resolveWin(null)}>
              自摸
            </button>
          </div>
          <button type="button" className="win-picker__cancel" onClick={() => setWinPickerOpen(false)}>
            取消，我在亂皮
          </button>
        </div>
      ) : (
        <div className="hand-actions">
          <button type="button" className="game-btn game-btn--primary" onClick={() => setWinPickerOpen(true)}>
            🀄 胡牌
          </button>
          <button type="button" className="game-btn game-btn--ghost" onClick={declareDraw}>
            🌊 流局
          </button>
        </div>
      )}

      <div className="game-reset">
        <button type="button" onClick={resetGame}>重新開桌</button>
      </div>
    </section>
  )
}
