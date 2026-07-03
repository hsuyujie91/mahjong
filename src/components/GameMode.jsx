import { useEffect, useRef, useState } from 'react'
import GameSeatTable from './GameSeatTable.jsx'
import { WINDS, diceBonus, drawerSeat, firstDealerWind, handResultToTaiSync, seatOfWind } from '../utils/gameRules.js'
import { claimSeat, dispatchGame, hydrateGame, resetRoom, setTai } from '../hooks/useRoom.js'

const SEAT_PICK_LABELS = ['下方', '右邊', '上方', '左邊']
const REL_CLASS = ['bottom', 'right', 'top', 'left']

export default function GameMode({ room, roomCode, uid, mySeat, onLeave }) {
  const state = room.game
  const claims = room.claims || {}
  const amHost = room.host === uid

  const [viewerOverride, setViewerOverride] = useState(null)
  const [manual, setManual] = useState('')
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

  // 我能操作哪些座位：自己認領的，或（身為房主）尚未被別人認領的
  const controllable = (seat) => claims[seat] === uid || (claims[seat] == null && amHost)
  const controllableSeats = [0, 1, 2, 3].filter(controllable)
  const canAct = controllableSeats.length > 0

  const eastPlayer = state.windOfPlayer.indexOf(0)
  const dealerPlayer = state.dealerWind === null ? -1 : state.windOfPlayer.indexOf(state.dealerWind)

  let viewerPlayer
  if (viewerOverride != null && controllable(viewerOverride)) viewerPlayer = viewerOverride
  else if (mySeat != null) viewerPlayer = mySeat
  else if (controllableSeats.length) viewerPlayer = controllableSeats[0]
  else viewerPlayer = dealerPlayer >= 0 ? dealerPlayer : 0

  const seated = state.seatOfPlayer.every((s) => s !== null)
  const players = seated
    ? state.names.map((name, i) => ({ name, wind: WINDS[state.windOfPlayer[i]], seat: state.seatOfPlayer[i] }))
    : []

  function dispatch(action) {
    return dispatchGame(roomCode, action)
  }

  function rollDice() {
    const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1)
    dispatch({ type: 'SET_ROLL', total: dice.reduce((s, n) => s + n, 0), dice })
    setManual('')
  }

  function submitManual(v) {
    setManual(v)
    const total = Number(v)
    if (Number.isInteger(total) && total >= 3 && total <= 18) dispatch({ type: 'SET_ROLL', total, dice: null })
  }

  function resetGame() {
    if (window.confirm('確定要重新開桌嗎？目前的牌局紀錄會清空（座位保留）。')) resetRoom(roomCode)
  }

  async function claimMySeat(seat) {
    try {
      await claimSeat(roomCode, seat, uid, state.names[seat] || `玩家${seat + 1}`)
      setViewerOverride(seat)
    } catch (e) {
      window.alert(e.message || '這個座位已被選走')
    }
  }

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
    if (pendingWinChoice === null) return
    const loser = pendingWinChoice === 'self' ? null : pendingWinChoice
    const res = await dispatch({ type: 'WIN_HAND', winner: viewerPlayer, loser, selfDraw: pendingWinChoice === 'self' })
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
        <button type="button" className="dice-roll-button" onClick={rollDice}>
          🎲 擲骰子
        </button>
      </div>
    </div>
  )

  const bonus = state.lastRollDice && diceBonus(state.lastRollDice)
  const rollDetail = state.lastRollTotal != null && (
    <p className="dice-roll-result">
      🎲 {state.lastRollDice ? `${state.lastRollDice.join(' + ')} ＝ ` : '總和 '}
      {state.lastRollTotal}
      {bonus && <span className="dice-bonus-badge">{bonus.label} {bonus.detail}</span>}
    </p>
  )

  const roomBar = (
    <div className="room-bar">
      <span className="room-bar__code">房號 {roomCode}</span>
      {mySeat != null ? (
        <span className="room-bar__me">你是 {state.names[mySeat]}</span>
      ) : amHost ? (
        <span className="room-bar__me">開桌者</span>
      ) : null}
      <button type="button" className="room-bar__leave" onClick={onLeave}>
        離開
      </button>
    </div>
  )

  // 還沒認領座位、也不是房主 → 讓他先挑一個座位
  const claimPrompt = !canAct && (
    <div className="claim-prompt">
      <p className="claim-prompt__title">選擇你的座位（你是哪一位？）</p>
      <div className="claim-prompt__grid">
        {[0, 1, 2, 3].map((seat) =>
          claims[seat] ? null : (
            <button key={seat} type="button" className="game-btn game-btn--ghost" onClick={() => claimMySeat(seat)}>
              我是 {state.names[seat]}
            </button>
          ),
        )}
      </div>
    </div>
  )

  // 視角切換（只在我能操作多個座位時出現，例如房主一人控多家）
  const viewerSwitch = controllableSeats.length > 1 && (
    <div className="viewer-switch">
      <span className="viewer-switch__label">目前操作</span>
      {controllableSeats.map((seat) => (
        <button key={seat} type="button" className={seat === viewerPlayer ? 'active' : ''} onClick={() => setViewerOverride(seat)}>
          {state.names[seat]}
        </button>
      ))}
    </div>
  )

  // ── 抽風位 ──
  if (state.phase === 'draw') {
    const myTurn = controllable(state.drawTurn)
    return (
      <section className="panel">
        {roomBar}
        {claimPrompt}
        <h2 className="panel__title">🎴 抽風位（1/3）</h2>
        {viewerSwitch}
        {state.drawTurn <= 3 ? (
          <p className="game-prompt">
            {myTurn ? (
              <>輪到 <strong>{state.names[state.drawTurn]}</strong> 點一張蓋牌（{state.drawTurn + 1}／4）</>
            ) : (
              <>等待 <strong>{state.names[state.drawTurn]}</strong> 抽風位（{state.drawTurn + 1}／4）</>
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
        {state.drawTurn > 3 && controllable(eastPlayer) && (
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
    const canPick = controllable(eastPlayer)
    return (
      <section className="panel">
        {roomBar}
        {claimPrompt}
        <h2 className="panel__title">🪑 選擇座位（2/3）</h2>
        {viewerSwitch}
        <p className="game-prompt">
          {canPick ? (
            <>請 <strong>{state.names[eastPlayer]}</strong>（東風）選擇想坐的位子</>
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
              disabled={!canPick}
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
    const canRoll = controllable(eastPlayer)
    const rolled = state.lastRollTotal !== null
    const firstWind = rolled ? firstDealerWind(state.lastRollTotal) : null
    const firstPlayer = rolled ? state.windOfPlayer.indexOf(firstWind) : -1
    const highlight = rolled ? seatOfWind(firstWind, state.eastSeat) : null
    return (
      <section className="panel">
        {roomBar}
        {claimPrompt}
        <h2 className="panel__title">🎲 擲骰定莊（3/3）</h2>
        {viewerSwitch}
        <p className="game-prompt">
          {canRoll ? (
            <>請 <strong>{state.names[eastPlayer]}</strong>（東風）擲骰子</>
          ) : (
            <>等待 <strong>{state.names[eastPlayer]}</strong>（東風）擲骰定莊</>
          )}
        </p>
        {canRoll ? diceField('骰子點數總和') : <div className="waiting-note">🎲 等待東風擲骰…</div>}
        {rollDetail}
        <GameSeatTable players={players} viewerSeat={state.seatOfPlayer[viewerPlayer]} dealerSeat={null} highlightSeat={highlight} centerText="東" />
        {rolled && <div className="banner banner--success">👑 {state.names[firstPlayer]}（{WINDS[firstWind]}風）為第一個莊家！</div>}
        {rolled && canRoll && (
          <button type="button" className="game-btn game-btn--primary game-btn--full" onClick={() => dispatch({ type: 'CONFIRM_FIRST_DEALER' })}>
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
  const canRoll = controllable(dealerPlayer)

  return (
    <section className="panel">
      {roomBar}
      {claimPrompt}
      <h2 className="panel__title">🀅 對局中</h2>

      <div className="game-status">
        <span className="game-chip">第 {state.majiang + 1} 將</span>
        <span className="game-chip">{WINDS[state.roundWind]}風圈</span>
        <span className="game-chip game-chip--dealer">👑 莊家：{state.names[dealerPlayer]}</span>
      </div>

      {viewerSwitch}

      {canRoll ? diceField(`骰子點數總和（莊家 ${state.names[dealerPlayer]}）`) : <div className="waiting-note">🎲 等待莊家 {state.names[dealerPlayer]} 擲骰…</div>}
      {rollDetail}

      <GameSeatTable players={players} viewerSeat={viewerSeat} dealerSeat={dealerSeat} highlightSeat={drawSeat} centerText={WINDS[state.roundWind]} />

      {drawPlayer >= 0 && (
        <div className="banner banner--success">由「{state.names[drawPlayer]}」從倒數 {18 - state.lastRollTotal} 張開始抓牌！</div>
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
          🀄 {controllableSeats.length > 1 ? `${state.names[viewerPlayer]} 胡了` : '我胡了'}
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
