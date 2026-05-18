import crypto from 'crypto'

const SECRET = process.env.ACTION_SECRET || 'itinera-venue-action-secret-2024'

export function generateActionToken(reservationId: string, action: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`${reservationId}:${action}`)
    .digest('hex')
    .slice(0, 24)
}

export function verifyActionToken(
  reservationId: string,
  action: string,
  token: string,
): boolean {
  const expected = generateActionToken(reservationId, action)
  return expected === token
}
