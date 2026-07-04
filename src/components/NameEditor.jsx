import { useState } from 'react'

// 改暱稱：編輯時用本地草稿，可暫時留空；按「確認」時才寫回共享狀態，且不可為空
export default function NameEditor({ names, onSave, onClose }) {
  const [drafts, setDrafts] = useState(names)
  const [error, setError] = useState('')

  function commit() {
    if (drafts.some((d) => d.trim() === '')) {
      setError('暱稱不可為空')
      return
    }
    onSave(drafts.map((d) => d.trim()))
    onClose?.()
  }

  return (
    <div className="name-editor">
      <p className="name-editor__title">改暱稱（任何人都能改所有人的）</p>
      <div className="game-names">
        {drafts.map((n, i) => (
          <input
            key={i}
            className="field__input"
            value={n}
            maxLength={8}
            onChange={(e) => {
              setError('')
              setDrafts((prev) => {
                const next = [...prev]
                next[i] = e.target.value
                return next
              })
            }}
            placeholder={`玩家${i + 1}`}
          />
        ))}
      </div>
      {error && <p className="name-editor__error">{error}</p>}
      <div className="name-editor__actions">
        <button type="button" className="game-btn game-btn--primary" onClick={commit}>
          確認
        </button>
        <button type="button" className="game-btn game-btn--ghost" onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  )
}
