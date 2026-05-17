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
}

// ── Email récap voyage (UN seul email pour tout le trip) ───
export async function sendTripSummaryEmail(data: TripData) {
  const managerName = process.env.MANAGER_NAME || 'ITINERA'
  const rpName = data.rpDisplayName || managerName

  const bookingRows = data.bookings.map((b, i) => `
    <div style="margin-bottom: 28px; padding: 24px; background: #1a1a1a; border: 1px solid #2a2a2a; border-left: 3px solid #C9A84C;">
      <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px;">
        Réservation ${i + 1} / ${data.bookings.length}
      </div>
      <div style="color: #f5f0e8; font-size: 20px; font-style: italic; margin-bottom: 4px;">${b.establishment}</div>
      <div style="color: #9a9a9a; font-size: 12px; letter-spacing: 1px; margin-bottom: 16px;">${b.destination}</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #9a9a9a; font-size: 11px; width: 50%;">
            <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 2px;">Date</span>
            <span style="color: #f5f0e8; font-size: 14px;">${b.date}</span>
          </td>
          <td style="padding: 6px 0; color: #9a9a9a; font-size: 11px;">
            <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 2px;">Service</span>
            <span style="color: #f5f0e8; font-size: 14px;">${b.time}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">
            <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #9a9a9a; display: block; margin-bottom: 2px;">Personnes</span>
            <span style="color: #f5f0e8; font-size: 14px;">${b.guests} personne${b.guests > 1 ? 's' : ''}</span>
          </td>
          ${b.occasion ? `<td style="padding: 6px 0;">
            <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #9a9a9a; display: block; margin-bottom: 2px;">Occasion</span>
            <span style="color: #f5f0e8; font-size: 14px;">${b.occasion}</span>
          </td>` : '<td></td>'}
        </tr>
        ${b.seating ? `<tr><td colspan="2" style="padding: 6px 0;">
          <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #9a9a9a; display: block; margin-bottom: 2px;">Placement</span>
          <span style="color: #f5f0e8; font-size: 14px;">${b.seating}</span>
        </td></tr>` : ''}
        ${b.specialRequests ? `<tr><td colspan="2" style="padding: 8px 0 0;">
          <div style="background: #141414; border-left: 2px solid #C9A84C; padding: 10px 14px; font-style: italic; color: #c4c4c4; font-size: 13px;">"${b.specialRequests}"</div>
        </td></tr>` : ''}
      </table>
      ${b.establishmentPhone || b.establishmentEmail ? `
      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #2a2a2a;">
        <span style="font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #666;">Contact établissement</span>
        <div style="margin-top: 6px; color: #888; font-size: 12px;">
          ${b.establishmentPhone ? `📞 ${b.establishmentPhone}` : ''}
          ${b.establishmentPhone && b.establishmentEmail ? ' &nbsp;·&nbsp; ' : ''}
          ${b.establishmentEmail ? `✉️ ${b.establishmentEmail}` : ''}
        </div>
      </div>` : ''}
    </div>
  `).join('')

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
      <div style="background: #1e1e1e; border: 1px solid rgba(201,168,76,0.25); padding: 20px 24px; margin-bottom: 32px;">
        <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 14px;">Client</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; width: 50%;">
              <span style="color: #9a9a9a; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;">Nom</span><br>
              <span style="color: #f5f0e8; font-size: 16px;">${data.firstName} ${data.lastName}</span>
            </td>
            <td style="padding: 4px 0;">
              <span style="color: #9a9a9a; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;">Téléphone</span><br>
              <span style="color: #f5f0e8; font-size: 16px;">${data.phone}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 8px 0 0;">
              <span style="color: #9a9a9a; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;">Email</span><br>
              <span style="color: #f5f0e8; font-size: 16px;">${data.email}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Réservations -->
      <div style="color: #C9A84C; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 20px;">
        Programme du séjour
      </div>

      ${bookingRows}

      <!-- WhatsApp -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://wa.me/${process.env.MANAGER_WHATSAPP}?text=Voyage%20reçu%20pour%20${encodeURIComponent(data.firstName + ' ' + data.lastName)}%20-%20${data.bookings.length}%20réservation${data.bookings.length > 1 ? 's' : ''}"
           style="display: inline-block; background: #25D366; color: white; padding: 12px 28px; text-decoration: none; font-size: 14px; margin-top: 8px;">
          💬 Répondre via WhatsApp
        </a>
      </div>
    </div>

    <div style="padding: 24px 40px; text-align: center; border-top: 1px solid #2a2a2a;">
      <p style="color: #555; font-size: 12px; letter-spacing: 1px; margin: 0;">${rpName} — Système de réservation privé</p>
    </div>
  </div>
</body>
</html>`

  const toRp = data.rpEmail || process.env.MANAGER_EMAIL || 'noreply@example.com'

  await sendEmail({
    from: `${rpName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
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
    from: `${rpName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: `✦ Voyage reçu — ${data.bookings.length} réservation${data.bookings.length > 1 ? 's' : ''} · ${data.firstName} ${data.lastName}`,
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
}

export async function sendReservationEmail(data: ReservationData) {
  const managerEmail = data.rpEmail || process.env.MANAGER_EMAIL || 'noreply@example.com'
  const managerName = data.rpDisplayName || process.env.MANAGER_NAME || 'Conciergerie'

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
      <div class="special" style="border-left-color:#C8A96B; color:#c4a96b;">"${data.internalNote}"</div>
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

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://wa.me/${toWaPhone(data.phone)}?text=${encodeURIComponent(`Bonjour ${data.firstName}, j'ai bien reçu votre demande de réservation chez ${data.establishment}.`)}"
           class="whatsapp-btn" style="background:#25D366; padding: 14px 36px; font-size: 13px; letter-spacing: 1px;">
          💬 Envoyer à mon contact
        </a>
      </div>
    </div>

    <div class="footer">
      <p>${managerName} — Système de réservation privé</p>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    from: `${managerName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
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
    from: `${managerName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: `✦ Demande reçue — ${data.establishment}${data.destination ? ` · ${data.destination}` : ''} · ${data.date}`,
    html: clientHtml,
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
  const rpName = data.rpDisplayName || process.env.MANAGER_NAME || 'ITINERA'
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

      <div style="text-align: center;">
        <a href="https://wa.me/${toWaPhone(data.phone)}?text=${encodeURIComponent(`Bonjour ${data.firstName}, concernant votre ${isCancel ? 'annulation' : 'modification'} de réservation chez ${data.establishment}.`)}"
           style="display: inline-block; background: #25D366; color: white; padding: 12px 28px; text-decoration: none; font-size: 14px;">
          💬 WhatsApp ${data.firstName}
        </a>
      </div>
    </div>
    <div style="padding: 24px 40px; text-align: center; border-top: 1px solid #2a2a2a;">
      <p style="color: #555; font-size: 12px; margin: 0;">${rpName} — Dashboard RP</p>
    </div>
  </div>
</body>
</html>`

  const toAddress = data.rpEmail || process.env.MANAGER_EMAIL || 'contact@itinera.click'

  await sendEmail({
    from: `${rpName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
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
    from: `${rpName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: `✎ Réservation modifiée — ${data.establishment}`,
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
    from: `${rpName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: isConfirmed
      ? `✦ Confirmée — ${data.establishment} · ${data.date}`
      : `Votre demande — ${data.establishment}`,
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
    from: `${rpName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.clientEmail],
    subject: `Votre espace de conciergerie est prêt — ${rpName}`,
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
    from: `${rpName} <${process.env.RESEND_FROM_EMAIL || 'contact@itinera.click'}>`,
    to: [data.email],
    subject: isCancel
      ? `✕ Annulation confirmée — ${data.establishment}`
      : `✎ Modification transmise — ${data.establishment}`,
    html,
    ...(data.rpEmail ? { reply_to: data.rpEmail } : {}),
  })
}
