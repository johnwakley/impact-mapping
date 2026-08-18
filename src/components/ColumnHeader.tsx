import type { Node, NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { ReactElement } from 'react'
import type { NodeKind } from '../types.ts'
import { KIND_META } from '../model/schema.ts'

export interface HeaderData extends Record<string, unknown> {
  kind: NodeKind
}

export type HeaderNode = Node<HeaderData, 'columnHeader'>

/**
 * The four questions, floating above their columns. They live on the canvas
 * rather than in a fixed toolbar so they pan and zoom with the map — the
 * columns are the method, and the method should stay attached to the work.
 */
function ColumnHeaderImpl({ data }: NodeProps<HeaderNode>): ReactElement {
  const meta = KIND_META[data.kind]
  return (
    <div className={`column-header node--${data.kind}`}>
      <div className="column-header__q">{meta.question}</div>
      <div className="column-header__label">{meta.plural}</div>
      <div className="column-header__prompt">{meta.prompt}</div>
    </div>
  )
}

export const ColumnHeader = memo(ColumnHeaderImpl)
