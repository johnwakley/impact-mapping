import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { GoalNode } from '../types.ts'
import { goalProgress } from './metric.ts'

function goal(extra: Partial<GoalNode>): GoalNode {
  return {
    id: 'g',
    kind: 'goal',
    title: 'A goal',
    parent: null,
    children: [],
    ...extra,
  }
}

describe('goal progress', () => {
  it('measures a metric that should go up', () => {
    const { fraction, measurable } = goalProgress(
      goal({ baseline: 400, current: 520, target: 1000 }),
    )
    assert.equal(measurable, true)
    assert.equal(Math.round(fraction * 100), 20)
  })

  it('measures a metric that should go down', () => {
    // Waiting times, defects, churn, cost. 41 -> 10, currently 38.
    const { fraction, measurable } = goalProgress(
      goal({ baseline: 41, current: 38, target: 10 }),
    )
    assert.equal(measurable, true)
    assert.equal(Math.round(fraction * 100), 10)
  })

  it('handles a target that crosses zero', () => {
    // A loss becoming a profit: -1040 -> 100.
    const start = goalProgress(goal({ baseline: -1040, target: 100 }))
    assert.equal(start.fraction, 0)
    const halfway = goalProgress(goal({ baseline: -1040, current: -470, target: 100 }))
    assert.equal(Math.round(halfway.fraction * 100), 50)
  })

  it('clamps overshoot and regression to the bar', () => {
    assert.equal(goalProgress(goal({ baseline: 0, current: 500, target: 100 })).fraction, 1)
    assert.equal(goalProgress(goal({ baseline: 0, current: -50, target: 100 })).fraction, 0)
    // Downward goal, overshot past the target.
    assert.equal(goalProgress(goal({ baseline: 41, current: 2, target: 10 })).fraction, 1)
  })

  it('says so when there is nothing to measure', () => {
    assert.equal(goalProgress(goal({})).measurable, false)
    assert.equal(goalProgress(goal({ baseline: 10, target: 10 })).measurable, false)
    assert.equal(goalProgress(goal({ metric: 'Something' })).measurable, false)
  })

  it('falls back to the baseline when there is no current reading', () => {
    assert.equal(goalProgress(goal({ baseline: 400, target: 1000 })).at, 400)
  })
})
