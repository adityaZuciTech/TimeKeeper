import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RejectionBanner from './RejectionBanner'

const TS_ID = 'ts_001'
const REASON = 'Insufficient hours logged'
const KEY = `rejection-dismissed::${TS_ID}::${REASON}`

describe('RejectionBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── RB-01: banner visible when no dismiss key in localStorage ─────────────

  it('RB-01: shows banner when no dismiss key in localStorage', () => {
    render(<RejectionBanner timesheetId={TS_ID} rejectionReason={REASON} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Insufficient hours logged/)).toBeInTheDocument()
  })

  // ── RB-02: clicking X sets localStorage key and hides banner ─────────────

  it('RB-02: clicking dismiss hides banner and sets localStorage key', () => {
    render(<RejectionBanner timesheetId={TS_ID} rejectionReason={REASON} />)

    fireEvent.click(screen.getByLabelText('Dismiss rejection reason'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(localStorage.getItem(KEY)).toBe('1')
  })

  // ── RB-03: pre-set localStorage key → banner not shown ────────────────────

  it('RB-03: banner is hidden when localStorage key is already set', () => {
    localStorage.setItem(KEY, '1')

    render(<RejectionBanner timesheetId={TS_ID} rejectionReason={REASON} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // ── RB-04: new rejection reason → banner re-appears ──────────────────────

  it('RB-04: new rejection reason shows banner even if old reason was dismissed', () => {
    // Old reason was dismissed
    localStorage.setItem(KEY, '1')

    const newReason = 'Missing project code'
    render(<RejectionBanner timesheetId={TS_ID} rejectionReason={newReason} />)

    // The key for newReason has NOT been set, so banner should show
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Missing project code/)).toBeInTheDocument()
  })
})
