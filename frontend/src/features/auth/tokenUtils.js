/**
 * Decode a JWT and check whether it has expired.
 * Does NOT verify the signature — the server validates on every request.
 *
 * @param {string} token
 * @returns {boolean} true if the token is expired or malformed
 */
export function isTokenExpired(token) {
  try {
    const base64Payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64Payload))
    if (!payload.exp) return true
    // 10-second clock-skew buffer
    return payload.exp * 1000 < Date.now() - 10_000
  } catch {
    return true // malformed token → treat as expired
  }
}
