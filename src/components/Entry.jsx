import { useState } from 'react'
import { createRoom, roomExists } from '../hooks/useRoom.js'

export default function Entry({ uid, onJoined }) {
  const [mode, setMode] = useState(null) // null | 'join'
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setBusy(true)
    setError('')
    try {
      const roomCode = await createRoom(uid)
      onJoined(roomCode)
    } catch (e) {
      setError(e.message || '開桌失敗，請再試一次')
      setBusy(false)
    }
  }

  async function handleJoin() {
    const trimmed = code.trim()
    if (!/^\d{4}$/.test(trimmed)) {
      setError('請輸入 4 位數字房號')
      return
    }
    setBusy(true)
    setError('')
    try {
      const exists = await roomExists(trimmed)
      if (!exists) {
        setError('找不到這個房號，請確認後再試')
        setBusy(false)
        return
      }
      onJoined(trimmed)
    } catch (e) {
      setError(e.message || '加入失敗，請再試一次')
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">🎴 開桌模式</h2>
      <p className="game-hint">
        線上多人連線：一人開新桌拿到房號，其餘三人輸入同一房號加入，各自用自己的手機操作、看自己的視角。
      </p>

      {mode !== 'join' ? (
        <div className="entry-actions">
          <button
            type="button"
            className="game-btn game-btn--primary game-btn--full"
            onClick={handleCreate}
            disabled={busy}
          >
            🆕 開新桌
          </button>
          <button
            type="button"
            className="game-btn game-btn--ghost game-btn--full"
            onClick={() => {
              setMode('join')
              setError('')
            }}
            disabled={busy}
          >
            🔑 加入牌桌
          </button>
        </div>
      ) : (
        <div className="entry-join">
          <input
            className="field__input entry-join__input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="輸入 4 位數房號"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <button
            type="button"
            className="game-btn game-btn--primary game-btn--full"
            onClick={handleJoin}
            disabled={busy}
          >
            加入
          </button>
          <button
            type="button"
            className="game-reset__link"
            onClick={() => {
              setMode(null)
              setError('')
              setCode('')
            }}
          >
            返回
          </button>
        </div>
      )}

      {error && <div className="banner banner--error entry-error">{error}</div>}
    </section>
  )
}
