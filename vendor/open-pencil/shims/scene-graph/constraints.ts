/**
 * Missing from published @open-pencil/scene-graph@0.17.0-beta.2 dist (exports declare it).
 * Thin reimplementation against the public package surface.
 */
import type { SceneGraph, SceneNode, ConstraintType } from '@open-pencil/scene-graph'
import { FITTED_CONTAINER_TYPES } from '@open-pencil/scene-graph/node-defaults'

type ConstraintGraph = Pick<SceneGraph, 'getNode' | 'closest'>

export const CONSTRAINT_PARENT_TYPES: ReadonlySet<SceneNode['type']> = new Set<SceneNode['type']>([
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])

export function constraintFrame(graph: ConstraintGraph, node: SceneNode): SceneNode | null {
  let layer = node
  const parent = node.parentId
    ? graph.closest(node.parentId, (ancestor) => {
        if (!FITTED_CONTAINER_TYPES.has(ancestor.type)) return true
        layer = ancestor
        return false
      })
    : undefined
  if (!parent || !CONSTRAINT_PARENT_TYPES.has(parent.type)) return null
  if (parent.layoutMode !== 'NONE' && layer.layoutPositioning !== 'ABSOLUTE') return null
  return parent
}

export function isConstraintEligible(graph: ConstraintGraph, node: SceneNode): boolean {
  return constraintFrame(graph, node) !== null
}

export function constraintLayers(graph: ConstraintGraph, node: SceneNode): SceneNode[] {
  if (!FITTED_CONTAINER_TYPES.has(node.type)) return [node]
  return node.childIds.flatMap((id) => {
    const child = graph.getNode(id)
    return child ? constraintLayers(graph, child) : []
  })
}

export function sharedConstraint(
  layers: readonly SceneNode[],
  key: 'horizontalConstraint' | 'verticalConstraint'
): ConstraintType | null {
  const first = layers.at(0)?.[key]
  if (first === undefined) return null
  return layers.every((layer) => layer[key] === first) ? first : null
}
