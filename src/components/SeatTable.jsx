const SEAT_LAYOUT = [
  { key: 1, label: '莊家', position: 'bottom' },
  { key: 2, label: '莊家右邊', position: 'right' },
  { key: 3, label: '莊家對面', position: 'top' },
  { key: 4, label: '莊家左邊', position: 'left' },
]

export default function SeatTable({ activeSeat }) {
  return (
    <div className="seat-table">
      <div className="seat-table__center">
        <span>🀄</span>
      </div>
      {SEAT_LAYOUT.map((seat) => (
        <div
          key={seat.key}
          className={`seat-table__seat seat-table__seat--${seat.position} ${
            activeSeat === seat.key ? 'seat-table__seat--active' : ''
          }`}
        >
          {seat.label}
        </div>
      ))}
    </div>
  )
}
