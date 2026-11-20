import { describe, expect, it } from 'vitest'
import { creditFromEnv, withCredit } from '../src/credit.js'

describe('withCredit', () => {
  const page = '<html><body><div id="root"></div></body></html>'

  it('puts the link before </body>', () => {
    const html = withCredit(page)
    expect(html).toMatch(/<div id="root"><\/div><a class="takesix-credit" href="https:\/\/takesix\.vapnik\.de\/[^"]*"/)
    expect(html.endsWith('</body></html>')).toBe(true)
  })

  it('leaves the page alone when off', () => {
    expect(withCredit(page, false)).toBe(page)
  })
})

describe('creditFromEnv', () => {
  it('is on unless TAKESIX_NO_CREDIT is set', () => {
    expect(creditFromEnv({})).toBe(true)
    expect(creditFromEnv({ TAKESIX_NO_CREDIT: '0' })).toBe(true)
    expect(creditFromEnv({ TAKESIX_NO_CREDIT: 'false' })).toBe(true)
    expect(creditFromEnv({ TAKESIX_NO_CREDIT: '1' })).toBe(false)
    expect(creditFromEnv({ TAKESIX_NO_CREDIT: 'yes' })).toBe(false)
  })
})
