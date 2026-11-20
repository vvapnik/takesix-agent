import { describe, expect, it } from 'vitest'
import { frameHeight } from '../src/mcp/frame.js'

describe('frameHeight', () => {
  it('fills the screen in full screen mode', () => {
    expect(frameHeight({ displayMode: 'fullscreen' }, 900)).toBe('100vh')
  })

  it('keeps a height the host fixes', () => {
    expect(frameHeight({ containerDimensions: { height: 400 } }, 900)).toBe('400px')
  })

  it('grows inline to what the diagram needs, from the default height', () => {
    expect(frameHeight(undefined)).toBe('560px')
    expect(frameHeight(undefined, 300)).toBe('560px')
    // a narrow chat column: rows as tall as their content
    expect(frameHeight(undefined, 640.4)).toBe('641px')
  })

  it('stays within the host cap', () => {
    expect(frameHeight({ containerDimensions: { maxHeight: 600 } }, 900)).toBe('600px')
    expect(frameHeight({ containerDimensions: { maxHeight: 400 } })).toBe('400px')
  })
})
