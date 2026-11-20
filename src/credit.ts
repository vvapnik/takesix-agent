// "Made with TakeSix": a small link in the corner of the HTML files that
// `takesix render` and the MCP tool `show` write. A shared diagram then tells
// its reader where it came from. Off with `--no-credit`, `credit: false` or
// the environment variable TAKESIX_NO_CREDIT=1.

const SITE = 'https://takesix.vapnik.de/?ref=made-with'

const CREDIT = `<a class="takesix-credit" href="${SITE}" target="_blank" rel="noopener">Made with TakeSix</a>
<style>
.takesix-credit{position:fixed;right:12px;bottom:10px;z-index:1;padding:2px 6px;border-radius:4px;
font:500 11px/1.4 system-ui,-apple-system,sans-serif;color:#8a97a8;text-decoration:none;opacity:.75}
.takesix-credit:hover,.takesix-credit:focus-visible{opacity:1;text-decoration:underline}
@media print{.takesix-credit{display:none}}
</style>
`

/** True unless TAKESIX_NO_CREDIT is set to something other than 0 or false. */
export function creditFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const off = env.TAKESIX_NO_CREDIT
  return off === undefined || off === '' || off === '0' || off.toLowerCase() === 'false'
}

/** Adds the link before `</body>`; returns the page unchanged when `on` is false. */
export function withCredit(html: string, on = true): string {
  if (!on) return html
  const at = html.lastIndexOf('</body>')
  return at < 0 ? html + CREDIT : html.slice(0, at) + CREDIT + html.slice(at)
}
