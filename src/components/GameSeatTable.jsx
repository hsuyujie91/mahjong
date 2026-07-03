import { relativePos } from '../utils/gameRules.js'

const REL_CLASS = ['bottom', 'right', 'top', 'left']

// 只存絕對座位，渲染時以 viewerSeat 做視角旋轉：viewer 永遠在畫面下方
export default function GameSeatTable({ players, viewerSeat, dealerSeat, highlightSeat, centerText }) {
  return (
    <div className="seat-table seat-table--game">
      <div className="seat-table__center seat-table__center--wind">{centerText}</div>
      {players.map((p) => {
        const rel = relativePos(p.seat, viewerSeat)
        const classes = ['seat-table__seat', `seat-table__seat--${REL_CLASS[rel]}`]
        if (highlightSeat === p.seat) classes.push('seat-table__seat--active')
        return (
          <div key={p.seat} className={classes.join(' ')}>
            <span className="seat-cell__name">
              {dealerSeat === p.seat ? '👑 ' : ''}
              {p.name}
            </span>
            <span className="seat-cell__wind">
              {p.wind}風{rel === 0 ? '・你' : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
