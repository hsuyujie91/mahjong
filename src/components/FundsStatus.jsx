const formatMoney = (n) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`

export default function FundsStatus({ funds, names, onReset }) {
  const rows = names
    .map((name, i) => ({ name, balance: funds[i] || 0 }))
    .sort((a, b) => b.balance - a.balance)

  return (
    <section className="panel">
      <h2 className="panel__title">💰 資金現狀</h2>
      <p className="game-hint">
        玩家初始資金皆為零，開桌模式每局結算後，系統會自動從輸家扣款、加到贏家身上。
      </p>

      <div className="funds-list">
        {rows.map((row) => (
          <div key={row.name} className="funds-row">
            <span className="funds-row__name">{row.name}</span>
            <span
              className={`funds-row__balance ${
                row.balance > 0 ? 'funds-row__balance--up' : row.balance < 0 ? 'funds-row__balance--down' : ''
              }`}
            >
              ${formatMoney(row.balance)}
            </span>
          </div>
        ))}
      </div>

      <div className="game-reset">
        <button type="button" onClick={onReset}>重置資金</button>
      </div>
    </section>
  )
}
