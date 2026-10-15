// The objective the rep holds for the job in hand: the same shapes as in
// hooks/rep.ts, declared again here because this file must stand alone.
export type ConditionState = 'open' | 'not-shown' | 'shown' | 'closed'
export type Condition = { text: string; state: ConditionState; by: string }
export type Objective = {
  result: string
  purpose: string
  done: Condition[]
  step: string
  openedAt: number
  since: number
  from: number
  movedAt: number | null
  cause: string
  revisions: number
  versions: Array<{ at: number; cause: string; text: string }>
}

export type Now = {
  doing: string
  helpers: number
  isWorking: boolean
  mark: string
}

export type Note = {
  line: string
  why: string
  shownAt: number
  turnId: string
}

export type Checked = {
  holds: string[]
  wrong: string[]
  notShown: string[]
  changed: string[]
  looked: string
  // How many of the run's commands were refused; the right number is zero.
  refused: number
}

export type Brief = {
  // The objective as prose, whole; the row shows only its result.
  reading: string
  // The line under the head when the reading has moved; '' when it has not.
  revised: string
  well: string
  stands: string
  means: string
  leftOut: string[]
  next: string
  message: string
  does: string
  at: number
  spent: string
  // The conversation's size as a figure, drawn on the buttons row so it never folds away.
  size: string
  // The check step: running, done (`checked`), or why it could not run.
  isChecking: boolean
  checked: Checked | null
  checkNote: string
  // What a check costs, from the last one here or the measured first one.
  checkCost: string
}

export type View = 'row' | 'note' | 'reading' | 'brief'

declare module 'claude-code' {
  interface PluginState {
    'owner-rep': {
      // The objective the rep holds for the job in hand; the row shows its result.
      // Kept under a shape tag, so what an older build wrote here reads as absent.
      reading: Shaped<Objective | null>
      now: Now
      note: Note | null
      brief: Brief | null
      view: View
      helperIds: string[]
    }
  }
}
