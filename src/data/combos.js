// 胡牌組合台數表（不含莊家／連莊，該項在畫面上獨立處理）
// exclude: 與此牌型相斥或屬同一包含關係的牌型 id，選取時會自動移除清單中的這些項目
// 陣列順序即畫面上按鈕排列順序（四個一排）
export const PATTERNS = [
  { id: '屁胡', tai: 0, type: 'toggle', exclude: ['平胡', '碰碰胡'] },
  { id: '平胡', tai: 2, type: 'toggle', exclude: ['碰碰胡', '屁胡'] },
  { id: '碰碰胡', tai: 4, type: 'toggle', exclude: ['平胡', '屁胡'] },
  { id: '自摸', tai: 1, type: 'toggle', exclude: ['門清一摸三', '全求人', '搶槓'] },

  { id: '紅中', tai: 1, type: 'toggle', exclude: ['小三元', '大三元'] },
  { id: '青發', tai: 1, type: 'toggle', exclude: ['小三元', '大三元'] },
  { id: '白板', tai: 1, type: 'toggle', exclude: ['小三元', '大三元'] },
  { id: '門清', tai: 1, type: 'toggle', exclude: ['門清一摸三', '全求人'] },

  { id: '單吊', tai: 1, type: 'toggle', exclude: ['中洞', '邊張'] },
  { id: '中洞', tai: 1, type: 'toggle', exclude: ['單吊', '邊張'] },
  { id: '邊張', tai: 1, type: 'toggle', exclude: ['單吊', '中洞'] },
  { id: '槓上開花', tai: 1, type: 'toggle', exclude: ['搶槓'] },

  { id: '門風刻', tai: 1, type: 'toggle', exclude: ['小四喜', '大四喜'] },
  { id: '圈風刻', tai: 1, type: 'toggle', exclude: ['小四喜', '大四喜'] },
  { id: '海底撈月', tai: 1, type: 'toggle', exclude: ['河底撈魚'] },
  { id: '河底撈魚', tai: 1, type: 'toggle', exclude: ['海底撈月'] },

  { id: '不求人', tai: 1, type: 'toggle', exclude: ['門清一摸三', '全求人', '半求人'] },
  { id: '全求人', tai: 2, type: 'toggle', exclude: ['自摸', '門清', '不求人', '半求人'] },
  { id: '半求人', tai: 1, type: 'toggle', exclude: ['不求人', '全求人'] },
  { id: '門清一摸三', tai: 3, type: 'toggle', exclude: ['門清', '自摸', '不求人'] },

  // 花牌（原「正花」）上限 2 張／人；花槓數到 2 與八仙過海互斥，於元件內另行鎖定
  { id: '花牌', tai: 1, type: 'count', max: 2 },
  { id: '花槓', tai: 1, type: 'count', max: 2 },
  { id: '七搶一', tai: 8, type: 'toggle', exclude: ['八仙過海'] },
  { id: '八仙過海', tai: 8, type: 'toggle', exclude: ['七搶一'] },

  { id: '小三元', tai: 4, type: 'toggle', exclude: ['大三元', '紅中', '青發', '白板'] },
  { id: '大三元', tai: 8, type: 'toggle', exclude: ['小三元', '紅中', '青發', '白板'] },
  { id: '小四喜', tai: 8, type: 'toggle', exclude: ['大四喜', '門風刻', '圈風刻'] },
  { id: '大四喜', tai: 16, type: 'toggle', exclude: ['小四喜', '門風刻', '圈風刻'] },

  { id: '三暗刻', tai: 2, type: 'toggle', exclude: ['四暗刻', '五暗刻'] },
  { id: '四暗刻', tai: 5, type: 'toggle', exclude: ['三暗刻', '五暗刻'] },
  { id: '五暗刻', tai: 8, type: 'toggle', exclude: ['三暗刻', '四暗刻'] },
  { id: '地聽', tai: 4, type: 'toggle', exclude: ['天聽'] },

  { id: '混一色', tai: 4, type: 'toggle', exclude: ['清一色', '字一色'] },
  { id: '清一色', tai: 8, type: 'toggle', exclude: ['混一色', '字一色'] },
  { id: '字一色', tai: 16, type: 'toggle', exclude: ['混一色', '清一色'] },
  { id: '天聽', tai: 8, type: 'toggle', exclude: ['地聽'] },

  { id: '人胡', tai: 16, type: 'toggle', exclude: ['地胡', '天胡'] },
  { id: '地胡', tai: 16, type: 'toggle', exclude: ['人胡', '天胡'] },
  { id: '天胡', tai: 24, type: 'toggle', exclude: ['人胡', '地胡'] },
  { id: '搶槓', tai: 1, type: 'toggle', exclude: ['槓上開花', '自摸'] },
]

export const PATTERN_MAP = new Map(PATTERNS.map((p) => [p.id, p]))

// 花槓數到 2 與八仙過海視為同一件事，兩者互鎖（不會被自動移除，而是禁止再選取對方）
export const HUA_GANG_ID = '花槓'
export const BA_XIAN_GUO_HAI_ID = '八仙過海'
export const HUA_GANG_LOCK_COUNT = 2
