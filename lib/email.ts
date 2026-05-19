import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Helper : throw si Resend retourne une erreur (SDK v2 ne throw pas)
async function sendEmail(params: Parameters<typeof resend.emails.send>[0]) {
  const result = await resend.emails.send(params)
  if (result.error) {
    const code = (result.error as { statusCode?: number }).statusCode ?? ''
    throw new Error(`Resend error ${code}: ${result.error.message} (${result.error.name})`)
  }
  return result
}

// ── Formate un numéro de téléphone pour WhatsApp ───────────
function toWaPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.startsWith('0')) return '33' + digits.slice(1)
  return digits
}

// ── Nom d'expéditeur unifié : "ITINERA · {RP}" ─────────────
function senderName(rpDisplayName?: string): string {
  const brand = process.env.MANAGER_NAME || 'ITINERA'
  return rpDisplayName ? `${brand} · ${rpDisplayName}` : brand
}

// ── Parse la note interne (JSON ou texte brut) ─────────────
function formatInternalNote(raw: string | undefined | null): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const parts: string[] = []
      if (parsed.note) parts.push(parsed.note)
      if (parsed.nationality) parts.push(`🌍 ${parsed.nationality}`)
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        parts.push(`🍾 ${parsed.products.join(', ')}`)
      }
      return parts.length > 0 ? parts.join(' · ') : raw
    }
  } catch { /* texte brut */ }
  return raw ?? ''
}

// ── Type pour un voyage complet ────────────────────────────
export type TripBooking = {
  establishment: string
  destination: string
  date: string
  time: string
  guests: number
  occasion?: string
  seating?: string
  specialRequests?: string
  establishmentEmail: string
  establishmentPhone: string
  viewUrl?: string   // lien vers /host/confirm/[id] — page interactive confirm/décline
}

export type TripData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  bookings: TripBooking[]
  rpDisplayName?: string
  rpEmail?: string     // email du RP destinataire
  rpWhatsapp?: string  // WhatsApp du RP
  vipTag?: string      // profil VIP du client (ex: "VVIP", "Regular", etc.)
  internalNote?: string // note privée du RP sur ce client
}

// ── Génère le message WhatsApp de transfert pour UNE réservation du trip ──
function buildTripBookingWhatsappMessage(
  b: TripBooking,
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  vipTag?: string,
  internalNote?: string,
): string {
  const lines: string[] = []

  // Lien de gestion en tête — page interactive confirm/décline
  if (b.viewUrl) {
    lines.push(`📋 *Voir & gérer la réservation :*`)
    lines.push(b.viewUrl)
    lines.push(``)
  }

  // Détails réservation
  lines.push(
    `📍 *${b.establishment}*${b.destination ? ` · ${b.destination}` : ''}`,
    `📅 ${b.date} · ${b.time}`,
    `👥 ${b.guests} personne${b.guests > 1 ? 's' : ''}`,
  )
  if (b.occasion) lines.push(`🎉 ${b.occasion}`)
  if (b.seating) lines.push(`🪑 ${b.seating}`)
  if (b.specialRequests) lines.push(`💬 ${b.specialRequests}`)

  // Client
  lines.push(``, `👤 *${firstName} ${lastName}*`, `📞 ${phone}`, `✉️ ${email}`)
  if (vipTag) lines.push(`⭐ *${vipTag}*`)

  // Note privée (texte brut ou JSON structuré)
  if (internalNote) {
    try {
      const parsed = JSON.parse(internalNote)
      if (typeof parsed === 'object' && parsed !== null) {
        const parts: string[] = []
        if (parsed.note)        parts.push(parsed.note)
        if (parsed.nationality) parts.push(`Nationalité : ${parsed.nationality}`)
        if (Array.isArray(parsed.products) && parsed.products.length)
          parts.push(`Préférences : ${parsed.products.join(', ')}`)
        if (parts.length) lines.push(`📝 ${parts.join(' · ')}`)
      }
    } catch {
      lines.push(`📝 ${internalNote}`)
    }
  }

  // Contact restaurant
  if (b.establishmentPhone) {
    lines.push(
      ``,
      `📲 Contacter le restaurant :`,
      `https://wa.me/${toWaPhone(b.establishmentPhone)}?text=${encodeURIComponent(`Bonjour, réservation pour ${b.guests} pers. le ${b.date} à ${b.time} — ${firstName} ${lastName}.${b.occasion ? ` Occasion : ${b.occasion}.` : ''}${b.specialRequests ? ` Notes : ${b.specialRequests}` : ''}`)}`
    )
  }

  return lines.join('\n')
}

// ── Email récap voyage — UN seul email, une section + bouton WhatsApp par réservation ──
export async function sendTripSummaryEmail(data: TripData) {
  const managerName = process.env.MANAGER_NAME || 'ITINERA'
  const rpName = data.rpDisplayName || managerName

  const bookingRows = data.bookings.map((b, i) => {
    // Message WhatsApp spécifique à cette réservation
    const waMsg = buildTripBookingWhatsappMessage(b, data.firstName, data.lastName, data.phone, data.email, data.vipTag, data.internalNote)

    return `
    <!-- ══ Réservation ${i + 1} ══ -->
    <div style="margin-bottom: 8px; background: #1a1a1a; border: 1px solid #2a2a2a; border-left: 3px solid #C9A84C;">

      <!-- En-tête réservation -->
      <div style="padding: 18px 24px 14px; border-bottom: 1px solid #242424;">
        <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px;">
          Réservation ${i + 1} / ${data.bookings.length}
        </div>
        <div>
          <span style="color: #f5f0e8; font-size: 19px; font-style: italic;">${b.establishment}</span>
          ${b.destination ? `<span style="color: #C9A84C; font-size: 12px; margin-left: 8px; letter-spacing: 1px;">· ${b.destination}</span>` : ''}
        </div>
      </div>

      <!-- Détails -->
      <div style="padding: 16px 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; width: 50%;">
              <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #666; display: block; margin-bottom: 2px;">Date</span>
              <span style="color: #f5f0e8; font-size: 14px;">${b.date}</span>
            </td>
            <td style="padding: 5px 0;">
              <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #666; display: block; margin-bottom: 2px;">Service</span>
              <span style="color: #f5f0e8; font-size: 14px;">${b.time}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #666; display: block; margin-bottom: 2px;">Personnes</span>
              <span style="color: #f5f0e8; font-size: 14px;">${b.guests} personne${b.guests > 1 ? 's' : ''}</span>
            </td>
            ${b.occasion ? `<td style="padding: 5px 0;">
              <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #666; display: block; margin-bottom: 2px;">Occasion</span>
              <span style="color: #f5f0e8; font-size: 14px;">${b.occasion}</span>
            </td>` : '<td></td>'}
          </tr>
          ${b.seating ? `<tr><td colspan="2" style="padding: 5px 0;">
            <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #666; display: block; margin-bottom: 2px;">Placement</span>
            <span style="color: #f5f0e8; font-size: 14px;">${b.seating}</span>
          </td></tr>` : ''}
          ${b.specialRequests ? `<tr><td colspan="2" style="padding: 8px 0 0;">
            <div style="background: #141414; border-left: 2px solid #C9A84C; padding: 10px 14px; font-style: italic; color: #c4c4c4; font-size: 13px;">"${b.specialRequests}"</div>
          </td></tr>` : ''}
        </table>
      </div>

      <!-- Boutons d'action propres à cette réservation -->
      <div style="padding: 0 24px 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 0 5px 0 0; width: 50%;">
              <a href="https://wa.me/?text=${encodeURIComponent(waMsg)}"
                 style="display: block; background: #1e1e1e; border: 1px solid rgba(201,168,76,0.45); color: #C9A84C; padding: 13px 10px; text-decoration: none; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; text-align: center; font-family: Helvetica, Arial, sans-serif;">
                💬 Transférer à mon contact WhatsApp
              </a>
            </td>
            <td style="padding: 0 0 0 5px;">
              <a href="https://wa.me/${toWaPhone(data.phone)}?text=${encodeURIComponent(`Bonjour ${data.firstName}, j'ai bien reçu votre demande pour ${b.establishment} le ${b.date} à ${b.time}. Je reviens vers vous rapidement.`)}"
                 style="display: block; background: #1e1e1e; border: 1px solid rgba(255,255,255,0.1); color: #d4d4d4; padding: 13px 10px; text-decoration: none; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; text-align: center; font-family: Helvetica, Arial, sans-serif;">
                💬 Répondre au client
              </a>
            </td>
          </tr>
        </table>
        ${b.viewUrl ? `
        <!-- Bouton gérer — page interactive confirm/décline -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <tr>
            <td>
              <a href="${b.viewUrl}"
                 style="display: block; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.3); color: #C9A84C; padding: 11px 10px; text-decoration: none; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; text-align: center; font-family: Helvetica, Arial, sans-serif;">
                📋 Voir & gérer la réservation
              </a>
            </td>
          </tr>
        </table>` : ''}
      </div>

    </div>`
  }).join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Georgia, serif; background: #0a0a0a; color: #f5f0e8; margin: 0; padding: 0;">
  <div style="max-width: 620px; margin: 0 auto; background: #141414;">

    <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1e1e1e 100%); padding: 40px; text-align: center; border-bottom: 2px solid #C9A84C;">
      <div style="color: #C9A84C; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px;">✦ Voyage Complet ✦</div>
      <h1 style="color: #f5f0e8; font-size: 28px; margin: 0 0 8px; font-style: italic;">Itinéraire de voyage</h1>
      <div style="color: #9a9a9a; font-size: 13px; letter-spacing: 1px;">
        ${data.bookings.length} réservation${data.bookings.length > 1 ? 's' : ''} · ${rpName}
      </div>
    </div>

    <div style="padding: 36px 40px;">

      <!-- Client -->
      <div style="background: #1e1e1e; border: 1px solid rgba(201,168,76,0.25); padding: 20px 24px; margin-bottom: 28px;">
        <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 14px;">Profil client</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; width: 50%;">
              <span style="color: #9a9a9a; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Nom</span><br>
              <span style="color: #f5f0e8; font-size: 16px;">${data.firstName} ${data.lastName}</span>
            </td>
            <td style="padding: 4px 0;">
              <span style="color: #9a9a9a; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Téléphone</span><br>
              <span style="color: #f5f0e8; font-size: 16px;">${data.phone}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 8px 0 0;">
              <span style="color: #9a9a9a; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Email</span><br>
              <span style="color: #f5f0e8; font-size: 16px;">${data.email}</span>
            </td>
          </tr>
          ${data.vipTag ? `<tr>
            <td colspan="2" style="padding: 10px 0 0;">
              <span style="color: #9a9a9a; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Profil VIP</span><br>
              <span style="color: #C9A84C; font-size: 15px; font-weight: bold; letter-spacing: 1px;">✦ ${data.vipTag}</span>
            </td>
          </tr>` : ''}
        </table>
        ${data.internalNote ? (() => {
          // Parser la note (peut être JSON structuré ou texte brut)
          let noteHtml = ''
          try {
            const parsed = JSON.parse(data.internalNote)
            if (typeof parsed === 'object' && parsed !== null) {
              const parts: string[] = []
              if (parsed.note)        parts.push(`<strong>Note :</strong> ${parsed.note}`)
              if (parsed.nationality) parts.push(`<strong>Nationalité :</strong> ${parsed.nationality}`)
              if (Array.isArray(parsed.products) && parsed.products.length)
                parts.push(`<strong>Préférences :</strong> ${parsed.products.join(', ')}`)
              noteHtml = parts.join('<br>')
            }
          } catch { /* texte brut */ }
          if (!noteHtml) noteHtml = data.internalNote
          return `<div style="margin-top: 14px; border-top: 1px solid #2a2a2a; padding-top: 14px;">
            <span style="color: #9a9a9a; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Notes privées</span>
            <div style="background: #141414; border-left: 3px solid #C9A84C; padding: 12px 16px; color: #c4a96b; font-size: 13px; font-style: italic; line-height: 1.6;">${noteHtml}</div>
          </div>`
        })() : ''}
      </div>

      <!-- Titre programme -->
      <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px;">
        Programme du séjour — ${data.bookings.length} réservation${data.bookings.length > 1 ? 's' : ''}
      </div>

      <!-- Réservations (une section par restaurant) -->
      ${bookingRows}

    </div>

    <div style="padding: 24px 40px; text-align: center; border-top: 1px solid #2a2a2a;">
      <p style="color: #555; font-size: 12px; letter-spacing: 1px; margin: 0;">${rpName} — Système de réservation privé</p>
    </div>
  </div>
</body>
</html>`

  const toRp = data.rpEmail || process.env.MANAGER_EMAIL || 'noreply@example.com'

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [toRp],
    subject: `ITINERA · 🗺️ Voyage — ${data.firstName} ${data.lastName} · ${data.bookings.length} réservation${data.bookings.length > 1 ? 's' : ''}`,
    html,
    reply_to: data.email,
  })
}

// ── Email confirmation client pour voyage ─────────────────
export async function sendTripClientConfirmationEmail(data: TripData) {
  const managerName = process.env.MANAGER_NAME || 'ITINERA'
  const rpName = data.rpDisplayName || managerName

  const bookingCards = data.bookings.map((b, i) => `
    <div style="background: #1e1e1e; border: 1px solid rgba(201,168,76,0.15); padding: 20px 24px; margin-bottom: 12px;">
      <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px;">
        Étape ${i + 1}
      </div>
      <div style="color: #f5f0e8; font-size: 18px; font-style: italic; margin-bottom: 4px;">${b.establishment}</div>
      <div style="color: #9a9a9a; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">${b.destination}</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 3px 0; width: 50%;">
            <span style="color: #666; font-size: 9px; letter-spacing: 2px; text-transform: uppercase;">Date</span><br>
            <span style="color: #d4d4d4; font-size: 13px;">${b.date}</span>
          </td>
          <td style="padding: 3px 0;">
            <span style="color: #666; font-size: 9px; letter-spacing: 2px; text-transform: uppercase;">Service</span><br>
            <span style="color: #d4d4d4; font-size: 13px;">${b.time}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 3px 0;">
            <span style="color: #666; font-size: 9px; letter-spacing: 2px; text-transform: uppercase;">Personnes</span><br>
            <span style="color: #d4d4d4; font-size: 13px;">${b.guests} personne${b.guests > 1 ? 's' : ''}</span>
          </td>
        </tr>
      </table>
    </div>
  `).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background: #0a0a0a; color: #f5f0e8; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #141414;">

    <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1e1e1e 100%); padding: 48px 40px; text-align: center; border-bottom: 1px solid #C9A84C;">
      <div style="color: #C9A84C; font-size: 10px; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 20px;">✦ Confirmation de réception ✦</div>
      <h1 style="color: #f5f0e8; font-size: 30px; margin: 0 0 12px; font-style: italic; font-weight: normal;">Votre voyage a bien été reçu</h1>
      <p style="color: #9a9a9a; font-size: 13px; letter-spacing: 1px; margin: 0;">
        Réf. VYG${Date.now().toString().slice(-5)}
      </p>
    </div>

    <div style="padding: 40px;">
      <p style="font-size: 15px; color: #d4d4d4; line-height: 1.8; margin-bottom: 32px;">
        Bonjour <strong style="color: #f5f0e8;">${data.firstName}</strong>,<br><br>
        Nous avons bien reçu votre demande d'itinéraire comprenant <strong style="color: #f5f0e8;">${data.bookings.length} réservation${data.bookings.length > 1 ? 's' : ''}</strong>.
        Notre équipe traite l'ensemble de votre séjour et reviendra vers vous <strong style="color: #f5f0e8;">sous 24 heures</strong>.
      </p>

      <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, rgba(91,61,245,0.08), rgba(139,92,246,0.08)); border: 1px solid rgba(91,61,245,0.2); margin-bottom: 32px;">
        <div style="font-size: 24px; margin-bottom: 10px;">⏱</div>
        <p style="color: #d4d4d4; font-size: 14px; line-height: 1.6; margin: 0;">
          Confirmation complète de votre itinéraire sous 24h.<br>
          <strong style="color: #f5f0e8;">Toutes vos réservations sont traitées ensemble.</strong>
        </p>
      </div>

      <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px;">
        Votre itinéraire
      </div>

      ${bookingCards}

      ${data.rpWhatsapp ? `
      <!-- Contact concierge -->
      <div style="text-align: center; margin-top: 8px; padding-bottom: 16px;">
        <a href="https://wa.me/${toWaPhone(data.rpWhatsapp)}?text=${encodeURIComponent(`Bonjour, j'ai bien reçu la confirmation de mon voyage — ${data.bookings.length} réservation${data.bookings.length > 1 ? 's' : ''}. Merci pour votre prise en charge !`)}"
           style="display:inline-block;background:#25D366;color:white;padding:14px 32px;text-decoration:none;font-size:13px;letter-spacing:1px;">
          💬 Contacter votre RP
        </a>
      </div>` : ''}
    </div>

    <div style="padding: 28px 40px; text-align: center; border-top: 1px solid #1e1e1e;">
      <div style="color: #C9A84C; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px;">${rpName}</div>
      <p style="color: #444; font-size: 11px; line-height: 1.6; margin: 0;">
        Service de conciergerie privé · Traitement confidentiel<br>
        Cet email confirme la réception, non les réservations elles-mêmes.
      </p>
    </div>
  </div>
</body>
</html>`

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: `ITINERA · ✦ Voyage reçu — ${data.bookings.length} réservation${data.bookings.length > 1 ? 's' : ''} · ${data.firstName} ${data.lastName}`,
    html,
  })
}

export type ReservationData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  date: string
  time: string
  guests: number
  occasion?: string
  seating?: string
  vipLevel?: string
  internalNote?: string
  budgetLevel?: string
  specialRequests?: string
  establishment: string
  destination: string
  establishmentEmail: string
  establishmentPhone: string
  rpEmail?: string        // email du RP destinataire (priorité sur MANAGER_EMAIL)
  rpDisplayName?: string  // nom du RP expéditeur
  rpWhatsapp?: string     // WhatsApp du RP (affiché dans l'email client)
  rpNotificationPref?: 'email' | 'whatsapp' | 'both'  // préférence de notification du RP
  viewUrl?: string        // lien vers /host/confirm/[id] — page interactive confirm/décline
}

// ── Génère le message WhatsApp récap réservation pour le RP ─
function buildRpWhatsappMessage(data: ReservationData): string {
  const lines: string[] = []

  // ── 1. Lien de gestion EN TÊTE — page interactive confirm/décline ──
  if (data.viewUrl) {
    lines.push(`📋 *Voir & gérer la réservation :*`)
    lines.push(data.viewUrl)
    lines.push(``)
  }

  // ── 2. Détails réservation ──
  lines.push(
    `📍 *${data.establishment}*${data.destination ? ` · ${data.destination}` : ''}`,
    `📅 ${data.date} · ${data.time}`,
    `👥 ${data.guests} personne${data.guests > 1 ? 's' : ''}`,
  )
  if (data.occasion) lines.push(`🎉 ${data.occasion}`)
  if (data.specialRequests) lines.push(`💬 ${data.specialRequests}`)
  if (data.vipLevel) lines.push(`⭐ VIP : ${data.vipLevel}`)
  if (data.internalNote) {
    const note = formatInternalNote(data.internalNote)
    if (note) lines.push(`📝 ${note}`)
  }

  // ── 3. Client ──
  lines.push(
    ``,
    `👤 *${data.firstName} ${data.lastName}*`,
    `📞 ${data.phone}`,
    `✉️ ${data.email}`,
  )

  // ── 4. Contact restaurant ──
  if (data.establishmentPhone) {
    lines.push(
      ``,
      `📲 Contacter le restaurant :`,
      `https://wa.me/${toWaPhone(data.establishmentPhone)}?text=${encodeURIComponent(`Bonjour, réservation pour ${data.guests} pers. le ${data.date} à ${data.time} — ${data.firstName} ${data.lastName}.${data.occasion ? ` Occasion : ${data.occasion}.` : ''}${data.specialRequests ? ` Notes : ${data.specialRequests}` : ''}`)}`
    )
  }

  return lines.join('\n')
}

export async function sendReservationEmail(data: ReservationData) {
  const managerEmail = data.rpEmail || process.env.MANAGER_EMAIL || 'noreply@example.com'
  const managerName = process.env.MANAGER_NAME || 'ITINERA'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; background: #0a0a0a; color: #f5f0e8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #141414; }
    .header { background: linear-gradient(135deg, #0a0a0a 0%, #1e1e1e 100%); padding: 40px; text-align: center; border-bottom: 1px solid #C9A84C; }
    .logo { color: #C9A84C; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; }
    .title { color: #f5f0e8; font-size: 28px; margin: 16px 0 0; font-style: italic; }
    .gold-line { height: 1px; background: linear-gradient(90deg, transparent, #C9A84C, transparent); margin: 0; }
    .body { padding: 40px; }
    .section-title { color: #C9A84C; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
    .info-item label { display: block; color: #9a9a9a; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    .info-item span { color: #f5f0e8; font-size: 16px; }
    .highlight { background: #1e1e1e; border: 1px solid #C9A84C; border-radius: 4px; padding: 24px; margin: 24px 0; }
    .highlight .big { color: #C9A84C; font-size: 22px; font-style: italic; }
    .special { background: #1a1a1a; border-left: 3px solid #C9A84C; padding: 16px 20px; margin: 20px 0; color: #d4d4d4; font-style: italic; }
    .footer { padding: 32px 40px; text-align: center; border-top: 1px solid #2a2a2a; }
    .footer p { color: #666; font-size: 12px; letter-spacing: 1px; }
    .whatsapp-btn { display: inline-block; background: #25D366; color: white; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 14px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✦ Nouvelle Réservation ✦</div>
      <h1 class="title">Demande de réservation reçue</h1>
    </div>
    <div class="gold-line"></div>

    <div class="body">
      <p class="section-title">Établissement</p>
      <div class="highlight">
        <div class="big">${data.establishment}</div>
        <div style="color: #9a9a9a; margin-top: 8px; font-size: 13px; letter-spacing: 1px;">${data.destination}</div>
      </div>

      <p class="section-title">Détails de la réservation</p>
      <div class="info-grid">
        <div class="info-item">
          <label>Date</label>
          <span>${data.date}</span>
        </div>
        <div class="info-item">
          <label>Heure</label>
          <span>${data.time}</span>
        </div>
        <div class="info-item">
          <label>Nombre de personnes</label>
          <span>${data.guests} personne${data.guests > 1 ? 's' : ''}</span>
        </div>
        ${data.occasion ? `<div class="info-item"><label>Occasion</label><span>${data.occasion}</span></div>` : ''}
        ${data.seating ? `<div class="info-item"><label>Placement</label><span>${data.seating}</span></div>` : ''}
        ${data.vipLevel ? `<div class="info-item"><label>Profil VIP</label><span style="color:#C8A96B">✦ ${data.vipLevel}</span></div>` : ''}
        ${data.budgetLevel ? `<div class="info-item"><label>Budget</label><span>${data.budgetLevel}</span></div>` : ''}
      </div>
      ${data.internalNote ? `
      <p class="section-title">Note privée client</p>
      <div class="special" style="border-left-color:#C8A96B; color:#c4a96b;">${formatInternalNote(data.internalNote)}</div>
      ` : ''}

      <p class="section-title">Client</p>
      <div class="info-grid">
        <div class="info-item">
          <label>Prénom</label>
          <span>${data.firstName}</span>
        </div>
        <div class="info-item">
          <label>Nom</label>
          <span>${data.lastName}</span>
        </div>
        <div class="info-item">
          <label>Email</label>
          <span>${data.email}</span>
        </div>
        <div class="info-item">
          <label>Téléphone</label>
          <span>${data.phone}</span>
        </div>
      </div>

      ${data.specialRequests ? `
      <p class="section-title">Demandes spéciales</p>
      <div class="special">"${data.specialRequests}"</div>
      ` : ''}

      <!-- Boutons d'action -->
      <table style="width:100%;border-collapse:collapse;margin-top:32px;">
        <tr>
          <td style="padding:0 6px 0 0;width:50%;">
            <a href="https://wa.me/?text=${encodeURIComponent(buildRpWhatsappMessage(data))}"
               style="display:block;background:#1a1a1a;border:1px solid rgba(201,168,76,0.45);color:#C9A84C;padding:16px 12px;text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-family:Helvetica,Arial,sans-serif;">
              💬 Transférer à mon contact WhatsApp
            </a>
          </td>
          <td style="padding:0 0 0 6px;">
            <a href="https://wa.me/${toWaPhone(data.phone)}?text=${encodeURIComponent(`Bonjour ${data.firstName}, j'ai bien reçu votre demande de réservation chez ${data.establishment} — le ${data.date}, ${data.time}, pour ${data.guests} personne${data.guests > 1 ? 's' : ''}. Je reviens vers vous rapidement.`)}"
               style="display:block;background:#1a1a1a;border:1px solid rgba(255,255,255,0.12);color:#d4d4d4;padding:16px 12px;text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-family:Helvetica,Arial,sans-serif;">
              💬 Répondre au client
            </a>
          </td>
        </tr>
      </table>
      ${data.viewUrl ? `
      <!-- Bouton gérer la réservation -->
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr>
          <td>
            <a href="${data.viewUrl}"
               style="display:block;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.3);color:#C9A84C;padding:14px 12px;text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-family:Helvetica,Arial,sans-serif;">
              📋 Voir & gérer la réservation
            </a>
          </td>
        </tr>
      </table>` : ''}

      ${data.rpNotificationPref === 'whatsapp' ? `
      <div style="margin-top: 16px; padding: 12px 20px; background: rgba(37,211,102,0.08); border: 1px solid rgba(37,211,102,0.2); text-align: center;">
        <p style="color: #25D366; font-size: 11px; letter-spacing: 1px; margin: 0;">
          📲 Cliquez "Voir sur WhatsApp" pour recevoir ce récap directement dans vos messages
        </p>
      </div>` : ''}
    </div>

    <div class="footer">
      <p>${managerName} — Système de réservation privé</p>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [managerEmail],
    subject: `ITINERA · 🥂 ${data.firstName} ${data.lastName} — ${data.establishment}${data.destination ? ` · ${data.destination}` : ''} · ${data.date}`,
    html: htmlContent,
    reply_to: data.email,
  })
}

export async function sendClientConfirmationEmail(data: ReservationData) {
  const managerName = process.env.MANAGER_NAME || 'ITINERA'

  const clientHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; background: #0a0a0a; color: #f5f0e8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #141414; }
    .header { background: linear-gradient(135deg, #0a0a0a 0%, #1e1e1e 100%); padding: 48px 40px; text-align: center; border-bottom: 1px solid #C9A84C; }
    .eyebrow { color: #C9A84C; font-size: 10px; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 20px; }
    .title { color: #f5f0e8; font-size: 32px; margin: 0 0 12px; font-style: italic; font-weight: normal; }
    .subtitle { color: #9a9a9a; font-size: 13px; letter-spacing: 1px; }
    .gold-line { height: 1px; background: linear-gradient(90deg, transparent, #C9A84C, transparent); }
    .body { padding: 48px 40px; }
    .intro { font-size: 15px; color: #d4d4d4; line-height: 1.8; margin-bottom: 36px; }
    .intro strong { color: #f5f0e8; }
    .card { background: #1e1e1e; border: 1px solid rgba(201,168,76,0.3); border-radius: 2px; padding: 32px; margin-bottom: 32px; }
    .card-title { color: #C9A84C; font-size: 9px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid rgba(201,168,76,0.15); }
    .establishment-name { color: #f5f0e8; font-size: 22px; font-style: italic; margin-bottom: 6px; }
    .establishment-dest { color: #9a9a9a; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
    .row { display: flex; gap: 32px; margin-top: 20px; }
    .field { flex: 1; }
    .field label { display: block; color: #666; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; }
    .field span { color: #f5f0e8; font-size: 15px; }
    .field span.gold { color: #C9A84C; }
    .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 28px 0; }
    .special { background: #1a1a1a; border-left: 2px solid #C9A84C; padding: 16px 20px; font-style: italic; color: #c4c4c4; font-size: 14px; line-height: 1.7; margin-top: 20px; }
    .promise { text-align: center; padding: 32px; background: linear-gradient(135deg, rgba(91,61,245,0.08) 0%, rgba(139,92,246,0.08) 100%); border: 1px solid rgba(91,61,245,0.2); border-radius: 2px; margin-bottom: 32px; }
    .promise-icon { font-size: 28px; margin-bottom: 12px; }
    .promise-text { color: #d4d4d4; font-size: 14px; line-height: 1.7; }
    .promise-text strong { color: #f5f0e8; }
    .footer { padding: 32px 40px; text-align: center; border-top: 1px solid #1e1e1e; }
    .footer-brand { color: #C9A84C; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px; }
    .footer-legal { color: #444; font-size: 11px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="eyebrow">✦ Confirmation de réception ✦</div>
      <h1 class="title">Votre demande a bien été reçue</h1>
      <p class="subtitle">Réf. ${data.establishment.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-5)}</p>
    </div>
    <div class="gold-line"></div>

    <div class="body">

      <p class="intro">
        Bonjour <strong>${data.firstName}</strong>,<br><br>
        Nous avons bien reçu votre demande de réservation. Notre équipe la traite actuellement avec la plus grande attention et reviendra vers vous <strong>au plus vite</strong> pour confirmer votre table.
      </p>

      <div class="promise">
        <div class="promise-icon">⏱</div>
        <p class="promise-text">
          Votre conciergerie est à l'œuvre pour vous garantir la meilleure expérience.<br>
          <strong>Confirmation attendue au plus vite.</strong>
        </p>
      </div>

      <!-- Récapitulatif -->
      <div class="card">
        <div class="card-title">Récapitulatif de votre demande</div>

        <div class="establishment-name">${data.establishment}</div>
        <div class="establishment-dest">${data.destination}</div>

        <div class="row">
          <div class="field">
            <label>Date</label>
            <span>${data.date}</span>
          </div>
          <div class="field">
            <label>Service</label>
            <span>${data.time}</span>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Personnes</label>
            <span>${data.guests} personne${data.guests > 1 ? 's' : ''}</span>
          </div>
          ${data.occasion ? `<div class="field"><label>Occasion</label><span>${data.occasion}</span></div>` : '<div class="field"></div>'}
        </div>
        ${data.seating ? `
        <div class="row">
          <div class="field">
            <label>Placement souhaité</label>
            <span>${data.seating}</span>
          </div>
        </div>` : ''}
        ${data.vipLevel && data.vipLevel !== 'Standard' ? `
        <div class="row">
          <div class="field">
            <label>Profil</label>
            <span class="gold">${data.vipLevel}</span>
          </div>
        </div>` : ''}
        ${data.specialRequests ? `
        <div class="divider"></div>
        <div class="field">
          <label>Vos demandes spéciales</label>
        </div>
        <div class="special">"${data.specialRequests}"</div>` : ''}
      </div>

      <!-- Vos coordonnées -->
      <div class="card">
        <div class="card-title">Vos coordonnées</div>
        <div class="row">
          <div class="field">
            <label>Nom complet</label>
            <span>${data.firstName} ${data.lastName}</span>
          </div>
          <div class="field">
            <label>Téléphone</label>
            <span>${data.phone}</span>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Email</label>
            <span>${data.email}</span>
          </div>
        </div>
      </div>

      ${data.rpWhatsapp ? `
      <!-- Contact concierge -->
      <div style="text-align: center; margin-top: 16px;">
        <a href="https://wa.me/${toWaPhone(data.rpWhatsapp)}?text=${encodeURIComponent(`Bonjour, j'ai une question concernant ma réservation chez ${data.establishment}${data.destination ? ` à ${data.destination}` : ''} le ${data.date} pour ${data.guests} personne${data.guests > 1 ? 's' : ''}.`)}"
           style="display:inline-block;background:#25D366;color:white;padding:14px 32px;text-decoration:none;font-size:13px;letter-spacing:1px;">
          💬 Contacter votre RP
        </a>
      </div>` : ''}

    </div>

    <div class="footer">
      <div class="footer-brand">${managerName}</div>
      <p class="footer-legal">
        Service de conciergerie privé · Traitement confidentiel<br>
        Cet email est une confirmation de réception, non une confirmation de réservation.
      </p>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: `ITINERA · ✦ Demande reçue — ${data.establishment}${data.destination ? ` · ${data.destination}` : ''} · ${data.date}`,
    html: clientHtml,
  })
}

// ── Email rapide au venue avec bouton vers la page de gestion ─
export type VenueQuickActionEmailData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  establishment: string
  destination?: string
  date: string
  time: string
  guests: number
  occasion?: string
  specialRequests?: string
  venueEmail: string
  viewUrl: string        // lien vers /host/confirm/[id] — page interactive
  rpDisplayName?: string
  vipTag?: string
  internalNote?: string
}

export async function sendVenueQuickActionEmail(data: VenueQuickActionEmailData) {
  const brand = process.env.MANAGER_NAME || 'ITINERA'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Georgia,serif;background:#0a0a0a;color:#f5f0e8;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;background:#141414;">

  <div style="background:linear-gradient(135deg,#0a0a0a,#1e1e1e);padding:40px;text-align:center;border-bottom:2px solid #C9A84C;">
    <div style="color:#C9A84C;font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:12px;">✦ Nouvelle demande de réservation</div>
    <h1 style="color:#f5f0e8;font-size:26px;margin:0;font-style:italic;font-weight:normal;">${data.firstName} ${data.lastName}</h1>
    <p style="color:#9a9a9a;font-size:13px;margin:10px 0 0;">${data.establishment}${data.destination ? ` · ${data.destination}` : ''}</p>
  </div>

  <div style="padding:36px 40px;">

    <div style="background:#1e1e1e;border:1px solid rgba(201,168,76,0.25);padding:24px;margin-bottom:24px;">
      <div style="color:#C9A84C;font-size:9px;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">Détails de la réservation</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;width:50%;">
            <span style="color:#666;font-size:9px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:3px;">Date</span>
            <span style="color:#f5f0e8;font-size:15px;">${data.date}</span>
          </td>
          <td style="padding:6px 0;">
            <span style="color:#666;font-size:9px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:3px;">Heure</span>
            <span style="color:#f5f0e8;font-size:15px;">${data.time}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="color:#666;font-size:9px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:3px;">Personnes</span>
            <span style="color:#f5f0e8;font-size:15px;">${data.guests} personne${data.guests > 1 ? 's' : ''}</span>
          </td>
          ${data.occasion ? `<td style="padding:6px 0;">
            <span style="color:#666;font-size:9px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:3px;">Occasion</span>
            <span style="color:#f5f0e8;font-size:15px;">${data.occasion}</span>
          </td>` : '<td></td>'}
        </tr>
        ${data.specialRequests ? `<tr><td colspan="2" style="padding:8px 0 0;">
          <div style="background:#141414;border-left:2px solid #C9A84C;padding:10px 14px;font-style:italic;color:#c4c4c4;font-size:13px;">${data.specialRequests}</div>
        </td></tr>` : ''}
      </table>
    </div>

    <div style="background:#1e1e1e;border:1px solid rgba(255,255,255,0.06);padding:20px 24px;margin-bottom:32px;">
      <div style="color:#C9A84C;font-size:9px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;">Client</div>
      <p style="color:#f5f0e8;font-size:16px;margin:0 0 8px;">${data.firstName} ${data.lastName}</p>
      <p style="color:#9a9a9a;font-size:13px;margin:0 0 4px;">📞 ${data.phone}</p>
      <p style="color:#9a9a9a;font-size:13px;margin:0 0 ${data.vipTag || data.internalNote ? '12px' : '0'};">✉️ ${data.email}</p>
      ${data.vipTag ? `<p style="color:#C9A84C;font-size:12px;margin:0 0 4px;letter-spacing:1px;">⭐ ${data.vipTag}</p>` : ''}
      ${data.internalNote ? (() => {
        const parsed = (() => {
          try { const p = JSON.parse(data.internalNote!); return typeof p === 'object' ? p : null } catch { return null }
        })()
        const parts: string[] = []
        if (parsed?.note) parts.push(parsed.note)
        if (parsed?.nationality) parts.push(`🌍 ${parsed.nationality}`)
        if (Array.isArray(parsed?.products) && parsed.products.length) parts.push(`🍾 ${parsed.products.join(', ')}`)
        const text = parts.length ? parts.join(' · ') : (data.internalNote || '')
        return `<p style="color:#9a9a9a;font-size:12px;margin:0;font-style:italic;">💡 ${text}</p>`
      })() : ''}
    </div>

    <p style="color:#666;font-size:11px;text-align:center;margin-bottom:16px;letter-spacing:1px;">
      Confirmez ou déclinez en un clic — aucune connexion requise
    </p>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td>
          <a href="${data.viewUrl}"
             style="display:block;background:#C9A84C;color:#0a0a0a;padding:20px;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-family:Helvetica,Arial,sans-serif;font-weight:bold;">
            📋 Voir & Gérer la réservation
          </a>
        </td>
      </tr>
    </table>

    <p style="color:#444;font-size:11px;text-align:center;margin-top:16px;line-height:1.6;">
      Vous verrez les détails complets et pourrez confirmer ou décliner.<br>
      Le statut est mis à jour en temps réel. Le client et son concierge sont notifiés automatiquement.
    </p>
  </div>

  <div style="padding:20px 40px;text-align:center;border-top:1px solid #2a2a2a;">
    <p style="color:#444;font-size:11px;letter-spacing:1px;margin:0;">${brand}${data.rpDisplayName ? ` · ${data.rpDisplayName}` : ''} — Système de réservation privé</p>
  </div>
</div>
</body>
</html>`

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.venueEmail],
    subject: `📋 Réservation — ${data.firstName} ${data.lastName} · ${data.date} · ${data.time} · ${data.guests}p`,
    html,
    reply_to: data.email,
  })
}

// ── Email au RP quand un client modifie une réservation ────
export type ModificationData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  establishment: string
  destination: string
  originalDate: string
  newDate?: string
  newTime?: string
  newGuests?: number
  newNotes?: string
  action: 'modified' | 'cancelled'
  rpDisplayName?: string
  rpEmail?: string   // email du RP destinataire
}

export async function sendModificationEmailToRP(data: ModificationData) {
  const rpName = process.env.MANAGER_NAME || 'ITINERA'
  const isCancel = data.action === 'cancelled'

  const changes = [
    data.newDate ? `📅 Nouvelle date : <strong>${data.newDate}</strong>` : '',
    data.newTime ? `🕐 Nouveau service : <strong>${data.newTime}</strong>` : '',
    data.newGuests ? `👥 Nouvelles personnes : <strong>${data.newGuests}</strong>` : '',
    data.newNotes !== undefined ? `📝 Nouvelles notes : <em>"${data.newNotes || 'aucune'}"</em>` : '',
  ].filter(Boolean)

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background: #0a0a0a; color: #f5f0e8; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #141414;">
    <div style="background: linear-gradient(135deg, #0a0a0a, #1e1e1e); padding: 36px 40px; text-align: center; border-bottom: 2px solid ${isCancel ? '#ef4444' : '#C9A84C'};">
      <div style="color: ${isCancel ? '#ef4444' : '#C9A84C'}; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px;">
        ${isCancel ? '✕ Annulation' : '✎ Modification'}
      </div>
      <h1 style="color: #f5f0e8; font-size: 24px; margin: 0; font-style: italic;">
        ${isCancel ? 'Réservation annulée par le client' : 'Modification demandée par le client'}
      </h1>
    </div>
    <div style="padding: 36px 40px;">
      <div style="background: #1e1e1e; border: 1px solid rgba(201,168,76,0.2); padding: 24px; margin-bottom: 24px;">
        <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px;">Réservation concernée</div>
        <p style="color: #f5f0e8; font-size: 20px; font-style: italic; margin: 0 0 4px;">${data.establishment}</p>
        <p style="color: #9a9a9a; font-size: 12px; margin: 0 0 16px;">${data.destination}</p>
        <p style="color: #d4d4d4; font-size: 13px; margin: 0;">Date initiale : ${data.originalDate}</p>
      </div>

      <div style="background: #1e1e1e; border: 1px solid rgba(201,168,76,0.2); padding: 24px; margin-bottom: 24px;">
        <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px;">Client</div>
        <p style="color: #f5f0e8; font-size: 16px; margin: 0 0 8px;">${data.firstName} ${data.lastName}</p>
        <p style="color: #9a9a9a; font-size: 13px; margin: 0 0 4px;">📞 ${data.phone}</p>
        <p style="color: #9a9a9a; font-size: 13px; margin: 0;">✉️ ${data.email}</p>
      </div>

      ${!isCancel && changes.length > 0 ? `
      <div style="background: #1e1e1e; border-left: 3px solid #C9A84C; padding: 20px 24px; margin-bottom: 24px;">
        <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px;">Modifications demandées</div>
        ${changes.map(c => `<p style="color: #d4d4d4; font-size: 14px; margin: 0 0 8px;">${c}</p>`).join('')}
      </div>` : ''}

      ${isCancel ? `
      <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); padding: 20px 24px; margin-bottom: 24px; text-align: center;">
        <p style="color: #ef4444; font-size: 14px; margin: 0;">Le client a annulé cette réservation.<br>Pensez à en informer l'établissement si nécessaire.</p>
      </div>` : ''}

      ${data.phone ? `
      <div style="text-align: center;">
        <a href="https://wa.me/${toWaPhone(data.phone)}?text=${encodeURIComponent(`Bonjour ${data.firstName}, concernant votre ${isCancel ? 'annulation' : 'modification'} de réservation chez ${data.establishment}.`)}"
           style="display: inline-block; background: #25D366; color: white; padding: 12px 28px; text-decoration: none; font-size: 14px;">
          💬 WhatsApp ${data.firstName}
        </a>
      </div>` : ''}
    </div>
    <div style="padding: 24px 40px; text-align: center; border-top: 1px solid #2a2a2a;">
      <p style="color: #555; font-size: 12px; margin: 0;">${rpName} — Dashboard RP</p>
    </div>
  </div>
</body>
</html>`

  const toAddress = data.rpEmail || process.env.MANAGER_EMAIL || 'contact@itinera.click'

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [toAddress],
    subject: isCancel
      ? `ITINERA · ✕ Annulation — ${data.establishment} · ${data.firstName} ${data.lastName}`
      : `ITINERA · ✎ Modification — ${data.establishment} · ${data.firstName} ${data.lastName}`,
    html,
    reply_to: data.email,
  })
}

// ── Email au CLIENT quand le RP modifie sa réservation ──────────────────────
export type RPModificationData = {
  firstName: string
  email: string
  establishment: string
  destination: string
  originalDate: string
  newDate?: string
  newTime?: string
  newGuests?: number
  rpDisplayName?: string
  rpWhatsapp?: string
  rpEmail?: string
}

export async function sendRPModificationToClient(data: RPModificationData) {
  const rpName = data.rpDisplayName || process.env.MANAGER_NAME || 'ITINERA'

  const changes = [
    data.newDate ? `📅 Nouvelle date : <strong>${data.newDate}</strong>` : '',
    data.newTime ? `🕐 Nouveau service : <strong>${data.newTime}</strong>` : '',
    data.newGuests ? `👥 Personnes : <strong>${data.newGuests}</strong>` : '',
  ].filter(Boolean)

  const whatsappLink = data.rpWhatsapp
    ? `https://wa.me/${data.rpWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour, j'ai une question concernant ma réservation modifiée chez ${data.establishment}.`)}`
    : null

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background: #0a0a0a; color: #f5f0e8; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #141414;">
    <div style="background: linear-gradient(135deg, #0a0a0a, #1e1e1e); padding: 40px; text-align: center; border-bottom: 2px solid #5B3DF5;">
      <div style="color: #5B3DF5; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 10px;">✎ Réservation mise à jour</div>
      <h1 style="color: #f5f0e8; font-size: 24px; margin: 0; font-style: italic;">Votre réservation a été modifiée</h1>
    </div>
    <div style="padding: 36px 40px;">
      <p style="color: #d4d4d4; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
        Bonjour <strong>${data.firstName}</strong>,<br><br>
        Votre concierge <strong>${rpName}</strong> a mis à jour votre réservation chez <strong>${data.establishment}</strong>.
      </p>
      <div style="background: #1e1e1e; border: 1px solid rgba(91,61,245,0.25); border-left: 3px solid #5B3DF5; padding: 20px 24px; margin-bottom: 24px;">
        <div style="color: #9a9a9a; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">Réservation d'origine</div>
        <p style="color: #f5f0e8; font-size: 18px; font-style: italic; margin: 0 0 4px;">${data.establishment}</p>
        <p style="color: #9a9a9a; font-size: 12px; margin: 0 0 12px;">${data.destination}</p>
        <p style="color: #888; font-size: 13px; margin: 0;">Date précédente : ${data.originalDate}</p>
      </div>
      ${changes.length > 0 ? `
      <div style="background: #1e1e1e; border-left: 3px solid #C9A84C; padding: 20px 24px; margin-bottom: 24px;">
        <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px;">Nouvelles informations</div>
        ${changes.map(c => `<p style="color: #d4d4d4; font-size: 14px; margin: 0 0 8px;">${c}</p>`).join('')}
      </div>` : ''}
      ${whatsappLink ? `
      <div style="text-align: center; margin-top: 28px;">
        <a href="${whatsappLink}" style="display: inline-block; background: #25D366; color: white; padding: 14px 32px; text-decoration: none; font-size: 13px; letter-spacing: 1px;">
          💬 Contacter votre RP
        </a>
      </div>` : ''}
    </div>
    <div style="padding: 20px 40px; text-align: center; border-top: 1px solid #222;">
      <p style="color: #444; font-size: 11px; margin: 0;">${rpName} — Conciergerie privée</p>
    </div>
  </div>
</body>
</html>`

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: `ITINERA · ✎ Réservation modifiée — ${data.establishment}`,
    html,
    ...(data.rpEmail ? { reply_to: data.rpEmail } : {}),
  })
}

// ── Email au CLIENT quand son statut change (confirmé / refusé) ──────────────
export type StatusUpdateData = {
  firstName: string
  lastName: string
  email: string
  establishment: string
  destination: string
  date: string
  time: string
  guests: number
  status: 'confirmed' | 'declined'
  rpDisplayName?: string
  rpWhatsapp?: string
  rpEmail?: string
}

export async function sendStatusUpdateEmailToClient(data: StatusUpdateData) {
  const rpName = data.rpDisplayName || process.env.MANAGER_NAME || 'ITINERA'
  const isConfirmed = data.status === 'confirmed'

  const whatsappLink = data.rpWhatsapp
    ? `https://wa.me/${data.rpWhatsapp.replace(/[^0-9]/g, '')}`
    : null

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; background: #0a0a0a; color: #f5f0e8; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #141414;">

    <!-- En-tête -->
    <div style="background: linear-gradient(135deg, #0a0a0a, #1e1e1e); padding: 48px 40px; text-align: center; border-bottom: 2px solid ${isConfirmed ? '#C9A84C' : '#555'};">
      <div style="color: ${isConfirmed ? '#C9A84C' : '#888'}; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 16px;">
        ${isConfirmed ? '✦ Réservation confirmée' : 'Demande de réservation'}
      </div>
      <h1 style="color: #f5f0e8; font-size: 28px; margin: 0 0 8px; font-style: italic; font-weight: normal;">
        ${isConfirmed
          ? `Votre table est réservée`
          : `Nous ne pouvons pas honorer cette demande`
        }
      </h1>
      ${isConfirmed
        ? `<p style="color: #C9A84C; font-size: 13px; margin: 12px 0 0; letter-spacing: 1px;">${data.establishment}</p>`
        : `<p style="color: #888; font-size: 13px; margin: 12px 0 0;">${data.establishment} · ${data.destination}</p>`
      }
    </div>

    <div style="padding: 40px;">

      ${isConfirmed ? `
      <!-- Bloc principal confirmé -->
      <div style="background: linear-gradient(135deg, #1a1500, #1e1a00); border: 1px solid rgba(201,168,76,0.3); border-left: 3px solid #C9A84C; padding: 32px; margin-bottom: 28px; text-align: center;">
        <div style="color: #C9A84C; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 20px;">Détails de votre réservation</div>
        <p style="color: #f5f0e8; font-size: 24px; font-style: italic; margin: 0 0 6px;">${data.establishment}</p>
        <p style="color: #9a9a9a; font-size: 12px; letter-spacing: 1px; margin: 0 0 28px; text-transform: uppercase;">${data.destination}</p>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <tr>
            <td style="padding: 10px 0; border-top: 1px solid rgba(201,168,76,0.15);">
              <div style="color: #888; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Date</div>
              <div style="color: #f5f0e8; font-size: 16px;">${data.date}</div>
            </td>
            <td style="padding: 10px 0; border-top: 1px solid rgba(201,168,76,0.15);">
              <div style="color: #888; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Service</div>
              <div style="color: #f5f0e8; font-size: 16px;">${data.time}</div>
            </td>
            <td style="padding: 10px 0; border-top: 1px solid rgba(201,168,76,0.15);">
              <div style="color: #888; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Personnes</div>
              <div style="color: #f5f0e8; font-size: 16px;">${data.guests}</div>
            </td>
          </tr>
        </table>
      </div>

      <p style="color: #d4d4d4; font-size: 14px; line-height: 1.7; margin: 0 0 28px;">
        Bonjour <strong>${data.firstName}</strong>, votre réservation chez <strong>${data.establishment}</strong>
        est confirmée. Nous vous souhaitons une excellente expérience.
      </p>

      ${whatsappLink ? `
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${whatsappLink}" style="display: inline-block; background: #25D366; color: white; padding: 14px 32px; text-decoration: none; font-size: 13px; letter-spacing: 1px;">
          💬 Contacter ${rpName}
        </a>
      </div>` : ''}

      <div style="background: #1e1e1e; border: 1px solid rgba(255,255,255,0.05); padding: 16px 20px; font-size: 12px; color: #666; line-height: 1.6;">
        Pour toute modification ou question, contactez directement votre RP.
      </div>
      ` : `
      <!-- Bloc principal refusé -->
      <p style="color: #d4d4d4; font-size: 15px; line-height: 1.8; margin: 0 0 28px;">
        Bonjour <strong>${data.firstName}</strong>,
      </p>
      <p style="color: #b0b0b0; font-size: 14px; line-height: 1.8; margin: 0 0 28px;">
        Malgré tous nos efforts, nous ne sommes pas en mesure de confirmer votre demande de réservation
        chez <strong>${data.establishment}</strong> pour le <strong>${data.date}</strong>.
      </p>
      <p style="color: #b0b0b0; font-size: 14px; line-height: 1.8; margin: 0 0 32px;">
        Notre équipe reste disponible pour vous proposer une alternative.
        N'hésitez pas à nous contacter.
      </p>

      ${whatsappLink ? `
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${whatsappLink}" style="display: inline-block; background: #25D366; color: white; padding: 14px 32px; text-decoration: none; font-size: 13px; letter-spacing: 1px;">
          💬 Trouver une alternative
        </a>
      </div>` : ''}
      `}

    </div>

    <!-- Footer -->
    <div style="padding: 24px 40px; text-align: center; border-top: 1px solid #222;">
      <p style="color: #444; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 4px;">${rpName}</p>
      <p style="color: #333; font-size: 11px; margin: 0;">Conciergerie privée · Services exclusifs</p>
    </div>
  </div>
</body>
</html>`

  const replyToAddress = data.rpEmail || process.env.MANAGER_EMAIL || undefined

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: isConfirmed
      ? `ITINERA · ✦ Confirmée — ${data.establishment} · ${data.date}`
      : `ITINERA · Votre demande — ${data.establishment}`,
    html,
    ...(replyToAddress ? { reply_to: replyToAddress } : {}),
  })
}

// ── Email de bienvenue lors de l'ajout d'un client ────────────
export type ClientWelcomeData = {
  clientEmail: string
  clientName?: string
  rpDisplayName: string
  rpEmail?: string
  rpWhatsapp?: string
  rpSlug: string
  siteUrl: string
}

export async function sendClientWelcomeEmail(data: ClientWelcomeData) {
  const rpName = data.rpDisplayName
  const firstName = data.clientName?.split(' ')[0] || ''
  const loginUrl = `${data.siteUrl}/${data.rpSlug}/mon-espace`
  const whatsappLink = data.rpWhatsapp
    ? `https://wa.me/${data.rpWhatsapp}`
    : null

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;background:#111;border:1px solid #1e1e1e;">

    <!-- Header -->
    <div style="padding:40px 40px 32px;border-bottom:1px solid #1e1e1e;text-align:center;">
      <p style="color:#555;font-size:9px;letter-spacing:4px;text-transform:uppercase;margin:0 0 8px;">ITINERA · Private Access</p>
      <p style="color:#f5f0e8;font-size:22px;font-style:italic;font-family:Georgia,serif;margin:0;">${rpName}</p>
    </div>

    <!-- Corps -->
    <div style="padding:40px;">
      <p style="color:#C9A84C;font-size:9px;letter-spacing:3px;text-transform:uppercase;margin:0 0 20px;">✦ Votre accès est activé</p>

      <h1 style="color:#f5f0e8;font-size:26px;font-weight:300;font-family:Georgia,serif;margin:0 0 20px;line-height:1.3;">
        Bienvenue${firstName ? `, ${firstName}` : ''}
      </h1>

      <p style="color:#888;font-size:14px;line-height:1.8;margin:0 0 28px;">
        Votre accès au service de conciergerie privée <strong style="color:#f5f0e8;">${rpName}</strong> vient d'être activé.
        Vous pouvez dès maintenant accéder à votre espace personnel, suivre vos réservations et faire de nouvelles demandes.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:36px 0;">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#5B3DF5,#8B5CF6);color:#fff;text-decoration:none;font-size:11px;letter-spacing:3px;text-transform:uppercase;padding:16px 36px;">
          Accéder à mon espace →
        </a>
      </div>

      <!-- Info connexion -->
      <div style="background:#0f0f0f;border:1px solid #1e1e1e;padding:20px;margin-bottom:28px;">
        <p style="color:#555;font-size:9px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Votre identifiant</p>
        <p style="color:#f5f0e8;font-size:14px;font-family:monospace;margin:0;">${data.clientEmail}</p>
        <p style="color:#444;font-size:11px;margin:8px 0 0;">Entrez cet email sur votre espace pour vous connecter</p>
      </div>

      ${whatsappLink || data.rpEmail ? `
      <!-- Contact RP -->
      <div style="border-top:1px solid #1e1e1e;padding-top:24px;">
        <p style="color:#555;font-size:9px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Votre concierge</p>
        ${data.rpEmail ? `<p style="color:#888;font-size:13px;margin:0 0 6px;">✉️ <a href="mailto:${data.rpEmail}" style="color:#888;text-decoration:none;">${data.rpEmail}</a></p>` : ''}
        ${whatsappLink ? `<p style="color:#888;font-size:13px;margin:0;">💬 <a href="${whatsappLink}" style="color:#888;text-decoration:none;">WhatsApp</a></p>` : ''}
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;text-align:center;border-top:1px solid #1e1e1e;">
      <p style="color:#333;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0;">${rpName} · Hospitality Planning · ITINERA</p>
    </div>
  </div>
</body>
</html>`

  const plainText = `Bonjour${firstName ? ` ${firstName}` : ''},\n\n${rpName} vous a donné accès à votre espace de conciergerie privée sur ITINERA.\n\nConnectez-vous ici : ${loginUrl}\n\nVotre identifiant : ${data.clientEmail}\n\nIl vous suffit d'entrer votre adresse email pour accéder à votre espace.\n\n---\n${rpName} · Conciergerie privée`

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.clientEmail],
    subject: `ITINERA · Votre espace de conciergerie est prêt — ${rpName}`,
    html,
    text: plainText,
    ...(data.rpEmail ? { reply_to: data.rpEmail } : {}),
  })
}

// ── Email au CLIENT quand il modifie ou annule sa réservation ──────────────
export type ModificationAckData = {
  firstName: string
  email: string
  establishment: string
  destination: string
  date: string
  action: 'modified' | 'cancelled'
  newDate?: string
  newTime?: string
  newGuests?: number
  newNotes?: string
  rpDisplayName?: string
  rpWhatsapp?: string
  rpEmail?: string
}

export async function sendModificationAckToClient(data: ModificationAckData) {
  const rpName = data.rpDisplayName || process.env.MANAGER_NAME || 'ITINERA'
  const isCancel = data.action === 'cancelled'
  const whatsappLink = data.rpWhatsapp
    ? `https://wa.me/${toWaPhone(data.rpWhatsapp)}?text=${encodeURIComponent(`Bonjour, j'ai une question concernant ma réservation chez ${data.establishment}.`)}`
    : null

  const changes = [
    data.newDate ? `📅 Nouvelle date : <strong style="color:#f5f0e8">${data.newDate}</strong>` : '',
    data.newTime ? `🕐 Nouveau service : <strong style="color:#f5f0e8">${data.newTime}</strong>` : '',
    data.newGuests ? `👥 Nouvelles personnes : <strong style="color:#f5f0e8">${data.newGuests}</strong>` : '',
    data.newNotes !== undefined && data.newNotes !== '' ? `📝 Notes : <em style="color:#c4c4c4">"${data.newNotes}"</em>` : '',
  ].filter(Boolean)

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
  <div style="max-width:580px;margin:0 auto;background:#141414;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0a0a0a,#1e1e1e);padding:40px;text-align:center;border-bottom:2px solid ${isCancel ? '#ef4444' : '#C9A84C'};">
      <div style="color:${isCancel ? '#ef4444' : '#C9A84C'};font-size:10px;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">
        ${isCancel ? '✕ Annulation confirmée' : '✎ Modification prise en compte'}
      </div>
      <h1 style="color:#f5f0e8;font-size:26px;margin:0;font-style:italic;font-weight:normal;">
        ${isCancel ? 'Votre réservation a été annulée' : 'Vos modifications ont été transmises'}
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <p style="color:#d4d4d4;font-size:15px;line-height:1.8;margin:0 0 28px;">
        Bonjour <strong style="color:#f5f0e8;">${data.firstName}</strong>,<br><br>
        ${isCancel
          ? `Nous confirmons l'annulation de votre réservation chez <strong style="color:#f5f0e8;">${data.establishment}</strong> (${data.date}).<br>Votre RP a été notifié.`
          : `Vos modifications pour la réservation chez <strong style="color:#f5f0e8;">${data.establishment}</strong> ont bien été transmises à votre RP.`
        }
      </p>

      <!-- Réservation concernée -->
      <div style="background:#1e1e1e;border:1px solid rgba(201,168,76,0.2);padding:24px;margin-bottom:24px;">
        <div style="color:#C9A84C;font-size:9px;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">Réservation concernée</div>
        <p style="color:#f5f0e8;font-size:20px;font-style:italic;margin:0 0 4px;">${data.establishment}</p>
        <p style="color:#9a9a9a;font-size:12px;margin:0 0 12px;">${data.destination}</p>
        <p style="color:#d4d4d4;font-size:13px;margin:0;">Date initiale : ${data.date}</p>
      </div>

      ${!isCancel && changes.length > 0 ? `
      <!-- Modifications -->
      <div style="background:#1e1e1e;border-left:3px solid #C9A84C;padding:20px 24px;margin-bottom:24px;">
        <div style="color:#C9A84C;font-size:9px;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">Modifications demandées</div>
        ${changes.map(c => `<p style="color:#d4d4d4;font-size:14px;margin:0 0 8px;">${c}</p>`).join('')}
        <p style="color:#666;font-size:12px;margin:12px 0 0;">Votre RP confirmera les nouvelles disponibilités sous 24h.</p>
      </div>` : ''}

      ${isCancel ? `
      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);padding:20px;text-align:center;margin-bottom:24px;">
        <p style="color:#888;font-size:13px;line-height:1.7;margin:0;">
          Besoin d'une autre réservation ? Votre RP est disponible.
        </p>
      </div>` : ''}

      ${whatsappLink ? `
      <div style="text-align:center;margin-top:8px;">
        <a href="${whatsappLink}" style="display:inline-block;background:#25D366;color:white;text-decoration:none;font-size:13px;letter-spacing:1px;padding:14px 32px;">
          💬 Contacter votre RP
        </a>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;text-align:center;border-top:1px solid #1e1e1e;">
      <p style="color:#333;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin:0;">${rpName} · Conciergerie privée</p>
    </div>
  </div>
</body>
</html>`

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: isCancel
      ? `ITINERA · ✕ Annulation confirmée — ${data.establishment}`
      : `ITINERA · ✎ Modification transmise — ${data.establishment}`,
    html,
    ...(data.rpEmail ? { reply_to: data.rpEmail } : {}),
  })
}

// ── Type pour les emails de statut venue ──────────────────
export type VenueStatusEmailData = {
  firstName: string
  lastName: string
  email: string          // email du client
  phone?: string         // téléphone du client
  establishment: string
  destination?: string
  date: string
  time: string
  guests: number
  occasion?: string
  specialRequests?: string
  status: 'confirmed' | 'declined'
  venueName: string      // nom affiché du venue
  rpEmail?: string       // email du RP pour notification
  rpDisplayName?: string
  rpWhatsapp?: string    // WhatsApp du RP (pour le lien dans l'email client)
}

// ── Email au CLIENT quand le venue confirme ou décline ────
export async function sendVenueStatusToClient(data: VenueStatusEmailData) {
  if (!data.email) {
    console.warn('[sendVenueStatusToClient] email manquant — email non envoyé')
    return
  }
  const isConfirmed = data.status === 'confirmed'
  const brand = process.env.MANAGER_NAME || 'ITINERA'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Georgia,serif;background:#0a0a0a;color:#f5f0e8;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;background:#141414;">

  <div style="background:linear-gradient(135deg,#0a0a0a,#1e1e1e);padding:48px 40px;text-align:center;border-bottom:2px solid ${isConfirmed ? '#22c55e' : '#ef4444'};">
    <div style="font-size:32px;margin-bottom:16px;">${isConfirmed ? '✅' : '❌'}</div>
    <div style="color:${isConfirmed ? '#22c55e' : '#ef4444'};font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:12px;">
      ${isConfirmed ? 'Réservation confirmée' : 'Réservation déclinée'}
    </div>
    <h1 style="color:#f5f0e8;font-size:28px;margin:0;font-style:italic;font-weight:normal;">
      ${isConfirmed ? 'Votre table est confirmée' : 'Demande non disponible'}
    </h1>
  </div>

  <div style="padding:40px;">

    <p style="color:#d4d4d4;font-size:15px;line-height:1.8;margin-bottom:32px;">
      Bonjour <strong style="color:#f5f0e8;">${data.firstName}</strong>,<br><br>
      ${isConfirmed
        ? `Nous avons le plaisir de vous confirmer votre réservation chez <strong style="color:#f5f0e8;">${data.establishment}</strong>. Votre table vous attend.`
        : `Nous avons le regret de vous informer que votre demande chez <strong style="color:#f5f0e8;">${data.establishment}</strong> ne peut pas être honorée pour ce créneau. Votre concierge va vous recontacter pour trouver une alternative.`
      }
    </p>

    <div style="background:#1e1e1e;border:1px solid ${isConfirmed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.15)'};padding:28px;margin-bottom:28px;">
      <div style="color:#C9A84C;font-size:9px;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">Détails de votre réservation</div>
      <div style="color:#f5f0e8;font-size:22px;font-style:italic;margin-bottom:4px;">${data.establishment}</div>
      ${data.destination ? `<div style="color:#9a9a9a;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">${data.destination}</div>` : '<div style="margin-bottom:16px;"></div>'}
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;width:50%;">
            <span style="color:#666;font-size:9px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:3px;">Date</span>
            <span style="color:#f5f0e8;font-size:15px;">${data.date}</span>
          </td>
          <td style="padding:6px 0;">
            <span style="color:#666;font-size:9px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:3px;">Heure</span>
            <span style="color:#f5f0e8;font-size:15px;">${data.time}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:6px 0;">
            <span style="color:#666;font-size:9px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:3px;">Personnes</span>
            <span style="color:#f5f0e8;font-size:15px;">${data.guests} personne${data.guests > 1 ? 's' : ''}</span>
          </td>
        </tr>
        ${data.occasion ? `<tr><td colspan="2" style="padding:6px 0;">
          <span style="color:#666;font-size:9px;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:3px;">Occasion</span>
          <span style="color:#f5f0e8;font-size:15px;">${data.occasion}</span>
        </td></tr>` : ''}
      </table>
    </div>

    ${data.rpWhatsapp ? `
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid #1e1e1e;">
      <p style="color:#555;font-size:9px;letter-spacing:3px;text-transform:uppercase;text-align:center;margin:0 0 14px;">
        ${isConfirmed ? 'Une question ?' : 'Trouver une alternative'}
      </p>
      <a href="https://wa.me/${toWaPhone(data.rpWhatsapp)}?text=${encodeURIComponent(isConfirmed ? `Bonjour ${data.firstName}, votre réservation chez ${data.establishment} le ${data.date} à ${data.time} est bien confirmée. À très bientôt !` : `Bonjour ${data.firstName}, je reviens vers vous concernant votre demande chez ${data.establishment}. Trouvons une alternative ensemble.`)}"
         style="display:block;background:#1a1a1a;border:1px solid ${isConfirmed ? 'rgba(201,168,76,0.4)' : 'rgba(239,68,68,0.4)'};color:${isConfirmed ? '#C9A84C' : '#f87171'};padding:16px;text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-family:Helvetica,Arial,sans-serif;">
        💬 Contacter ${data.rpDisplayName ? data.rpDisplayName.split(' ')[0] : 'votre concierge'} via WhatsApp
      </a>
    </div>` : ''}

  </div>

  <div style="padding:24px 40px;text-align:center;border-top:1px solid #2a2a2a;">
    <p style="color:#555;font-size:11px;letter-spacing:1px;margin:0;">${brand}${data.rpDisplayName ? ` · ${data.rpDisplayName}` : ''} — Conciergerie privée</p>
  </div>

</div>
</body>
</html>`

  await sendEmail({
    from: `${senderName(data.rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: isConfirmed
      ? `✅ Confirmée — ${data.establishment} · ${data.date} · ${data.time}`
      : `❌ Non disponible — ${data.establishment} · ${data.date}`,
    html,
    ...(data.rpEmail ? { reply_to: data.rpEmail } : {}),
  })
}

// ── Email au RP quand le venue confirme ou décline ────────
export async function sendVenueStatusToRP(data: VenueStatusEmailData) {
  if (!data.rpEmail) return
  const isConfirmed = data.status === 'confirmed'
  const brand = process.env.MANAGER_NAME || 'ITINERA'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Georgia,serif;background:#0a0a0a;color:#f5f0e8;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;background:#141414;">

  <div style="background:linear-gradient(135deg,#0a0a0a,#1e1e1e);padding:36px 40px;text-align:center;border-bottom:2px solid ${isConfirmed ? '#22c55e' : '#ef4444'};">
    <div style="color:${isConfirmed ? '#22c55e' : '#ef4444'};font-size:10px;letter-spacing:5px;text-transform:uppercase;margin-bottom:8px;">
      ${isConfirmed ? '✅ Confirmée par le venue' : '❌ Déclinée par le venue'}
    </div>
    <h1 style="color:#f5f0e8;font-size:24px;margin:0;font-style:italic;font-weight:normal;">
      ${data.firstName} ${data.lastName}
    </h1>
  </div>

  <div style="padding:36px 40px;">
    <p style="color:#9a9a9a;font-size:13px;margin-bottom:24px;line-height:1.6;">
      ${isConfirmed
        ? `<strong style="color:#22c55e;">${data.venueName}</strong> a <strong>confirmé</strong> la réservation de votre client.`
        : `<strong style="color:#ef4444;">${data.venueName}</strong> a <strong>décliné</strong> la réservation. Veuillez recontacter votre client pour trouver une alternative.`
      }
    </p>

    <div style="background:#1e1e1e;border:1px solid #2a2a2a;padding:24px;margin-bottom:20px;">
      <div style="color:#C9A84C;font-size:9px;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">Détails</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;width:40%;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Établissement</td>
          <td style="padding:5px 0;color:#f5f0e8;font-size:14px;">${data.establishment}${data.destination ? ` · ${data.destination}` : ''}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Client</td>
          <td style="padding:5px 0;color:#f5f0e8;font-size:14px;">${data.firstName} ${data.lastName}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Email</td>
          <td style="padding:5px 0;color:#f5f0e8;font-size:14px;">${data.email}</td>
        </tr>
        ${data.phone ? `<tr>
          <td style="padding:5px 0;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Téléphone</td>
          <td style="padding:5px 0;color:#f5f0e8;font-size:14px;">${data.phone}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:5px 0;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Date</td>
          <td style="padding:5px 0;color:#f5f0e8;font-size:14px;">${data.date} · ${data.time}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Personnes</td>
          <td style="padding:5px 0;color:#f5f0e8;font-size:14px;">${data.guests} personne${data.guests > 1 ? 's' : ''}</td>
        </tr>
        ${data.occasion ? `<tr>
          <td style="padding:5px 0;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Occasion</td>
          <td style="padding:5px 0;color:#f5f0e8;font-size:14px;">${data.occasion}</td>
        </tr>` : ''}
      </table>
    </div>

    ${data.phone ? `
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid #1e1e1e;">
      <p style="color:#555;font-size:9px;letter-spacing:3px;text-transform:uppercase;text-align:center;margin:0 0 14px;">
        ${isConfirmed ? 'Confirmer au client' : 'Recontacter le client'}
      </p>
      <a href="https://wa.me/${toWaPhone(data.phone)}?text=${encodeURIComponent(`Bonjour ${data.firstName}, ${isConfirmed ? `votre réservation chez ${data.establishment} le ${data.date} à ${data.time} est confirmée !` : `votre demande chez ${data.establishment} n'est malheureusement pas disponible. Je vous recontacte pour trouver une alternative.`}`)}"
         style="display:block;background:#1a1a1a;border:1px solid ${isConfirmed ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'};color:${isConfirmed ? '#4ade80' : '#f87171'};padding:16px;text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;text-align:center;font-family:Helvetica,Arial,sans-serif;">
        💬 Contacter ${data.firstName} via WhatsApp
      </a>
    </div>` : ''}

  </div>

  <div style="padding:20px 40px;text-align:center;border-top:1px solid #2a2a2a;">
    <p style="color:#555;font-size:11px;letter-spacing:1px;margin:0;">${brand} — Notification automatique venue</p>
  </div>

</div>
</body>
</html>`

  await sendEmail({
    from: `${senderName()} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.rpEmail],
    subject: isConfirmed
      ? `✅ ${data.venueName} a confirmé — ${data.firstName} ${data.lastName} · ${data.date}`
      : `❌ ${data.venueName} a décliné — ${data.firstName} ${data.lastName} · ${data.date}`,
    html,
    reply_to: data.email,
  })
}

// ─────────────────────────────────────────────────────────────
// RAPPEL RÉSERVATIONS EN ATTENTE (cron toutes les 6h)
// ─────────────────────────────────────────────────────────────

export type PendingResa = {
  id: string
  first_name: string
  last_name: string
  establishment: string
  destination?: string
  date: string
  time: string
  guests: number
  occasion?: string
  special_requests?: string
  created_at?: string
  viewUrl: string
}

function pendingResaRow(r: PendingResa): string {
  const age = r.created_at
    ? Math.round((Date.now() - new Date(r.created_at).getTime()) / 3600000)
    : null
  return `
  <tr>
    <td style="padding:12px 16px;border-bottom:1px solid #1a1a1a;vertical-align:top;">
      <div style="font-size:13px;color:#f0f0f0;font-weight:500;">${r.first_name} ${r.last_name}</div>
      <div style="font-size:11px;color:#666;margin-top:2px;">${r.guests} pers.${r.occasion ? ` · ${r.occasion}` : ''}${r.special_requests ? ` · <em>${r.special_requests}</em>` : ''}</div>
    </td>
    <td style="padding:12px 16px;border-bottom:1px solid #1a1a1a;vertical-align:top;">
      <div style="font-size:13px;color:#c0b0ff;">${r.establishment}</div>
      ${r.destination ? `<div style="font-size:11px;color:#555;">${r.destination}</div>` : ''}
    </td>
    <td style="padding:12px 16px;border-bottom:1px solid #1a1a1a;vertical-align:top;">
      <div style="font-size:12px;color:#f0f0f0;">${r.date}</div>
      <div style="font-size:11px;color:#666;">${r.time}</div>
      ${age !== null ? `<div style="font-size:10px;color:#d97706;margin-top:3px;">⏳ ${age}h en attente</div>` : ''}
    </td>
    <td style="padding:12px 16px;border-bottom:1px solid #1a1a1a;vertical-align:top;text-align:center;">
      <a href="${r.viewUrl}" style="display:inline-block;background:#5b3df5;color:#fff;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:7px 14px;text-decoration:none;">
        Gérer →
      </a>
    </td>
  </tr>`
}

function pendingReminderHtml(
  recipientLabel: string,
  resas: PendingResa[],
  brand: string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
<div style="max-width:680px;margin:0 auto;padding:32px 16px;">

  <div style="margin-bottom:28px;">
    <p style="color:#5b3df5;font-size:9px;letter-spacing:4px;text-transform:uppercase;margin:0 0 4px;">${brand}</p>
    <h1 style="color:#f0f0f0;font-size:20px;font-weight:normal;margin:0;letter-spacing:2px;">
      Réservations en attente
    </h1>
    <p style="color:#555;font-size:12px;margin:8px 0 0;">
      ${resas.length} réservation${resas.length > 1 ? 's' : ''} attend${resas.length === 1 ? ' votre' : 'ent'} confirmation · ${recipientLabel}
    </p>
  </div>

  <table style="width:100%;border-collapse:collapse;background:#141414;border:1px solid #1e1e1e;">
    <thead>
      <tr style="background:#0f0f0f;">
        <th style="padding:10px 16px;text-align:left;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#444;font-weight:normal;">Client</th>
        <th style="padding:10px 16px;text-align:left;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#444;font-weight:normal;">Établissement</th>
        <th style="padding:10px 16px;text-align:left;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#444;font-weight:normal;">Date</th>
        <th style="padding:10px 16px;text-align:center;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#444;font-weight:normal;">Action</th>
      </tr>
    </thead>
    <tbody>
      ${resas.map(pendingResaRow).join('')}
    </tbody>
  </table>

  <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1a1a1a;text-align:center;">
    <p style="color:#333;font-size:10px;letter-spacing:1px;margin:0;">
      Ce rappel est envoyé automatiquement toutes les 6 heures · ${brand}
    </p>
  </div>

</div>
</body>
</html>`
}

export async function sendPendingReminderToRP(
  rpEmail: string,
  rpDisplayName: string,
  resas: PendingResa[],
): Promise<void> {
  if (!rpEmail || resas.length === 0) return
  const brand = process.env.MANAGER_NAME || 'ITINERA'
  const html = pendingReminderHtml(rpDisplayName, resas, brand)
  await sendEmail({
    from: `${senderName(rpDisplayName)} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [rpEmail],
    subject: `⏳ ${resas.length} réservation${resas.length > 1 ? 's' : ''} en attente — ${rpDisplayName}`,
    html,
  })
}

export async function sendPendingReminderToVenue(
  venueEmail: string,
  venueName: string,
  resas: PendingResa[],
): Promise<void> {
  if (!venueEmail || resas.length === 0) return
  const brand = process.env.MANAGER_NAME || 'ITINERA'
  const html = pendingReminderHtml(venueName, resas, brand)
  await sendEmail({
    from: `${senderName()} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [venueEmail],
    subject: `⏳ ${resas.length} réservation${resas.length > 1 ? 's' : ''} en attente de confirmation — ${venueName}`,
    html,
  })
}
