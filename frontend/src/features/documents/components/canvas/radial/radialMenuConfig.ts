import type { ShapePrimitiveType } from '../utils/insertShapeToSource'

export interface SectorConfig {
  type: ShapePrimitiveType
  label: string
  shortcut: string
  centerAngle: number
  startAngle: number
  endAngle: number
  centerPos: { x: number; y: number }
  dataQa: string
}

export function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

export function describeArc(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const startOuter = polarToCartesian(x, y, outerRadius, startAngle)
  const endOuter = polarToCartesian(x, y, outerRadius, endAngle)
  const startInner = polarToCartesian(x, y, innerRadius, endAngle)
  const endInner = polarToCartesian(x, y, innerRadius, startAngle)

  const arcSweep = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    'M',
    startOuter.x.toFixed(2),
    startOuter.y.toFixed(2),
    'A',
    outerRadius,
    outerRadius,
    0,
    arcSweep,
    1,
    endOuter.x.toFixed(2),
    endOuter.y.toFixed(2),
    'L',
    startInner.x.toFixed(2),
    startInner.y.toFixed(2),
    'A',
    innerRadius,
    innerRadius,
    0,
    arcSweep,
    0,
    endInner.x.toFixed(2),
    endInner.y.toFixed(2),
    'Z',
  ].join(' ')
}

export const CENTER_X = 100
export const CENTER_Y = 100
export const INNER_RADIUS = 32
export const OUTER_RADIUS = 92
export const MID_RADIUS = 63

export const SECTORS: SectorConfig[] = [
  {
    type: 'rectangle',
    label: 'Rectangle',
    shortcut: 'R',
    centerAngle: 270,
    startAngle: 180,
    endAngle: 359.99,
    centerPos: polarToCartesian(CENTER_X, CENTER_Y, MID_RADIUS, 270),
    dataQa: 'radial-item-rectangle',
  },
  {
    type: 'circle',
    label: 'Circle',
    shortcut: 'C',
    centerAngle: 90,
    startAngle: 0,
    endAngle: 180,
    centerPos: polarToCartesian(CENTER_X, CENTER_Y, MID_RADIUS, 90),
    dataQa: 'radial-item-circle',
  },
]
