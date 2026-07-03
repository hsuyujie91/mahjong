import { useEffect, useRef, useState } from 'react'
import GameSeatTable from './GameSeatTable.jsx'
import { WINDS, diceBonus, drawerSeat, firstDealerWind, handResultToTaiSync, seatOfWind } from '../utils/gameRules.js'
import { dispatchGame, hydrateGame, resetRoom, setTai } from '../hooks/useRoom.js'

const SEAT_PICK_LABELS = ['下方', '右邊', '上方', '左邊']
const REL_CLASS = ['bottom', 'right', 'top', 'left']

export default function GameMode({ room, roomCode, mySeat, onLeave }) {
  const state = room.game
  const [winPickerOpen, setWinPickerOpen] = useState(false)
  const [pendingWinChoice, setPendingWinChoice] = useState(null)
  const [drawConfirmOpen, setDrawConfirmOpen] = useState(false)
  const winPickerRef = useRef(null)
  const drawConfirmRef = useRef(null)

  useEffect(() => {
    if (!winPickerOpen) return
    function handleClickOutside(e) {
      if (winPickerRef.current && !winPickerRef.current.contains(e.target)) cancelWinPicker()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [winPickerOpen])

  useEffect(() => {
    if (!drawConfirmOpen) return
    function handleClickOutside(e) {
      if (drawConfirmRef.current && !drawConfirmRef.current.contains(e.target)) setDrawConfirmOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [drawConfirmOpen])

  const eastPlayer = state.windOfPlayer.indexOf(0)
  const dealerPlayer = state.dealerWind === null ? -1 : state.windOfPlayer.indexOf(state.dealerWind)
  // 觀戰者（沒認領座位）視角預設看莊家
  const viewerPlayer = mySeat != null ? mySeat : dealerPlayer >= 0 ? dealerPlayer : 0

  const seated = state.seatOfPlayer.every((s) => s !== null)
  const players = seated
    ? state.names.map((name, i) => ({ name, wind: WINDS[state.windOfPlayer[i]], seat: state.seatOfPlayer[i] }))
    : []

  function dispatch(action) {
    return dispatchGame(roomCode, action)
  }

  function rollDice() {
    const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1)
    const total = dice.reduce((sum, n) => sum + n, 0)
    dispatch({ type: 'SET_ROLL', total, dice })
  }

  function resetGame() {
    if (window.confirm('確定要重新開桌嗎？目前的牌局紀錄會清空（座位保留）。')) {
      resetRoom(roomCode)
    }
  }

  // 胡牌／流局結算後，把莊家連莊、骰子加成、自摸等資訊寫進共享的計算台數狀態
  async function syncTaiFromResult(txnResult) {
    const game = hydrateGame(txnResult?.snapshot?.val())
    const sync = handResultToTaiSync(game.lastHandResult, game.names)
    if (!sync) return
    await setTai(roomCode, {
      di: room.tai.di,
      tai: room.tai.tai,
      dealerActive: sync.dealerActive,
      dealerStreak: sync.dealerStreak,
      diceBonusLit: sync.diceBonus,
      selectedIds: sync.selfDraw ? ['自摸'] : [],
      counts: {},
    })
  }

  function openWinPicker() {
    setPendingWinChoice(null)
    setWinPickerOpen(true)
  }

  function cancelWinPicker() {
    setWinPickerOpen(false)
    setPendingWinChoice(null)
  }

  async function confirmWin() {
    if (pendingWinChoice === null || mySeat == null) return
    const loser = pendingWinChoice === 'self' ? null : pendingWinChoice
    const res = await dispatch({ type: 'WIN_HAND', winner: mySeat, loser, selfDraw: pendingWinChoice === 'self' })
    setWinPickerOpen(false)
    setPendingWinChoice(null)
    await syncTaiFromResult(res)
  }

  async function confirmDraw() {
    const res = await dispatch({ type: 'DRAW_HAND' })
    setDrawConfirmOpen(false)
    await syncTaiFromResult(res)
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

  const roomBar = (
    <div className="room-bar">
      <span className="room-bar__code">房號 {roomCode}</span>
      {mySeat != null && <span className="room-bar__me">你是 {state.names[mySeat]}</span>}
      <button type="button" className="room-bar__leave" onClick={onLeave}>
        離開
      </button>
    </div>
  )

  // ── 抽風位 ──（輪到自己時才能抽）
  if (state.phase === 'draw') {
    const myTurn = mySeat != null && state.drawTurn === mySeat
    return (
      <section className="panel">
        {roomBar}
        <h2 className="panel__title">🎴 抽風位（1/3）</h2>
        {state.drawTurn <= 3 ? (
          <p className="game-prompt">
            {myTurn ? (
              <>
                輪到你了，<strong>{state.names[state.drawTurn]}</strong> 請點一張蓋牌（{state.drawTurn + 1}／4）
              </>
            ) : (
              <>
                等待 <strong>{state.names[state.drawTurn]}</strong> 抽風位（{state.drawTurn + 1}／4）
              </>
            )}
          </p>
        ) : (
          <p className="game-prompt">四家風位抽好了！</p>
        )}
        <div className="wind-tiles">
          {[0, 1, 2, 3].map((t) =>
            state.tileTakenBy[t] == null ? (
              <button
                key={t}
                type="button"
                className="wind-tile wind-tile--down"
                disabled={!myTurn}
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

  // ── 東風選座 ──（只有東風玩家能選）
  if (state.phase === 'seat') {
    const isEast = mySeat === eastPlayer
    return (
      <section className="panel">
        {roomBar}
        <h2 className="panel__title">🪑 選擇座位（2/3）</h2>
        <p className="game-prompt">
          {isEast ? (
            <>請 <strong>{state.names[eastPlayer]}</strong>（你，抽到東風）選擇想坐的位子</>
          ) : (
            <>等待 <strong>{state.names[eastPlayer]}</strong>（東風）選位子</>
          )}
        </p>
        <div className="seat-table seat-table--game">
          <div className="seat-table__center seat-table__center--wind">東</div>
          {[0, 1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              className={`seat-table__seat seat-table__seat--${REL_CLASS[s]} seat-table__seat--pick`}
              disabled={!isEast}
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

  // ── 擲骰定第一個莊家 ──（只有東風玩家能擲、能確認）
  if (state.phase === 'first-dealer') {
    const isEast = mySeat === eastPlayer
    const rolled = state.lastRollTotal !== null
    const firstWind = rolled ? firstDealerWind(state.lastRollTotal) : null
    const firstPlayer = rolled ? state.windOfPlayer.indexOf(firstWind) : -1
    const highlight = rolled ? seatOfWind(firstWind, state.eastSeat) : null
    return (
      <section className="panel">
        {roomBar}
        <h2 className="panel__title">🎲 擲骰定莊（3/3）</h2>
        <p className="game-prompt">
          {isEast ? (
            <>四家已就座！請由你（<strong>{state.names[eastPlayer]}</strong>，東風）擲骰子</>
          ) : (
            <>等待 <strong>{state.names[eastPlayer]}</strong>（東風）擲骰定莊</>
          )}
        </p>
        {isEast ? diceField('骰子點數總和') : <div className="waiting-note">🎲 等待莊家擲骰…</div>}
        {rollDetail}
        <GameSeatTable
          players={players}
          viewerSeat={state.seatOfPlayer[viewerPlayer]}
          dealerSeat={null}
          highlightSeat={highlight}
          centerText="東"
        />
        {rolled && (
          <div className="banner banner--success">👑 {state.names[firstPlayer]}（{WINDS[firstWind]}風）為第一個莊家！</div>
        )}
        {rolled && isEast && (
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
  const isDealer = mySeat === dealerPlayer
  const canAct = mySeat != null

  return (
    <section className="panel">
      {roomBar}
      <h2 className="panel__title">🀅 對局中</h2>

      <div className="game-status">
        <span className="game-chip">第 {state.majiang + 1} 將</span>
        <span className="game-chip">{WINDS[state.roundWind]}風圈</span>
        <span className="game-chip game-chip--dealer">👑 莊家：{state.names[dealerPlayer]}</span>
      </div>

      {isDealer ? (
        diceField(`骰子點數總和（你是莊家 ${state.names[dealerPlayer]}）`)
      ) : (
        <div className="waiting-note">🎲 等待莊家 {state.names[dealerPlayer]} 擲骰…</div>
      )}
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

      {winPickerOpen && (
        <div className="win-picker" ref={winPickerRef}>
          <p className="win-picker__title">🀄 {state.names[viewerPlayer]} 胡牌！請選擇放槍者</p>
          <div className="win-picker__grid">
            {[...[0, 1, 2, 3].filter((i) => i !== viewerPlayer), 'self'].map((choice) => {
              const isSelected = pendingWinChoice === choice
              const isDimmed = pendingWinChoice !== null && !isSelected
              return (
                <button
                  key={choice}
                  type="button"
                  className={`win-picker__btn ${isSelected ? 'win-picker__btn--selected' : ''} ${isDimmed ? 'win-picker__btn--disabled' : ''}`}
                  onClick={() => setPendingWinChoice(choice)}
                >
                  {choice === 'self' ? '自摸' : state.names[choice]}
                </button>
              )
            })}
          </div>
          {pendingWinChoice !== null && (
            <button type="button" className="win-picker__confirm" onClick={confirmWin}>
              ✅ 確定
            </button>
          )}
          <button type="button" className="win-picker__cancel" onClick={cancelWinPicker}>
            取消 我在亂皮
          </button>
        </div>
      )}

      {drawConfirmOpen && (
        <div className="win-picker" ref={drawConfirmRef}>
          <p className="win-picker__title">🌊 確認流局？</p>
          <button type="button" className="win-picker__confirm" onClick={confirmDraw}>
            ✅ 確定
          </button>
          <button type="button" className="win-picker__cancel" onClick={() => setDrawConfirmOpen(false)}>
            取消 我在亂皮
          </button>
        </div>
      )}

      {canAct && !winPickerOpen && !drawConfirmOpen && (
        <button type="button" className="game-btn game-btn--primary game-btn--full" onClick={openWinPicker}>
          🀄 我胡了
        </button>
      )}

      <div className="game-actions">
        <div className={`game-dealer-indicator ${state.dealerStreak > 1 ? 'game-dealer-indicator--lit' : ''}`}>
          👑 連莊{state.dealerStreak}次
        </div>
        {canAct && !winPickerOpen && !drawConfirmOpen && (
          <button type="button" className="game-btn game-btn--ghost" onClick={() => setDrawConfirmOpen(true)}>
            🌊 流局
          </button>
        )}
      </div>

      <div className="game-reset">
        <button type="button" onClick={resetGame}>重新開桌</button>
      </div>
    </section>
  )
}
