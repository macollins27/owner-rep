// The objective the rep holds for the job in hand: the same shapes as in
// hooks/rep.ts, declared again here because this file must stand alone.
export type ConditionState = 'open' | 'not-shown' | 'shown' | 'closed'
// `reopened`: the check moved it back from shown to not shown, so only a
// check's own shown mark moves it shown again. Absent means not reopened.
export type Condition = { text: string; state: ConditionState; by: string; reopened?: boolean }
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
  // The result's first sentence, the card's head; '' when no objective was held.
  result: string
  // How many things done means and how many are shown, open and closed by the owner; '' with none held.
  count: string
  // The objective as prose, whole, drawn at the card's end when the rows allow.
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

// The owner's messages as the session record keeps them, and the turns they answered, captured
// from the stream: the same shapes as in hooks/rep.ts, declared again for the same reason.
export type OwnerKind = 'his' | 'note' | 'draft' | 'plan'
// Whether the agent's words a message answered could be read when it came.
export type ReadState = { state: 'read' | 'waiting' | 'unreadable'; why?: string }
export type TurnBy = 'owner' | 'notification' | 'continuation' | 'other'
// A saved text: its length, the SHA-256 of its UTF-8 bytes ('' only for one too long to keep),
// where it is held, `text` only when inline, and `lost` when it cannot be read.
export type SourceRef = { chars: number; sha: string; where: 'file' | 'inline' | 'memory'; text?: string; lost?: string }
// One turn's place in a message's body; `merged` counts the turns a merged span holds.
export type TurnSpan = {
  by: TurnBy
  from: number
  to: number
  note?: 'interrupted' | 'typed-into'
  incomplete?: string
  merged?: Partial<Record<TurnBy, number>>
}
// A finished turn the owner has not answered yet, in the record's `pending` list.
export type PendingTurn = { turnId: string; by: TurnBy; src?: SourceRef; incomplete?: string; note?: 'interrupted' }
export type OwnerMsg = {
  n: number
  kind: OwnerKind
  text: string
  prior: string
  turns?: TurnSpan[]
  incomplete?: string
  // Present when the message approves: what the owner took ('' when it sits in `src.took`).
  approved?: string
  read?: ReadState
  screen?: 'accepted' | 'edited' | 'rejected'
  withDraft?: number
  toolUseId?: string
  // An approval of the open job kept past the trim.
  pinned?: true
  src?: { body?: SourceRef; took?: SourceRef; rejected?: SourceRef; sent?: SourceRef }
}

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
      // What the record could not keep or save, for the row and the card (at most three lines).
      lines: string[]
    }
  }
}
