// 胡牌組合台數表（不含莊家／連莊，該項在畫面上獨立處理）
// exclude: 與此牌型相斥的牌型 id，選取時會自動移除清單中的這些項目（雙向生效，宣告一邊即可）
// excludeCounts: 與此牌型相斥的計數型（花牌／花槓）id，選取時會鎖住／歸零對應計數
// type: 'label' 為純文字分隔說明；'break' 為強制換行用的隱形佔位，兩者皆不可選取、不參與台數與文字解析
// 陣列順序即畫面上按鈕排列順序（四個一排）
export const PATTERNS = [
  { id: '屁胡', tai: 0, type: 'toggle', exclude: ['平胡', '碰碰胡'] },
  {
    id: '平胡',
    tai: 2,
    type: 'toggle',
    exclude: [
      '碰碰胡', '屁胡', '紅中', '青發', '白板', '門風刻', '圈風刻', '七搶一', '八仙過海',
      '小三元', '大三元', '小四喜', '大四喜', '三暗刻', '四暗刻', '五暗刻', '字一色',
    ],
    excludeCounts: ['花牌', '花槓'],
  },
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
  { id: '海底撈月', tai: 1, type: 'toggle', exclude: [] },
  { id: '搶槓', tai: 1, type: 'toggle', exclude: ['槓上開花', '自摸'] },

  { id: '全求人', tai: 2, type: 'toggle', exclude: ['自摸', '門清'] },
  { id: '門清一摸三', tai: 3, type: 'toggle', exclude: ['門清', '自摸'] },

  { id: '開花店系列', type: 'label' },

  // 花牌（原「正花」）上限 2 張／人
  { id: '花牌', tai: 1, type: 'count', max: 2 },
  { id: '花槓', tai: 1, type: 'count', max: 2 },
  { id: '七搶一', tai: 8, type: 'toggle', exclude: ['八仙過海'], excludeCounts: ['花牌', '花槓'] },
  { id: '八仙過海', tai: 8, type: 'toggle', exclude: ['七搶一'], excludeCounts: ['花槓'] },

  { id: '牌品好 人品自然好', type: 'label' },

  { id: '小三元', tai: 4, type: 'toggle', exclude: ['大三元', '紅中', '青發', '白板'] },
  { id: '大三元', tai: 8, type: 'toggle', exclude: ['小三元', '紅中', '青發', '白板'] },
  { id: '小四喜', tai: 8, type: 'toggle', exclude: ['大四喜', '門風刻', '圈風刻'] },
  { id: '大四喜', tai: 16, type: 'toggle', exclude: ['小四喜', '門風刻', '圈風刻'] },

  { id: '三暗刻', tai: 2, type: 'toggle', exclude: ['四暗刻', '五暗刻'] },
  { id: '四暗刻', tai: 5, type: 'toggle', exclude: ['三暗刻', '五暗刻'] },
  { id: '五暗刻', tai: 8, type: 'toggle', exclude: ['三暗刻', '四暗刻'] },

  // 強制換行，確保天聽／地聽／天胡／地胡剛好排成一整排
  { id: 'break-tian-hu', type: 'break' },

  { id: '天聽', tai: 8, type: 'toggle', exclude: ['地聽'] },
  { id: '地聽', tai: 4, type: 'toggle', exclude: ['天聽'] },
  { id: '天胡', tai: 24, type: 'toggle', exclude: ['地胡'] },
  { id: '地胡', tai: 16, type: 'toggle', exclude: ['天胡'] },

  { id: '混一色', tai: 4, type: 'toggle', exclude: ['清一色', '字一色'] },
  { id: '清一色', tai: 8, type: 'toggle', exclude: ['混一色', '字一色'] },
  { id: '字一色', tai: 16, type: 'toggle', exclude: ['混一色', '清一色'] },
]

export const PATTERN_MAP = new Map(
  PATTERNS.filter((p) => p.type !== 'label' && p.type !== 'break').map((p) => [p.id, p]),
)

// 一方成立就一定會多算另一方（單向，implies 那方不會反過來要求 trigger）
export const IMPLIES_RULES = [
  { trigger: '五暗刻', implies: '碰碰胡' },
  { trigger: '槓上開花', implies: '自摸' },
]

// 同時滿足 requires 全部項目時，自動合併成 result（並移除 requires 項目）
export const COMBINE_RULES = [{ requires: ['自摸', '門清'], result: '門清一摸三' }]
