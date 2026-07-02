import { useState } from 'react'
import DiceSeatCalculator from './components/DiceSeatCalculator.jsx'
import TaiCalculator from './components/TaiCalculator.jsx'
import './App.css'

const TABS = [
  { id: 'dice', label: '算抓牌位子', emoji: '🎲' },
  { id: 'tai', label: '計算台數', emoji: '🀄' },
]

function App() {
  const [activeTab, setActiveTab] = useState('dice')

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <span className="app__title-emoji">🀄</span> 麻將小幫手
        </h1>
        <p className="app__subtitle">抓牌位子 × 台數計算，一站搞定</p>
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
        {activeTab === 'dice' && <DiceSeatCalculator />}
        {activeTab === 'tai' && <TaiCalculator />}
      </main>

      <footer className="app__footer">🎋 Have fun and 胡牌大吉！</footer>
    </div>
  )
}

export default App
