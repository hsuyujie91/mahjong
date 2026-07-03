import { useEffect, useState } from 'react'
import DiceMode from './components/DiceMode.jsx'
import Entry from './components/Entry.jsx'
import FundsStatus from './components/FundsStatus.jsx'
import GameMode from './components/GameMode.jsx'
import TaiCalculator from './components/TaiCalculator.jsx'
import WaitingRoom from './components/WaitingRoom.jsx'
import { ensureAuth, firebaseReady } from './firebase.js'
import { useRoom } from './hooks/useRoom.js'
import './App.css'

const TABS = [
  { id: 'game', label: '開桌模式', emoji: '🎴' },
  { id: 'dice', label: '擲骰', emoji: '🎲' },
  { id: 'tai', label: '計算台數', emoji: '🀄' },
  { id: 'funds', label: '資金現狀', emoji: '💰' },
]

const ROOM_KEY = 'mahjong-room-code'

function App() {
  const [uid, setUid] = useState(null)
  const [authError, setAuthError] = useState('')
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem(ROOM_KEY) || null)
  const [activeTab, setActiveTab] = useState('game')

  useEffect(() => {
    if (!firebaseReady) return
    ensureAuth()
      .then(setUid)
      .catch((e) => setAuthError(e.message || '連線失敗'))
  }, [])

  const { room, loading } = useRoom(uid ? roomCode : null)

  function joinRoom(code) {
    localStorage.setItem(ROOM_KEY, code)
    setRoomCode(code)
    setActiveTab('game')
  }

  function leaveRoom() {
    localStorage.removeItem(ROOM_KEY)
    setRoomCode(null)
  }

  // 房間被刪除／重置消失時，退回進入畫面
  useEffect(() => {
    if (roomCode && uid && !loading && room === null) {
      localStorage.removeItem(ROOM_KEY)
      setRoomCode(null)
    }
  }, [roomCode, uid, loading, room])

  const claims = room?.claims || {}
  const mySeatEntry = Object.entries(claims).find(([, u]) => u === uid)
  const mySeat = mySeatEntry ? Number(mySeatEntry[0]) : null

  const inRoom = firebaseReady && uid && roomCode && room

  function renderBody() {
    if (!firebaseReady) {
      return <section className="panel"><p className="game-hint">尚未設定 Firebase 連線。</p></section>
    }
    if (authError) {
      return <section className="panel"><div className="banner banner--error">連線失敗：{authError}</div></section>
    }
    if (!uid) {
      return <section className="panel"><p className="game-hint">連線中…</p></section>
    }
    if (!roomCode) {
      return <Entry uid={uid} onJoined={joinRoom} />
    }
    if (loading || !room) {
      return <section className="panel"><p className="game-hint">載入牌桌 {roomCode}…</p></section>
    }
    switch (activeTab) {
      case 'game':
        return room.game.phase === 'lobby' ? (
          <WaitingRoom room={room} roomCode={roomCode} uid={uid} onLeave={leaveRoom} />
        ) : (
          <GameMode room={room} roomCode={roomCode} uid={uid} mySeat={mySeat} onLeave={leaveRoom} />
        )
      case 'dice':
        return <DiceMode room={room} roomCode={roomCode} />
      case 'tai':
        return <TaiCalculator room={room} roomCode={roomCode} />
      case 'funds':
        return <FundsStatus funds={room.funds} names={room.game.names} />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <span className="app__title-emoji">🀄</span> 麻將小幫手
        </h1>
        <p className="app__subtitle">保安！可以讓人打了又打 打了又打的嗎！</p>
      </header>

      {inRoom && (
        <nav className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tabs__button ${activeTab === tab.id ? 'tabs__button--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </nav>
      )}

      <main className="app__main">{renderBody()}</main>

      <footer className="app__footer">🎋 Have fun and 胡牌大吉！</footer>
    </div>
  )
}

export default App
