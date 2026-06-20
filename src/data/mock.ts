import type { PileInfo, RectificationItem, AcceptanceRecord, CheckItem, PhotoItem, ProjectInfo } from '@/types'
import { generateId } from '@/utils'

const now = Date.now()

export const mockProjects: ProjectInfo[] = [
  {
    id: 'proj001',
    name: '滨海新区CBD桩基工程',
    location: '天津市滨海新区',
    totalPiles: 128,
    completedPiles: 86
  },
  {
    id: 'proj002',
    name: '科技园南区厂房桩基',
    location: '深圳市南山区',
    totalPiles: 256,
    completedPiles: 142
  }
]

const baseCheckItemsBeforeDrilling: Omit<CheckItem, 'id' | 'checked'>[] = [
  { key: 'holePosition', label: '孔位复核', step: 'beforeDrilling' },
  { key: 'holeDiameter', label: '孔径检查', step: 'beforeDrilling' },
  { key: 'holeMark', label: '孔口标识', step: 'beforeDrilling' },
  { key: 'groundCondition', label: '地质条件确认', step: 'beforeDrilling' }
]

const baseCheckItemsCage: Omit<CheckItem, 'id' | 'checked'>[] = [
  { key: 'cageLength', label: '钢筋笼长度', step: 'reinforcementCage' },
  { key: 'cageDiameter', label: '钢筋笼直径', step: 'reinforcementCage' },
  { key: 'weldingQuality', label: '焊接质量', step: 'reinforcementCage' },
  { key: 'spacing', label: '箍筋间距', step: 'reinforcementCage' },
  { key: 'protectiveLayer', label: '保护层厚度', step: 'reinforcementCage' }
]

const baseCheckItemsPouring: Omit<CheckItem, 'id' | 'checked'>[] = [
  { key: 'conduitDepth', label: '导管埋深', step: 'pouring' },
  { key: 'concreteQuality', label: '混凝土质量', step: 'pouring' },
  { key: 'pouringSpeed', label: '浇筑速度', step: 'pouring' },
  { key: 'elevation', label: '桩顶标高', step: 'pouring' }
]

function createCheckItems(items: Omit<CheckItem, 'id' | 'checked'>[], checked = false): CheckItem[] {
  return items.map(item => ({
    ...item,
    id: generateId(),
    checked
  }))
}

function createPhoto(pileId: string, step: 'beforeDrilling' | 'reinforcementCage' | 'pouring', category: string, id: number): PhotoItem {
  const photoIds = {
    beforeDrilling: [1025, 1035, 1040],
    reinforcementCage: [1015, 1020, 1025],
    pouring: [1030, 1035, 1045]
  }
  const photoId = photoIds[step][id % photoIds[step].length]
  return {
    id: generateId(),
    url: `https://picsum.photos/id/${photoId + 200}/400/300`,
    pileId,
    step,
    category,
    shootTime: new Date(now - (id + 1) * 3600000).toISOString()
  }
}

export const mockPiles: PileInfo[] = [
  {
    id: 'pile001',
    pileNo: 'ZK-001',
    projectId: 'proj001',
    projectName: '滨海新区CBD桩基工程',
    pileType: '钻孔灌注桩',
    designLength: 35,
    designDiameter: 800,
    status: 'completed',
    currentStep: null,
    createTime: new Date(now - 3 * 86400000).toISOString(),
    hasRectification: false
  },
  {
    id: 'pile002',
    pileNo: 'ZK-002',
    projectId: 'proj001',
    projectName: '滨海新区CBD桩基工程',
    pileType: '钻孔灌注桩',
    designLength: 32,
    designDiameter: 800,
    status: 'inProgress',
    currentStep: 'reinforcementCage',
    createTime: new Date(now - 2 * 86400000).toISOString(),
    hasRectification: true
  },
  {
    id: 'pile003',
    pileNo: 'ZK-003',
    projectId: 'proj001',
    projectName: '滨海新区CBD桩基工程',
    pileType: '钻孔灌注桩',
    designLength: 38,
    designDiameter: 1000,
    status: 'inProgress',
    currentStep: 'beforeDrilling',
    createTime: new Date(now - 1 * 86400000).toISOString(),
    hasRectification: false
  },
  {
    id: 'pile004',
    pileNo: 'ZK-004',
    projectId: 'proj001',
    projectName: '滨海新区CBD桩基工程',
    pileType: '钻孔灌注桩',
    designLength: 30,
    designDiameter: 800,
    status: 'pending',
    currentStep: null,
    createTime: new Date(now - 12 * 3600000).toISOString(),
    hasRectification: false
  },
  {
    id: 'pile005',
    pileNo: 'ZK-005',
    projectId: 'proj001',
    projectName: '滨海新区CBD桩基工程',
    pileType: '钻孔灌注桩',
    designLength: 36,
    designDiameter: 900,
    status: 'pending',
    currentStep: null,
    createTime: new Date(now - 6 * 3600000).toISOString(),
    hasRectification: false
  },
  {
    id: 'pile006',
    pileNo: 'ZK-006',
    projectId: 'proj001',
    projectName: '滨海新区CBD桩基工程',
    pileType: '钻孔灌注桩',
    designLength: 33,
    designDiameter: 800,
    status: 'inProgress',
    currentStep: 'pouring',
    createTime: new Date(now - 4 * 3600000).toISOString(),
    hasRectification: false
  },
  {
    id: 'pile007',
    pileNo: 'SK-001',
    projectId: 'proj002',
    projectName: '科技园南区厂房桩基',
    pileType: '静压桩',
    designLength: 28,
    designDiameter: 500,
    status: 'completed',
    currentStep: null,
    createTime: new Date(now - 5 * 86400000).toISOString(),
    hasRectification: false
  },
  {
    id: 'pile008',
    pileNo: 'SK-002',
    projectId: 'proj002',
    projectName: '科技园南区厂房桩基',
    pileType: '静压桩',
    designLength: 25,
    designDiameter: 500,
    status: 'inProgress',
    currentStep: 'beforeDrilling',
    createTime: new Date(now - 2 * 86400000).toISOString(),
    hasRectification: true
  }
]

export const mockAcceptanceRecords: AcceptanceRecord[] = [
  {
    id: 'rec001',
    pileId: 'pile001',
    pileNo: 'ZK-001',
    projectId: 'proj001',
    steps: {
      beforeDrilling: {
        step: 'beforeDrilling',
        checked: true,
        checkItems: createCheckItems(baseCheckItemsBeforeDrilling, true),
        photos: [
          createPhoto('pile001', 'beforeDrilling', '孔口标识', 1),
          createPhoto('pile001', 'beforeDrilling', '孔位放线', 2)
        ],
        conclusion: '孔位准确，孔径符合设计要求，同意进行下一道工序。',
        inspector: '张监理',
        checkTime: new Date(now - 3 * 86400000 + 3600000).toISOString()
      },
      reinforcementCage: {
        step: 'reinforcementCage',
        checked: true,
        checkItems: createCheckItems(baseCheckItemsCage, true),
        photos: [
          createPhoto('pile001', 'reinforcementCage', '钢筋笼整体', 1),
          createPhoto('pile001', 'reinforcementCage', '焊接细节', 2),
          createPhoto('pile001', 'reinforcementCage', '保护层垫块', 3)
        ],
        conclusion: '钢筋笼规格符合设计要求，焊接质量合格，同意下笼。',
        inspector: '张监理',
        checkTime: new Date(now - 2.5 * 86400000).toISOString()
      },
      pouring: {
        step: 'pouring',
        checked: true,
        checkItems: createCheckItems(baseCheckItemsPouring, true),
        photos: [
          createPhoto('pile001', 'pouring', '导管安装', 1),
          createPhoto('pile001', 'pouring', '混凝土浇筑', 2)
        ],
        conclusion: '混凝土浇筑过程正常，导管埋深控制良好，桩顶标高符合要求。',
        inspector: '张监理',
        checkTime: new Date(now - 2 * 86400000).toISOString()
      }
    },
    overallConclusion: '验收合格',
    createTime: new Date(now - 3 * 86400000).toISOString(),
    updateTime: new Date(now - 2 * 86400000).toISOString()
  }
]

export const mockRectifications: RectificationItem[] = [
  {
    id: 'rect001',
    pileId: 'pile002',
    pileNo: 'ZK-002',
    projectId: 'proj001',
    projectName: '滨海新区CBD桩基工程',
    step: 'reinforcementCage',
    problemType: 'cageLengthShort',
    problemDesc: '钢筋笼实际长度29.5m，设计长度32m，短少2.5m。',
    requirement: '立即整改，接长钢筋笼至设计长度，焊接质量需符合规范要求，整改完成后报监理复查。',
    status: 'processing',
    createTime: new Date(now - 20 * 3600000).toISOString(),
    deadline: new Date(now + 4 * 3600000).toISOString(),
    handler: '李施工',
    recheckPhotos: []
  },
  {
    id: 'rect002',
    pileId: 'pile008',
    pileNo: 'SK-002',
    projectId: 'proj002',
    projectName: '科技园南区厂房桩基',
    step: 'beforeDrilling',
    problemType: 'holeDeviation',
    problemDesc: '桩位实测偏差8cm，超出规范允许偏差范围（≤5cm）。',
    requirement: '重新放线定位，调整桩位至设计位置，经复核后方可开钻。',
    status: 'rechecking',
    createTime: new Date(now - 40 * 3600000).toISOString(),
    deadline: new Date(now - 10 * 3600000).toISOString(),
    handler: '王工长',
    recheckDesc: '已重新定位，实测偏差2cm，符合规范要求。',
    recheckTime: new Date(now - 8 * 3600000).toISOString(),
    recheckPhotos: [
      createPhoto('pile008', 'beforeDrilling', '复位后孔位', 1)
    ]
  },
  {
    id: 'rect003',
    pileId: 'pile001',
    pileNo: 'ZK-001',
    projectId: 'proj001',
    projectName: '滨海新区CBD桩基工程',
    step: 'pouring',
    problemType: 'conduitDepth',
    problemDesc: '首次浇筑时导管埋深不足，仅0.8m。',
    requirement: '严格控制导管埋深在2-6m范围内，每次拆管前测量混凝土面标高。',
    status: 'closed',
    createTime: new Date(now - 5 * 86400000).toISOString(),
    deadline: new Date(now - 4.5 * 86400000).toISOString(),
    handler: '李施工',
    recheckDesc: '后续浇筑过程中导管埋深控制在2.5-5m，符合要求。',
    recheckTime: new Date(now - 4 * 86400000).toISOString(),
    recheckPhotos: [
      createPhoto('pile001', 'pouring', '测量导管埋深', 1),
      createPhoto('pile001', 'pouring', '浇筑记录', 2)
    ],
    closeTime: new Date(now - 3.5 * 86400000).toISOString(),
    closer: '张监理'
  }
]

export const checkItemTemplates = {
  beforeDrilling: baseCheckItemsBeforeDrilling,
  reinforcementCage: baseCheckItemsCage,
  pouring: baseCheckItemsPouring
}
