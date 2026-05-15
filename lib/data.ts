export type Destination = {
  slug: string
  name: string
  country: string
  description: string
  image: string
  emoji: string
}

export type Establishment = {
  slug: string
  destination: string
  name: string
  type: 'Restaurant' | 'Beach Club' | 'Rooftop' | 'Nightclub' | 'Lounge'
  description: string
  shortDesc: string
  image: string
  cuisine?: string
  priceRange: '€€€' | '€€€€' | '€€€€€'
  phone: string
  email: string
  address: string
  openTime: string
  closeTime: string
  tags: string[]
  services?: string[]   // créneaux personnalisés (undefined = tous les créneaux par défaut)
}

export const destinations: Destination[] = [
  {
    slug: 'saint-tropez',
    name: 'Saint-Tropez',
    country: 'France',
    description: 'La perle de la Côte d\'Azur, entre plages dorées et soirées légendaires.',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80',
    emoji: '⛵',
  },
  {
    slug: 'dubai',
    name: 'Dubai',
    country: 'Émirats Arabes Unis',
    description: 'L\'opulence à l\'état pur, entre gratte-ciels et désert doré.',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80',
    emoji: '🏙️',
  },
  {
    slug: 'miami',
    name: 'Miami',
    country: 'États-Unis',
    description: 'L\'art de vivre américain, entre Art Deco, plages et nuits électriques.',
    image: 'https://images.unsplash.com/photo-1503891450247-ee5f8ec46dc3?w=1200&q=80',
    emoji: '🌴',
  },
  {
    slug: 'cannes',
    name: 'Cannes',
    country: 'France',
    description: 'Glamour et prestige sur la Croisette, capitale mondiale du cinéma.',
    image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=1200&q=80',
    emoji: '🎬',
  },
  {
    slug: 'monaco',
    name: 'Monaco',
    country: 'Monaco',
    description: 'La principauté du luxe absolu, entre casino mythique et Grand Prix.',
    image: 'https://images.unsplash.com/photo-1464982326199-86f32f81b211?w=1200&q=80',
    emoji: '🎰',
  },
  {
    slug: 'courchevel',
    name: 'Courchevel',
    country: 'France',
    description: 'La station de ski la plus exclusive des Alpes, entre poudreuse et gastronomie.',
    image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80',
    emoji: '⛷️',
  },
  {
    slug: 'saint-barth',
    name: 'Saint-Barthélemy',
    country: 'France',
    description: 'Le joyau des Caraïbes, paradis des célébrités et de la dolce vita.',
    image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200&q=80',
    emoji: '🏝️',
  },
]

export const establishments: Establishment[] = [
  // ─── SAINT-TROPEZ ───────────────────────────────────────────────
  {
    slug: 'le-club-55',
    destination: 'saint-tropez',
    name: 'Club 55',
    type: 'Beach Club',
    shortDesc: 'L\'institution mythique de Pampelonne depuis 1955.',
    description: 'Fondé en 1955 lors du tournage d\'Et Dieu créa la Femme, le Club 55 est la référence absolue de Saint-Tropez. Ses tables en bord de mer, sa cuisine provençale et son atmosphère unique en font un lieu hors du temps.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    cuisine: 'Méditerranéenne',
    priceRange: '€€€€€',
    phone: '+33612345678',
    email: 'contact@club55.fr',
    address: 'Route de Tahiti, Ramatuelle, Saint-Tropez',
    openTime: '08:00',
    closeTime: '23:00',
    tags: ['Plage', 'Déjeuner', 'Emblématique'],
  },
  {
    slug: 'nikki-beach-st-tropez',
    destination: 'saint-tropez',
    name: 'Nikki Beach',
    type: 'Beach Club',
    shortDesc: 'Le temple de la fête et du soleil sur la plage de Pampelonne.',
    description: 'Nikki Beach Saint-Tropez est l\'épicentre de la vie festive tropézienne. DJ sets, bouteilles de champagne et ambiance internationale pour une expérience inoubliable.',
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
    cuisine: 'Internationale',
    priceRange: '€€€€€',
    phone: '+33612345679',
    email: 'sttropez@nikkibeach.com',
    address: 'Route de l\'Épi, Ramatuelle',
    openTime: '10:00',
    closeTime: '02:00',
    tags: ['Beach Club', 'DJ', 'Champagne'],
  },
  {
    slug: 'vip-room-st-tropez',
    destination: 'saint-tropez',
    name: 'VIP Room',
    type: 'Nightclub',
    shortDesc: 'La boîte de nuit la plus exclusive de la Côte d\'Azur.',
    description: 'Le VIP Room est synonyme de nuits inoubliables à Saint-Tropez. Stars, jet-setters et DJ internationaux se retrouvent dans ce temple de la nuit.',
    image: 'https://images.unsplash.com/photo-1571266028027-1490c7d8c73e?w=800&q=80',
    priceRange: '€€€€€',
    phone: '+33612345680',
    email: 'resa@viproom.fr',
    address: 'Nouveau Port, Saint-Tropez',
    openTime: '23:00',
    closeTime: '06:00',
    tags: ['Nightclub', 'DJ', 'VIP'],
  },

  // ─── DUBAI ───────────────────────────────────────────────────────
  {
    slug: 'nobu-dubai',
    destination: 'dubai',
    name: 'Nobu Dubai',
    type: 'Restaurant',
    shortDesc: 'La cuisine japonaise-péruvienne iconique au cœur d\'Atlantis.',
    description: 'Nobu Dubai, niché dans l\'hôtel Atlantis The Palm, offre l\'expérience gastronomique signature de Nobu Matsuhisa avec une vue spectaculaire sur le golfe Persique.',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
    cuisine: 'Japonaise-Péruvienne',
    priceRange: '€€€€€',
    phone: '+97142262626',
    email: 'nobu@atlantis.com',
    address: 'Atlantis The Palm, Dubai',
    openTime: '12:00',
    closeTime: '00:00',
    tags: ['Gastronomie', 'Sushi', 'Vue mer'],
  },
  {
    slug: 'cé-la-vi-dubai',
    destination: 'dubai',
    name: 'Cé La Vi',
    type: 'Rooftop',
    shortDesc: 'Rooftop d\'exception avec vue panoramique sur Dubai Marina.',
    description: 'Perché au 54ème étage, Cé La Vi Dubai offre une expérience dining et clubbing incomparable avec une vue à 360° sur la skyline de Dubai et la mer Arabique.',
    image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&q=80',
    cuisine: 'Pan-Asiatique',
    priceRange: '€€€€€',
    phone: '+97144524252',
    email: 'dubai@celavi.com',
    address: 'Address Sky View, Downtown Dubai',
    openTime: '12:00',
    closeTime: '03:00',
    tags: ['Rooftop', 'DJ', 'Vue panoramique'],
  },
  {
    slug: 'zuma-dubai',
    destination: 'dubai',
    name: 'Zuma Dubai',
    type: 'Restaurant',
    shortDesc: 'L\'izakaya japonaise contemporaine la plus célèbre du monde.',
    description: 'Zuma Dubai est une référence mondiale de la cuisine japonaise contemporaine. Dans un cadre somptueux au DIFC, l\'expérience culinaire est à la hauteur de la réputation internationale de la marque.',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
    cuisine: 'Japonaise Contemporaine',
    priceRange: '€€€€€',
    phone: '+97144255660',
    email: 'dubai@zumarestaurant.com',
    address: 'Gate Village, DIFC, Dubai',
    openTime: '12:00',
    closeTime: '01:00',
    tags: ['Izakaya', 'DIFC', 'Gastronomie'],
  },

  // ─── MIAMI ───────────────────────────────────────────────────────
  {
    slug: 'swan-miami',
    destination: 'miami',
    name: 'Swan Miami',
    type: 'Restaurant',
    shortDesc: 'Le restaurant de David Grutman et Pharrell Williams.',
    description: 'Swan est l\'œuvre de David Grutman et Pharrell Williams au cœur de Wynwood. Un concept unique mêlant gastronomie européenne, design épuré et ambiance vibrante.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    cuisine: 'Européenne Moderne',
    priceRange: '€€€€',
    phone: '+13055391234',
    email: 'reservations@swanmiami.com',
    address: '90 NE 39th St, Miami Design District',
    openTime: '11:30',
    closeTime: '02:00',
    tags: ['Design District', 'Brunch', 'Célèbres'],
  },
  {
    slug: 'mynt-lounge',
    destination: 'miami',
    name: 'Mynt Lounge',
    type: 'Nightclub',
    shortDesc: 'La boîte de nuit préférée des célébrités à South Beach.',
    description: 'Mynt Lounge est l\'adresse incontournable de South Beach. Depuis plus de 20 ans, ce club ultra-exclusif attire l\'élite internationale pour des nuits mémorables.',
    image: 'https://images.unsplash.com/photo-1571266028243-d220c6a3d8c2?w=800&q=80',
    priceRange: '€€€€€',
    phone: '+13055321234',
    email: 'vip@myntlounge.com',
    address: '1921 Collins Ave, South Beach, Miami',
    openTime: '23:00',
    closeTime: '05:00',
    tags: ['South Beach', 'VIP', 'Nightlife'],
  },

  // ─── CANNES ──────────────────────────────────────────────────────
  {
    slug: 'la-palme-dor',
    destination: 'cannes',
    name: 'La Palme d\'Or',
    type: 'Restaurant',
    shortDesc: 'Restaurant 2 étoiles Michelin au cœur de l\'hôtel Martinez.',
    description: 'La Palme d\'Or est l\'une des plus grandes tables de la Côte d\'Azur. Deux étoiles Michelin, une vue imprenable sur la Méditerranée et une cuisine d\'exception signée Christian Sinicropi.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    cuisine: 'Gastronomique Française',
    priceRange: '€€€€€',
    phone: '+33493906600',
    email: 'palmedor@martinez.fr',
    address: '73 Boulevard de la Croisette, Cannes',
    openTime: '19:30',
    closeTime: '22:30',
    tags: ['Michelin', 'Gastronomie', 'Croisette'],
  },
  {
    slug: 'baoli-cannes',
    destination: 'cannes',
    name: 'Baoli',
    type: 'Lounge',
    shortDesc: 'Le rendez-vous des célébrités du Festival de Cannes.',
    description: 'Le Baoli est l\'adresse mythique de Cannes, lieu de toutes les after-parties du Festival. Restaurant gastronomique et club sur deux niveaux avec terrasse face à la mer.',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
    cuisine: 'Pan-Asiatique',
    priceRange: '€€€€€',
    phone: '+33493435003',
    email: 'info@baoli-cannes.com',
    address: 'Port Pierre Canto, Boulevard de la Croisette, Cannes',
    openTime: '20:00',
    closeTime: '04:00',
    tags: ['Festival', 'VIP', 'Club'],
  },

  // ─── MONACO ──────────────────────────────────────────────────────
  {
    slug: 'joel-robuchon-monaco',
    destination: 'monaco',
    name: 'Joël Robuchon Monte-Carlo',
    type: 'Restaurant',
    shortDesc: 'L\'atelier du chef le plus étoilé du monde au Métropole.',
    description: 'L\'Atelier de Joël Robuchon Monte-Carlo est une expérience gastronomique unique. Dans le cadre de l\'hôtel Métropole, ce comptoir ouvert sur les cuisines offre une immersion totale dans la haute gastronomie.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    cuisine: 'Gastronomique Française',
    priceRange: '€€€€€',
    phone: '+37793150100',
    email: 'robuchon@metropole.mc',
    address: '4 Avenue de la Madone, Monaco',
    openTime: '19:00',
    closeTime: '22:30',
    tags: ['Michelin', '3 étoiles', 'Gastronomie'],
  },
  {
    slug: 'sass-cafe-monaco',
    destination: 'monaco',
    name: 'Sass Café',
    type: 'Lounge',
    shortDesc: 'Le club le plus exclusif de Monaco depuis 1974.',
    description: 'Le Sass Café est une institution monégasque. Bar, restaurant et club intime, c\'est le rendez-vous des grands de ce monde depuis plus de 50 ans. Une discrétion absolue pour une clientèle d\'exception.',
    image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80',
    priceRange: '€€€€€',
    phone: '+37793255252',
    email: 'info@sasscafe.mc',
    address: '11 Avenue Princesse Grace, Monaco',
    openTime: '20:00',
    closeTime: '05:00',
    tags: ['Historique', 'VIP', 'Discret'],
  },

  // ─── COURCHEVEL ──────────────────────────────────────────────────
  {
    slug: 'le-1947-courchevel',
    destination: 'courchevel',
    name: 'Le 1947',
    type: 'Restaurant',
    shortDesc: 'Restaurant 3 étoiles Michelin au Cheval Blanc Courchevel.',
    description: 'Le 1947 par Yannick Alléno est la table la plus prestigieuse des Alpes. Dans le cadre féérique du Cheval Blanc, une expérience gastronomique unique à 1850 mètres d\'altitude.',
    image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=80',
    cuisine: 'Gastronomique Française',
    priceRange: '€€€€€',
    phone: '+33479009696',
    email: 'le1947@chevalblanc.com',
    address: 'Cheval Blanc, Courchevel 1850',
    openTime: '19:30',
    closeTime: '22:00',
    tags: ['3 étoiles Michelin', 'Montagne', 'Prestige'],
  },
  {
    slug: 'le-cap-horn',
    destination: 'courchevel',
    name: 'Le Cap Horn',
    type: 'Restaurant',
    shortDesc: 'La brasserie de luxe avec terrasse ski-in ski-out.',
    description: 'Le Cap Horn est la table incontournable de Courchevel 1850. Sa terrasse ensoleillée, son cadre chaleureux et sa cuisine généreuse en font le déjeuner le plus couru des stations alpines.',
    image: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=800&q=80',
    cuisine: 'Brasserie de Luxe',
    priceRange: '€€€€',
    phone: '+33479080133',
    email: 'info@caphorn-courchevel.fr',
    address: 'Rue du Rocher, Courchevel 1850',
    openTime: '12:00',
    closeTime: '23:00',
    tags: ['Ski', 'Terrasse', 'Déjeuner'],
  },

  // ─── SAINT-BARTH ─────────────────────────────────────────────────
  {
    slug: 'le-barthelemy',
    destination: 'saint-barth',
    name: 'Le Barthélemy',
    type: 'Restaurant',
    shortDesc: 'Restaurant gastronomique de l\'hôtel 5 étoiles de Grand Cul-de-Sac.',
    description: 'Le restaurant du Barthélemy Hotel & Spa offre une cuisine de haute volée dans un cadre idyllique face au lagon. L\'accord parfait entre gastronomie française et douceur caribéenne.',
    image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
    cuisine: 'Gastronomique Franco-Créole',
    priceRange: '€€€€€',
    phone: '+590590276681',
    email: 'restaurant@barthelemy-hotel.com',
    address: 'Grand Cul-de-Sac, Saint-Barthélemy',
    openTime: '07:00',
    closeTime: '22:30',
    tags: ['Lagon', 'Gastronomie', 'Vue mer'],
  },
  {
    slug: 'wall-house',
    destination: 'saint-barth',
    name: 'Wall House',
    type: 'Restaurant',
    shortDesc: 'La table de référence de Gustavia avec vue sur le port.',
    description: 'Installé dans un bâtiment suédois du XVIIIème siècle face au port de Gustavia, le Wall House est la grande table de Saint-Barth. Cuisine française raffinée, cave exceptionnelle.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    cuisine: 'Gastronomique Française',
    priceRange: '€€€€€',
    phone: '+590590277183',
    email: 'contact@wallhousestbarth.com',
    address: 'Rue Fayard, Gustavia, Saint-Barthélemy',
    openTime: '19:00',
    closeTime: '23:00',
    tags: ['Port', 'Historique', 'Gastronomie'],
  },
]

export function getDestination(slug: string) {
  return destinations.find(d => d.slug === slug)
}

export function getEstablishmentsByDestination(destinationSlug: string) {
  return establishments.filter(e => e.destination === destinationSlug)
}

export function getEstablishment(destinationSlug: string, slug: string) {
  return establishments.find(e => e.destination === destinationSlug && e.slug === slug)
}
