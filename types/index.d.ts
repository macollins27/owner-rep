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

export type Brief = {
  goal: string
  well: string
  stands: string
  means: string
  leftOut: string[]
  next: string
  message: string
  does: string
  at: number
  spent: string
}

export type View = 'row' | 'note' | 'reading' | 'brief' | 'goal'

declare module 'claude-code' {
  interface PluginState {
    'owner-rep': {
      goal: string | null
      isPinned: boolean
      now: Now
      note: Note | null
      brief: Brief | null
      view: View
      helperIds: string[]
    }
  }
}
