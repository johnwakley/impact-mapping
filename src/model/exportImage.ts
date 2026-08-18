import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react'
import { toPng } from 'html-to-image'

const MAX_EDGE = 4400

/**
 * Rasterise the whole map, not just what is on screen: bounds come from the
 * nodes, and the viewport transform is recomputed to frame them.
 */
export async function exportPng(nodes: Node[], filename: string): Promise<void> {
  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!viewportEl || nodes.length === 0) {
    throw new Error('There is nothing on the canvas to export.')
  }

  const bounds = getNodesBounds(nodes)
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(bounds.width, 1),
    MAX_EDGE / Math.max(bounds.height, 1),
  )
  const width = Math.ceil(bounds.width * scale) + 120
  const height = Math.ceil(bounds.height * scale) + 120
  const viewport = getViewportForBounds(bounds, width, height, 0.05, 2, 0.06)

  const background = getComputedStyle(document.documentElement)
    .getPropertyValue('--canvas')
    .trim()

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: background || '#ffffff',
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  })

  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
