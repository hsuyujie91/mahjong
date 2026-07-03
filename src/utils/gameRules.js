// 開桌模式的牌局規則：全部是純函式與 reducer，之後接多人連線可直接沿用
// 絕對座位以「桌面視角」編號：0=下、1=右、2=上、3=左
// 麻將逆時針行牌，座位 s 的下家（右手邊的人）是 (s + 1) % 4

export const WINDS = ['東', '南', '西', '北']

export function shuffledWinds() {
  const winds = [0, 1, 2, 3]
  for (let i = winds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[winds[i], winds[j]] = [winds[j], winds[i]]
  }
  return winds
}

// 東風玩家選定座位後，南、西、北依序坐在他右手邊
export function seatOfWind(windIndex, eastSeat) {
  return (eastSeat + windIndex) % 4
}

// 定莊：東風位為 1，往右（逆時針）數到骰子總和，落在哪個風位誰就是第一個莊家
export function firstDealerWind(diceTotal) {
  return (diceTotal - 1) % 4
}

// 抓牌位：莊家為 1（餘1），往右依序 餘2=莊家右邊、餘3=對面、餘0=左邊
export function drawerSeat(dealerSeat, diceTotal) {
  return (dealerSeat + ((diceTotal - 1) % 4)) % 4
}

// 骰盅／豹子／紅豹：三顆骰子排序後連號為骰盅（+2台）；三顆同號為豹子（×2台），
// 若同號為 1 或 4 則升級為紅豹（×3台）
export function diceBonus(dice) {
  if (!dice || dice.length !== 3) return null
  const sorted = [...dice].sort((a, b) => a - b)
  if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
    return { label: '骰盅', detail: '+2台' }
  }
  if (dice[0] === dice[1] && dice[1] === dice[2]) {
    if (dice[0] === 1 || dice[0] === 4) {
      return { label: '紅豹', detail: '×3台' }
    }
    return { label: '豹子', detail: '×2台' }
  }
  return null
}

// 視角轉換：viewer 永遠在畫面下方，回傳 0=下、1=右、2=上、3=左
export function relativePos(absSeat, viewerSeat) {
  return (absSeat - viewerSeat + 4) % 4
}

// 莊家逆時針輪替（往右手邊輪一位，風位順序即座位順序）
export function nextDealerWind(dealerWind) {
  return (dealerWind + 1) % 4
}

export function createInitialState() {
  return {
    v: 1,
    phase: 'lobby', // lobby → draw → seat → first-dealer → play
    names: ['玩家1', '玩家2', '玩家3', '玩家4'],
    tileWinds: [], // 蓋牌底下藏的風位（洗牌後）
    tileTakenBy: [null, null, null, null], // 每張牌被哪位玩家抽走
    drawTurn: 0,
    windOfPlayer: [null, null, null, null],
    eastSeat: null,
    seatOfPlayer: [null, null, null, null],
    dealerWind: null,
    dealerStreak: 0,
    roundWind: 0, // 圈風（WINDS 索引）
    majiang: 0, // 已完成幾將
    lastRollTotal: null,
    lastRollDice: null,
    handSeq: 0, // 已結算幾局，同時作為 lastHandResult 的唯一序號
    lastHandResult: null,
    drawnSinceRoll: false, // 這次擲骰後是否已經按過流局，防止重複按時連莊數被連續累加
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_NAME': {
      if (state.phase !== 'lobby') return state
      const names = [...state.names]
      names[action.index] = action.name
      return { ...state, names }
    }

    case 'START_DRAW': {
      if (state.phase !== 'lobby') return state
      const names = state.names.map((n, i) => (n.trim() === '' ? `玩家${i + 1}` : n.trim()))
      return {
        ...state,
        names,
        phase: 'draw',
        tileWinds: shuffledWinds(),
        tileTakenBy: [null, null, null, null],
        drawTurn: 0,
        windOfPlayer: [null, null, null, null],
      }
    }

    case 'DRAW_TILE': {
      if (state.phase !== 'draw' || state.drawTurn > 3) return state
      if (state.tileTakenBy[action.tile] !== null) return state
      const tileTakenBy = [...state.tileTakenBy]
      tileTakenBy[action.tile] = state.drawTurn
      const windOfPlayer = [...state.windOfPlayer]
      windOfPlayer[state.drawTurn] = state.tileWinds[action.tile]
      return { ...state, tileTakenBy, windOfPlayer, drawTurn: state.drawTurn + 1 }
    }

    case 'GO_PICK_SEAT': {
      if (state.phase !== 'draw' || state.drawTurn <= 3) return state
      return { ...state, phase: 'seat' }
    }

    case 'PICK_SEAT': {
      if (state.phase !== 'seat') return state
      const seatOfPlayer = state.windOfPlayer.map((w) => seatOfWind(w, action.seat))
      return {
        ...state,
        eastSeat: action.seat,
        seatOfPlayer,
        phase: 'first-dealer',
        lastRollTotal: null,
        lastRollDice: null,
      }
    }

    case 'SET_ROLL': {
      if (state.phase !== 'first-dealer' && state.phase !== 'play') return state
      return { ...state, lastRollTotal: action.total, lastRollDice: action.dice ?? null, drawnSinceRoll: false }
    }

    case 'CONFIRM_FIRST_DEALER': {
      if (state.phase !== 'first-dealer' || !state.lastRollTotal) return state
      return {
        ...state,
        dealerWind: firstDealerWind(state.lastRollTotal),
        dealerStreak: 0,
        roundWind: 0,
        majiang: 0,
        phase: 'play',
        lastRollTotal: null,
        lastRollDice: null,
        drawnSinceRoll: false,
      }
    }

    // 胡牌：winner 為贏家玩家序號，selfDraw 為自摸（三家皆輸），否則 loser 為放槍者玩家序號
    // 贏家若為本局莊家則連莊（連莊數 +1），否則莊家依逆時針輪替並重新起算連莊數
    case 'WIN_HAND': {
      if (state.phase !== 'play') return state
      const winnerIsDealer = state.windOfPlayer[action.winner] === state.dealerWind
      const bonus = diceBonus(state.lastRollDice)
      const handSeq = state.handSeq + 1

      let dealerWind = state.dealerWind
      let dealerStreak = state.dealerStreak
      let { roundWind, majiang } = state

      if (winnerIsDealer) {
        dealerStreak += 1
      } else {
        dealerWind = nextDealerWind(state.dealerWind)
        dealerStreak = 0
        // 莊家輪一圈回到東風位的人 → 圈風往後遞延一個；四圈輪完算一將
        if (dealerWind === 0) {
          roundWind = (roundWind + 1) % 4
          if (roundWind === 0) majiang += 1
        }
      }

      return {
        ...state,
        dealerWind,
        dealerStreak,
        roundWind,
        majiang,
        lastRollTotal: null,
        lastRollDice: null,
        drawnSinceRoll: false,
        handSeq,
        lastHandResult: {
          id: handSeq,
          type: 'win',
          winner: action.winner,
          loser: action.selfDraw ? null : action.loser,
          selfDraw: !!action.selfDraw,
          dealerContinued: winnerIsDealer,
          dealerStreak,
          diceBonus: bonus,
        },
      }
    }

    // 流局：無人胡牌，莊家連莊（連莊數 +1）
    // 在重新擲骰前重複按流局，只有第一次會生效（見 drawnSinceRoll）
    case 'DRAW_HAND': {
      if (state.phase !== 'play') return state
      if (state.drawnSinceRoll) return state
      const bonus = diceBonus(state.lastRollDice)
      const handSeq = state.handSeq + 1
      const dealerStreak = state.dealerStreak + 1

      return {
        ...state,
        dealerStreak,
        lastRollTotal: null,
        lastRollDice: null,
        drawnSinceRoll: true,
        handSeq,
        lastHandResult: {
          id: handSeq,
          type: 'draw',
          winner: null,
          loser: null,
          selfDraw: false,
          dealerContinued: true,
          dealerStreak,
          diceBonus: bonus,
        },
      }
    }

    case 'RESET':
      return createInitialState()

    default:
      return state
  }
}
