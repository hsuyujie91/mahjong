import { useCallback, useEffect, useState } from 'react'
import FundsStatus from './components/FundsStatus.jsx'
import GameMode from './components/GameMode.jsx'
import TaiCalculator from './components/TaiCalculator.jsx'
import './App.css'

const TABS = [
  { id: 'game', label: '開桌模式', emoji: '🎴' },
  { id: 'tai', label: '計算台數', emoji: '🀄' },
  { id: 'funds', label: '資金現狀', emoji: '💰' },
]

const FUNDS_KEY = 'mahjong-funds-state'
const DEFAULT_NAMES = ['玩家1', '玩家2', '玩家3', '玩家4']

function initFunds() {
  try {
    const raw = localStorage.getItem(FUNDS_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (Array.isArray(saved) && saved.length === 4) return saved
    }
  } catch {
    // 存檔壞掉就重置資金
  }
  return [0, 0, 0, 0]
}

function App() {
  const [activeTab, setActiveTab] = useState('game')
  const [handSync, setHandSync] = useState(null)
  const [settledHandId, setSettledHandId] = useState(null)
  const [funds, setFunds] = useState(initFunds)
  const [fundsNames, setFundsNames] = useState(DEFAULT_NAMES)

  useEffect(() => {
    localStorage.setItem(FUNDS_KEY, JSON.stringify(funds))
  }, [funds])

  const handleHandResolved = useCallback((sync) => {
    setHandSync(sync)
    if (sync?.names) setFundsNames(sync.names)
  }, [])

  const handleGameReset = useCallback(() => {
    setFunds([0, 0, 0, 0])
  }, [])

  // 自摸：贏家收三家的錢；放槍：只有放槍者付錢給贏家
  const handleSettleMoney = useCallback(({ winner, loser, selfDraw, amount }) => {
    setFunds((prev) => {
      const next = [...prev]
      if (selfDraw) {
        next[winner] += amount * 3
        for (let i = 0; i < 4; i++) {
          if (i !== winner) next[i] -= amount
        }
      } else {
        next[winner] += amount
        next[loser] -= amount
      }
      return next
    })
  }, [])

  function resetFunds() {
    if (window.confirm('確定要重置資金現狀嗎？所有玩家餘額會歸零。')) {
      setFunds([0, 0, 0, 0])
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

      <main className="app__main">
        {activeTab === 'game' && <GameMode onHandResolved={handleHandResolved} onGameReset={handleGameReset} />}
        {activeTab === 'tai' && (
          <TaiCalculator
            handSync={handSync}
            settledHandId={settledHandId}
            onHandSettled={setSettledHandId}
            onSettleMoney={handleSettleMoney}
          />
        )}
        {activeTab === 'funds' && <FundsStatus funds={funds} names={fundsNames} onReset={resetFunds} />}
      </main>

      <footer className="app__footer">🎋 Have fun and 胡牌大吉！</footer>
    </div>
  )
}

export default App
