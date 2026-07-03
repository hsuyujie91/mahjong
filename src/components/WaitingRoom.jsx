import { claimSeat, dispatchGame, releaseSeat, resetRoom, setPlayerName } from '../hooks/useRoom.js'

export default function WaitingRoom({ room, roomCode, uid, onLeave }) {
  const claims = room.claims || {}
  const mySeatEntry = Object.entries(claims).find(([, u]) => u === uid)
  const mySeat = mySeatEntry ? Number(mySeatEntry[0]) : null
  const claimedCount = Object.values(claims).filter(Boolean).length
  const allSeated = [0, 1, 2, 3].every((s) => claims[s])

  async function handleClaim(seat) {
    try {
      await claimSeat(roomCode, seat, uid, room.game.names[seat] || `玩家${seat + 1}`)
    } catch (e) {
      window.alert(e.message || '這個座位已被選走')
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">🎴 等待玩家加入</h2>

      <div className="room-code">
        <span className="room-code__label">房號</span>
        <span className="room-code__value">{roomCode}</span>
        <button
          type="button"
          className="room-code__copy"
          onClick={() => navigator.clipboard?.writeText(roomCode).catch(() => {})}
        >
          複製
        </button>
      </div>
      <p className="game-hint">把房號給其他三位，請他們在自己手機上輸入房號、認領座位。四位到齊就能開始。</p>

      <div className="seat-claim-list">
        {[0, 1, 2, 3].map((seat) => {
          const taken = !!claims[seat]
          const isMine = mySeat === seat
          return (
            <div key={seat} className={`seat-claim ${taken ? 'seat-claim--taken' : ''} ${isMine ? 'seat-claim--mine' : ''}`}>
              <span className="seat-claim__no">{seat + 1}</span>
              {taken ? (
                isMine ? (
                  <input
                    className="seat-claim__name-input"
                    value={room.game.names[seat]}
                    maxLength={8}
                    onChange={(e) => setPlayerName(roomCode, seat, e.target.value)}
                  />
                ) : (
                  <span className="seat-claim__name">{room.game.names[seat]}</span>
                )
              ) : (
                <span className="seat-claim__empty">空位</span>
              )}
              <div className="seat-claim__action">
                {isMine ? (
                  <button type="button" className="seat-claim__btn seat-claim__btn--leave" onClick={() => releaseSeat(roomCode, seat, uid)}>
                    離開座位
                  </button>
                ) : !taken && mySeat === null ? (
                  <button type="button" className="seat-claim__btn" onClick={() => handleClaim(seat)}>
                    坐這
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="game-btn game-btn--primary game-btn--full"
        disabled={!allSeated}
        onClick={() => dispatchGame(roomCode, { type: 'START_DRAW' })}
      >
        {allSeated ? '開始抽風位' : `尚缺 ${4 - claimedCount} 人`}
      </button>

      <div className="game-reset">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('確定要重置這桌嗎？會清空所有座位與紀錄。')) resetRoom(roomCode)
          }}
        >
          重置牌桌
        </button>
        <button type="button" className="game-reset__leave" onClick={onLeave}>
          離開房間
        </button>
      </div>
    </section>
  )
}
