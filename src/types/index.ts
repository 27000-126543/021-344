export type AcceptanceStep = 'beforeDrilling' | 'reinforcementCage' | 'pouring'

export type AcceptanceStatus = 'pending' | 'inProgress' | 'completed'

export type RectificationStatus = 'pending' | 'processing' | 'rechecking' | 'closed'

export interface ProjectInfo {
  id: string
  name: string
  location: string
  totalPiles: number
  completedPiles: number
}

export interface PileInfo {
  id: string
  pileNo: string
  projectId: string
  projectName: string
  pileType: string
  designLength: number
  designDiameter: number
  status: AcceptanceStatus
  currentStep: AcceptanceStep | null
  createTime: string
  hasRectification: boolean
}

export interface CheckItem {
  id: string
  key: string
  label: string
  step: AcceptanceStep
  checked: boolean
  remark?: string
}

export interface PhotoItem {
  id: string
  url: string
  pileId: string
  step: AcceptanceStep
  category: string
  shootTime: string
  location?: string
}

export interface StepResult {
  step: AcceptanceStep
  checked: boolean
  checkItems: CheckItem[]
  photos: PhotoItem[]
  conclusion: string
  inspector: string
  checkTime: string
}

export interface AcceptanceRecord {
  id: string
  pileId: string
  pileNo: string
  projectId: string
  steps: {
    beforeDrilling: StepResult | null
    reinforcementCage: StepResult | null
    pouring: StepResult | null
  }
  overallConclusion: string
  createTime: string
  updateTime: string
}

export interface RectificationItem {
  id: string
  pileId: string
  pileNo: string
  projectId: string
  projectName: string
  step: AcceptanceStep
  problemType: string
  problemDesc: string
  requirement: string
  status: RectificationStatus
  createTime: string
  deadline: string
  handler: string
  recheckDesc?: string
  recheckTime?: string
  recheckPhotos: PhotoItem[]
  closeTime?: string
  closer?: string
  rejectReason?: string
}

export type TimelineNodeType =
  | 'create'
  | 'step'
  | 'rect_create'
  | 'rect_recheck'
  | 'rect_approve'
  | 'rect_reject'
  | 'photo_save'
  | 'archive_generate'
  | 'archive_confirm'
  | 'complete'

export interface TimelineNode {
  id: string
  type: TimelineNodeType
  pileId: string
  title: string
  description?: string
  time: string
  step?: AcceptanceStep
  rectId?: string
  photoCount?: number
  operator?: string
}

export interface ArchivePackage {
  id: string
  pileId: string
  pileNo: string
  projectId: string
  projectName: string
  steps: {
    beforeDrilling: StepResult | null
    reinforcementCage: StepResult | null
    pouring: StepResult | null
  }
  rectifications: RectificationItem[]
  overallConclusion: string
  generateTime: string
  confirmed: boolean
  confirmTime?: string
  confirmer?: string
  totalPhotos: number
  totalCheckItems: number
  passedCheckItems: number
  rectificationCount: number
  closedRectificationCount: number
}

export type ProblemType =
  | 'holeDeviation'
  | 'cageLengthShort'
  | 'collapseRisk'
  | 'weldingQuality'
  | 'conduitDepth'
  | 'other'

export const ProblemTypeMap: Record<ProblemType, string> = {
  holeDeviation: '孔位偏差',
  cageLengthShort: '笼长不足',
  collapseRisk: '塌孔风险',
  weldingQuality: '焊接质量',
  conduitDepth: '导管埋深',
  other: '其他问题'
}

export const AcceptanceStepMap: Record<AcceptanceStep, string> = {
  beforeDrilling: '成孔前复核',
  reinforcementCage: '钢筋笼验收',
  pouring: '灌注旁站'
}

export const AcceptanceStatusMap: Record<AcceptanceStatus, string> = {
  pending: '待验收',
  inProgress: '验收中',
  completed: '已完成'
}

export const RectificationStatusMap: Record<RectificationStatus, string> = {
  pending: '待整改',
  processing: '整改中',
  rechecking: '待复查',
  closed: '已关闭'
}
