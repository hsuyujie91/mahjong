// 多人連線的房間同步層：所有裝置讀寫同一份 /rooms/{房號} 資料
// 牌局狀態沿用既有的純函式 gameReducer，只是改成寫進 Firebase 即時資料庫
import { useEffect, useState } from 'react'
import { get, onValue, ref, runTransaction, set, update } from 'firebase/database'
import { db } from '../firebase.js'
import { createInitialState, gameReducer } from '../utils/gameRules.js'

// Firebase 即時資料庫不會儲存 null，陣列中的 null 會被丟掉、造成長度縮短或變成物件，
// 因此讀取後一律用這個函式把牌局狀態補回完整形狀（4 格陣列、缺項補 null / 預設值）。
function fix4(value, fill) {
  const out = []
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) out[i] = value[i]
  } else if (value && typeof value === 'object') {
    Object.keys(value).forEach((k) => {
      const idx = Number(k)
      if (!Number.isNaN(idx)) out[idx] = value[k]
    })
  }
  const result = []
  for (let i = 0; i < 4; i++) result[i] = out[i] === undefined ? fill : out[i]
  return result
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => value[k])
  }
  return []
}

export function hydrateGame(raw) {
  const base = createInitialState()
  if (!raw) return base
  const g = { ...base, ...raw }
  g.names = fix4(raw.names, '').map((n, i) => (n === '' || n == null ? `玩家${i + 1}` : n))
  g.tileTakenBy = fix4(raw.tileTakenBy, null)
  g.windOfPlayer = fix4(raw.windOfPlayer, null)
  g.seatOfPlayer = fix4(raw.seatOfPlayer, null)
  g.tileWinds = toArray(raw.tileWinds)
  g.lastRollDice = raw.lastRollDice ? toArray(raw.lastRollDice) : null
  return g
}

export function initialTai() {
  return { di: 20, tai: 10, selectedIds: [], counts: {}, dealerActive: false, dealerStreak: 0, diceBonusLit: null }
}

export function hydrateTai(raw) {
  const base = initialTai()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    selectedIds: toArray(raw.selectedIds),
    counts: raw.counts && typeof raw.counts === 'object' ? raw.counts : {},
    diceBonusLit: raw.diceBonusLit ?? null,
  }
}

function initialRoom() {
  return {
    game: createInitialState(),
    tai: initialTai(),
    funds: [0, 0, 0, 0],
    settledHandId: null,
    claims: {},
    createdAt: Date.now(),
  }
}

// 產生一個沒被用過的 4 碼房號並建立房間
export async function createRoom() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const snap = await get(ref(db, `rooms/${code}`))
    if (!snap.exists()) {
      await set(ref(db, `rooms/${code}`), initialRoom())
      return code
    }
  }
  throw new Error('房號產生失敗，請再試一次')
}

export async function roomExists(code) {
  const snap = await get(ref(db, `rooms/${code}`))
  return snap.exists()
}

// 認領座位（0~3）：用 transaction 避免兩人同時搶同一位
export async function claimSeat(roomCode, seat, uid, name) {
  const claimRef = ref(db, `rooms/${roomCode}/claims/${seat}`)
  const res = await runTransaction(claimRef, (cur) => {
    if (cur && cur !== uid) return // 已被別人占走 → 中止
    return uid
  })
  if (!res.committed || res.snapshot.val() !== uid) {
    throw new Error('這個座位已被選走')
  }
  if (name) await set(ref(db, `rooms/${roomCode}/game/names/${seat}`), name)
}

export function releaseSeat(roomCode, seat, uid) {
  const claimRef = ref(db, `rooms/${roomCode}/claims/${seat}`)
  return runTransaction(claimRef, (cur) => (cur === uid ? null : cur))
}

export function setPlayerName(roomCode, seat, name) {
  return set(ref(db, `rooms/${roomCode}/game/names/${seat}`), name || `玩家${seat + 1}`)
}

// 牌局操作：讀取現有狀態 → 套用 gameReducer → 寫回。回傳 transaction 結果供後續取用。
export function dispatchGame(roomCode, action) {
  const gameRef = ref(db, `rooms/${roomCode}/game`)
  return runTransaction(gameRef, (cur) => gameReducer(hydrateGame(cur), action))
}

export function patchTai(roomCode, partial) {
  return update(ref(db, `rooms/${roomCode}/tai`), partial)
}

export function setTai(roomCode, taiObj) {
  return set(ref(db, `rooms/${roomCode}/tai`), taiObj)
}

export function setSettledHandId(roomCode, id) {
  return set(ref(db, `rooms/${roomCode}/settledHandId`), id)
}

// 認領一局的結算權：多台同時按結算時，只有第一台會拿到 true 去過帳，避免重複扣款
export async function claimSettlement(roomCode, handId) {
  const r = ref(db, `rooms/${roomCode}/settledHandId`)
  const res = await runTransaction(r, (cur) => (cur === handId ? undefined : handId))
  return res.committed
}

// 資金過帳：用 transaction 確保同時結算不會覆蓋彼此
export function settleFunds(roomCode, updater) {
  const fundsRef = ref(db, `rooms/${roomCode}/funds`)
  return runTransaction(fundsRef, (cur) => updater(toArray(cur).length === 4 ? toArray(cur) : [0, 0, 0, 0]))
}

// 重新開桌：牌局與資金、台數全部歸零，但保留座位認領
export function resetRoom(roomCode) {
  return update(ref(db, `rooms/${roomCode}`), {
    game: createInitialState(),
    tai: initialTai(),
    funds: [0, 0, 0, 0],
    settledHandId: null,
  })
}

// 訂閱整個房間，回傳補正後的資料。
// state.code 記錄目前已訂閱／已載入的房號；房號一改變就先回報 loading=true、room=null，
// 避免上層在還沒收到第一筆資料時，誤把新房間當成「不存在」。
export function useRoom(roomCode) {
  const [state, setState] = useState({ code: null, room: null, loading: !!roomCode })

  useEffect(() => {
    if (!roomCode) {
      setState({ code: null, room: null, loading: false })
      return
    }
    setState((s) => (s.code === roomCode ? s : { code: roomCode, room: null, loading: true }))
    const r = ref(db, `rooms/${roomCode}`)
    const unsub = onValue(r, (snap) => {
      const raw = snap.val()
      setState({
        code: roomCode,
        loading: false,
        room: raw
          ? {
              game: hydrateGame(raw.game),
              tai: hydrateTai(raw.tai),
              funds: toArray(raw.funds).length === 4 ? toArray(raw.funds) : [0, 0, 0, 0],
              settledHandId: raw.settledHandId ?? null,
              claims: raw.claims || {},
            }
          : null,
      })
    })
    return () => unsub()
  }, [roomCode])

  // 房號已切換但 effect／首筆快照還沒到 → 對外一律回報 loading，避免誤判房間不存在
  const synced = state.code === roomCode
  return { room: synced ? state.room : null, loading: synced ? state.loading : !!roomCode }
}
