// Données du parcours, reprises de l'artefact parcours-mexique
export const SPLIT = [];

export const PHASES = [
  {
    id: 'cdmx', num: 1, title: 'Mexico City & Puebla', dates: '8 – 16 sept', days: 9, color: '#E0177D', emoji: '🏛️',
    cities: [
      { name: 'Mexico City (CDMX)', lat: 19.432642, lng: -99.1333215 },
      { name: 'Puebla', lat: 19.0437335, lng: -98.1980244 },
      { name: 'Teotihuacán', lat: 19.6925, lng: -98.8438 },
    ],
    poi: {
      'Histoire & culture': ['Zócalo & Cathédrale Métropolitaine', 'Templo Mayor', 'Palacio Nacional — fresques de Diego Rivera', "Musée national d'Anthropologie", 'Casa Azul (Frida Kahlo), Coyoacán', 'Palacio de Bellas Artes'],
      'Nature': ['Pyramides de Teotihuacán', 'Xochimilco — canaux et trajineras', 'Bosque de Chapultepec & Castillo de Chapultepec'],
      'Gastronomie': ['Mercado de San Juan', 'Tacos al pastor de quartier', 'Mole poblano à Puebla', 'Pulquerías traditionnelles du centre', 'Café de Tacuba pour un déjeuner historique'],
      'Marché & artisanat': ['Talavera de Puebla', 'Marché de Coyoacán le week-end', 'Mercado de Artesanías La Ciudadela'],
    },
    highlights: ['Montgolfière au lever du jour sur Teotihuacán', "Soirée lucha libre à l'Arena México", "Quartiers Roma/Condesa pour l'ambiance locale", 'Cholula au coucher du soleil, volcan en toile de fond', 'Vue panoramique depuis la Torre Latinoamericana', 'Plaza de las Tres Culturas à Tlatelolco', "Marché de Sonora pour l'ambiance ésotérique"],
    tips: ["Altitude de 2 240 m — prévoir 1 à 2 jours d'acclimatation avant les excursions physiques", "Saison encore pluvieuse en septembre : averses courtes en fin d'après-midi, les matinées restent dégagées", "Street food excellent et bon marché — privilégier les stands à forte rotation/file d'attente", "Réserver la montgolfière de Teotihuacán à l'avance, les vols du lever du jour partent vite"],
    eat: [
      { name: 'Pujol', type: 'resto', note: "Parmi les meilleurs d'Amérique latine", desc: "Cuisine mexicaine réinventée par Enrique Olvera (mole madre iconique) — réserver plusieurs semaines à l'avance." },
      { name: 'Contramar', type: 'resto', note: 'Institution', desc: 'LA table de fruits de mer de Roma Norte, tostada de thon culte — pas de réservation nécessaire le midi.' },
      { name: 'El Cardenal', type: 'resto', note: 'Institution depuis 1969', desc: 'Petit-déjeuner/déjeuner classique du centre historique, service en costume, ambiance feutrée.' },
      { name: 'Churrería El Moro', type: 'resto', note: 'Emblématique depuis 1935', desc: 'Churros et chocolat chaud incontournables, plusieurs adresses dans la ville, ouvert 24h/24.' },
    ],
  },
  {
    id: 'bajio', num: 2, title: 'Bajío colonial', dates: '17 – 21 sept', days: 5, color: '#9D6BD4', emoji: '🎨',
    cities: [
      { name: 'San Miguel de Allende', lat: 20.9127407, lng: -100.7420414 },
      { name: 'Guanajuato', lat: 21.0187971, lng: -101.2578347 },
    ],
    poi: {
      'Histoire & culture': ['Parroquia de San Miguel Arcángel', 'Callejones de Guanajuato', 'Teatro Juárez', 'Alhóndiga de Granaditas', 'Mirador El Pípila'],
      'Gastronomie': ['Vignobles du Bajío (Dos Búhos, Cuna de Tierra)', 'Mercado Ignacio Ramírez', 'Enchiladas mineras, spécialité locale'],
      'Marché & artisanat': ["Boutiques d'artisanat de San Miguel", "Fábrica La Aurora (ateliers d'artistes)"],
    },
    highlights: ['Callejoneada nocturne à Guanajuato (tournée musicale dans les ruelles)', 'Coucher de soleil depuis El Mirador', 'Dégustation de vin dans un domaine local', "Museo de las Momias, pour l'insolite", 'Funiculaire jusqu\u2019au Pípila pour la vue sur la ville', 'Callejón del Beso, la ruelle la plus étroite de Guanajuato'],
    tips: ["Week-ends très fréquentés à San Miguel — réserver l'hébergement en semaine si possible", "5 jours suffisent largement pour les deux villes, distantes d'1h30 de route", "Guanajuato se visite surtout à pied : chaussures confortables indispensables (callejones pavés et pentus)"],
    eat: [
      { name: 'ATRIO', type: 'resto', note: 'Rooftop emblématique', desc: 'Vue spectaculaire sur la Parroquia depuis le toit, cuisine raffinée et cocktails au mezcal.' },
      { name: 'Hortus', type: 'resto', note: 'Très bien noté', desc: 'Cuisine méditerranéenne dans un jardin, à deux pas de la Parroquia.' },
      { name: 'La Azotea / Luna Rooftop', type: 'bar', note: 'Meilleur coucher de soleil', desc: "L'un des rooftops les plus courus de San Miguel pour l'heure de l'apéro." },
      { name: 'RAIGAL', type: 'resto', note: 'À Guanajuato', desc: 'Cuisine contemporaine accordée aux vins de Cuna de Tierra, au cœur du vignoble du Bajío.' },
    ],
  },
  {
    id: 'cuivre', num: 3, title: 'Train du Cuivre', dates: '22 – 26 sept', days: 5, color: '#3FA565', emoji: '⛰️',
    cities: [
      { name: 'Chihuahua', lat: 28.6364476, lng: -106.0767177 },
      { name: 'Creel', lat: 27.7504473, lng: -107.636889 },
      { name: 'El Fuerte', lat: 26.417632, lng: -108.6145938 },
    ],
    poi: {
      'Nature': ['Barrancas del Cobre — plus profond que le Grand Canyon', 'Cascada de Cusárare', 'Lago Arareko', 'Valle de los Monjes', 'Valle de los Hongos', 'Mirador Piedra Volada'],
      'Histoire & culture': ['Communauté Rarámuri (Tarahumara)', 'Mission jésuite de Creel'],
    },
    highlights: ['Trajet en Chepe Express, vues panoramiques sur le canyon', 'Tyrolienne au Parque de Aventura', 'Randonnée à Cusárare', 'Marché artisanal Rarámuri à Creel', 'Coucher de soleil sur Piedra Volada, la plus haute cascade du Mexique', 'Nuit dans une cabane en bois à Creel pour l\u2019ambiance montagne'],
    tips: ["Octobre offre des températures fraîches en altitude, parfois proches de 0°C la nuit — prévoir des vêtements chauds", "Privilégier les zones touristiques classiques (Creel, Divisadero, El Fuerte) — éviter les vallées reculées hors sentiers", "Réserver le Chepe Express plusieurs semaines à l'avance, surtout en classe Express confort"],
    eat: [
      { name: 'Comedores locaux de Creel', type: 'resto', note: 'Cuisine Rarámuri', desc: 'Truite fraîche du Lago Arareko et plats traditionnels tarahumaras dans de petits restaurants familiaux.' },
    ],
  },
  {
    id: 'baja', num: 4, title: 'Basse Californie', dates: '27 sept – 9 oct', days: 13, color: '#2EB8CC', emoji: '🌊',
    cities: [
      { name: 'La Paz', lat: 24.1426408, lng: -110.3127531 },
      { name: 'Todos Santos', lat: 23.4463619, lng: -110.2265101 },
      { name: 'Cabo Pulmo', lat: 23.4363627, lng: -109.4296296 },
    ],
    poi: {
      'Plage & mer': ['Cabo Pulmo — récif corallien protégé', 'Playa Balandra', 'Isla Espíritu Santo', 'Playa El Tecolote'],
      'Histoire & culture': ["Todos Santos — galeries d'art, Hotel California", 'Malecón de La Paz'],
      'Gastronomie': ['Marché de producteurs de La Paz', 'Tacos de poisson à Todos Santos', 'Mariscos frais sur le Malecón'],
    },
    highlights: ['Nager avec les lions de mer à Isla Espíritu Santo', "Plongée à Cabo Pulmo, un des meilleurs récifs d'Amérique du Nord", 'Coucher de soleil à Balandra', 'Surf à Los Cerritos', 'Balade à vélo sur le Malecón de La Paz au coucher du soleil', 'Observation des baleines grises selon la saison'],
    tips: ["Cabo San Lucas, très touristique et cher, peut être sauté au profit de Cabo Pulmo et Todos Santos, plus proches de votre style de voyage", "Une voiture de location change la donne : les bus sont rares entre les villes de la péninsule", "Meilleure saison : chaleur estivale retombée, mer encore chaude (26–28°C)"],
    eat: [
      { name: 'Bismarkcito', type: 'resto', note: 'Institution depuis 1968', desc: 'La table de fruits de mer historique de La Paz, sur le Malecón.' },
      { name: 'El Estadio Tacos / TacoFish', type: 'resto', note: 'Meilleurs tacos de poisson', desc: 'Tacos de poisson/crevette façon Baja, bar à salsas à volonté.' },
      { name: 'Jazamango', type: 'resto', note: 'Très bien noté', desc: 'Farm-to-table du chef Javier Plascencia à Todos Santos, dans son propre verger.' },
      { name: 'Seis Uno Dos (612)', type: 'bar', note: 'Rooftop sunset', desc: 'Cocktails et vue sur le Malecón de La Paz au coucher du soleil.' },
    ],
  },
  {
    id: 'pacifique', num: 5, title: 'Côte Pacifique Oaxaca', dates: '12 – 22 oct', days: 11, color: '#1EC2B0', emoji: '🌴',
    cities: [
      { name: 'Puerto Escondido', lat: 15.8675981, lng: -97.0799292 },
      { name: 'Mazunte', lat: 15.6677291, lng: -96.5545185 },
      { name: 'Zipolite', lat: 15.6643203, lng: -96.5186163 },
    ],
    poi: {
      'Plage & mer': ['Playa Zicatela (surf)', 'Playa Carrizalillo', 'Playa Zipolite', 'Playa Mazunte'],
      'Nature': ['Laguna de Manialtepec — bioluminescence', 'Centro Mexicano de la Tortuga (Mazunte)', 'Punta Cometa, réserve naturelle'],
      'Fête & vie nocturne': ['Bars de Zicatela', 'La Punta, quartier plus calme et alternatif'],
    },
    highlights: ['Kayak nocturne sur la lagune bioluminescente', 'Cours de surf à Zicatela', 'Coucher de soleil à Punta Cometa', 'Marché de Pochutla', 'Spa et massages traditionnels à Mazunte', 'Excursion en bateau pour observer les dauphins'],
    tips: ["Zicatela = ambiance surf/fête, Mazunte = plus posé et écolo, Zipolite = libre et décontracté — répartir le temps selon l'énergie recherchée", "La lagune bioluminescente est plus spectaculaire les nuits sans lune", "Pas besoin de voiture : colectivos fréquents entre les trois villes"],
    eat: [
      { name: 'Almoraduz', type: 'resto', note: 'Distingué au guide Michelin', desc: 'Fine dining à Puerto Escondido, cuisine oaxaquègne revisitée.' },
      { name: 'Nana Pancha', type: 'resto', note: 'Institution locale', desc: 'Brewpub et tlayudas dans le quartier de Rinconada, bières artisanales.' },
      { name: 'Uhuru Bar', type: 'bar', note: 'Emblématique', desc: 'Bar reggae sur la plage de Zipolite, coucher de soleil et cocktails.' },
    ],
  },
  {
    id: 'oaxaca', num: 6, title: 'Oaxaca ville & Día de los Muertos', dates: '23 oct – 3 nov', days: 12, color: '#F2941E', emoji: '💀',
    cities: [
      { name: 'Oaxaca de Juárez (centro)', lat: 17.0898032, lng: -96.7084586 },
      { name: 'Xoxocotlán', lat: 17.0167, lng: -96.7269 },
      { name: 'San Agustín Etla', lat: 17.1808, lng: -96.7536 },
    ],
    poi: {
      'Histoire & culture': ['Centro histórico & Templo de Santo Domingo', 'Monte Albán', 'Museo de las Culturas de Oaxaca'],
      'Nature': ['Hierve el Agua — cascades pétrifiées', 'Árbol del Tule, arbre millénaire'],
      'Gastronomie': ['Palenques de mezcal à Santiago Matatlán', 'Mercado 20 de Noviembre — tlayudas', 'Mercado Benito Juárez', 'Les 7 moles traditionnels oaxaquègnes à goûter'],
      'Fête': ['Défilés de Catrinas', 'Ofrendas sur le Zócalo', 'Veillées au cimetière (1–2 nov)', 'Comparsas (processions costumées) dans les rues'],
    },
    highlights: ['Veillée au cimetière de Xoxocotlán dans la nuit du 1er au 2 novembre', 'Dégustation de mezcal artisanal dans une palenque', 'Atelier alebrijes à San Martín Tilcajete', 'Marché dominical de Tlacolula', 'Atelier de tissage de tapis à Teotitlán del Valle', 'Comparsa nocturne dans les rues du centre'],
    tips: ["Réserver le logement du centre historique des mois à l'avance pour Día de los Muertos", "Prévoir une journée de récupération le 3 novembre après la veillée — éviter de partir le 2", "L'ambiance monte crescendo dès le 28 octobre : marchés, ofrendas et défilés s'intensifient jour après jour"],
    eat: [
      { name: 'Casa Oaxaca el Restaurante', type: 'resto', note: 'Institution du chef Alejandro Ruiz', desc: 'Terrasse avec vue sur Santo Domingo, cuisine oaxaquègne sublimée.' },
      { name: 'Los Danzantes', type: 'resto', note: 'Table + propre label de mezcal', desc: 'Cour intérieure emblématique, cuisine créative et large carte de mezcal.' },
      { name: 'Sabina Sabe', type: 'bar', note: 'Très bien noté', desc: 'Cocktails au mezcal dans un décor coloré, nommé en hommage à María Sabina.' },
      { name: 'La Casa del Mezcal', type: 'bar', note: 'Mezcalería la plus ancienne, depuis 1935', desc: 'Cantina historique près du Zócalo, ambiance 100% locale.' },
    ],
  },
  {
    id: 'chiapas', num: 7, title: 'Chiapas', dates: '4 – 11 nov', days: 8, color: '#5FAE3F', emoji: '🌳',
    cities: [
      { name: 'San Cristóbal de las Casas', lat: 16.7366198, lng: -92.6388466 },
      { name: 'Palenque (ruinas)', lat: 17.4957455, lng: -92.0193798 },
      { name: 'Cañón del Sumidero', lat: 16.8281829, lng: -93.1061724 },
    ],
    poi: {
      'Nature': ['Cañón del Sumidero', 'Cascadas de Agua Azul', 'Misol-Ha', 'Lagunas de Montebello'],
      'Histoire & culture': ['Ruines de Palenque', 'San Juan Chamula', 'Zinacantán', 'Centre colonial de San Cristóbal'],
    },
    highlights: ["Visite respectueuse de l'église de San Juan Chamula", 'Bateau dans le Cañón del Sumidero au lever du jour', 'Nuit près de la jungle de Palenque', 'Marché de San Cristóbal', 'Baignade aux cascades de Agua Azul', 'Atelier de tissage à Zinacantán'],
    tips: ["San Juan Chamula a des règles strictes (pas de photos dans l'église) — à respecter impérativement", "Le bus de nuit Oaxaca–San Cristóbal remplace un vol intérieur et économise une nuit d'hôtel", "Climat plus frais à San Cristóbal (altitude ~2 200 m) qu'à Palenque (tropical et humide) — prévoir les deux types de vêtements"],
    eat: [
      { name: 'El Fogón de Jovel', type: 'resto', note: 'Institution locale', desc: 'Cuisine traditionnelle chiapanèque avec musiciens live, près de la cathédrale.' },
      { name: 'La Viña de Bacco', type: 'bar', note: 'Bar à vin emblématique', desc: 'Tables sur tonneaux, ambiance conviviale, musique live sur Real de Guadalupe.' },
      { name: 'Café Bar Revolución', type: 'bar', note: 'Le plus animé de la ville', desc: 'Cocktails au mezcal et concerts live tous les soirs.' },
    ],
  },
  {
    id: 'yucatan', num: 8, title: 'Yucatán élargi', dates: '12 – 25 nov', days: 14, color: '#3E8FE0', emoji: '💧',
    cities: [
      { name: 'Mérida', lat: 20.9681469, lng: -89.6298724 },
      { name: 'Valladolid', lat: 20.68964, lng: -88.2022488 },
      { name: 'Chichén Itzá', lat: 20.6842849, lng: -88.5677826 },
      { name: 'Holbox', lat: 21.5308421, lng: -87.2866995 },
      { name: 'Tulum', lat: 20.2114185, lng: -87.4653502 },
      { name: 'Bacalar', lat: 18.6778712, lng: -88.3901067 },
    ],
    poi: {
      'Histoire & culture': ['Chichén Itzá', 'Centre colonial de Mérida', 'Uxmal (optionnel)'],
      'Nature': ['Cenotes de Valladolid (Dzitnup, Suytun)', 'Laguna de Bacalar — lagune aux 7 couleurs', 'Isla Holbox', 'Réserve de Río Lagartos (flamants roses)'],
      'Plage & mer': ['Plage de Tulum', 'Plages de Holbox'],
    },
    highlights: ["Baignade dans un cenote à l'aube avant les foules", 'Kayak sur la lagune de Bacalar', 'Coucher de soleil à Holbox', 'Marché Lucas de Gálvez à Mérida', 'Soirée musique live sur le Paseo de Montejo à Mérida', 'Observation des flamants roses à Río Lagartos'],
    tips: ["Chichén Itzá tôt le matin, avant 9h, pour éviter les bus de tourisme en masse", "Holbox se visite sans voiture — île piétonne et golf carts uniquement", "Préférer Bacalar ou Holbox à Tulum pour une ambiance plus authentique et moins saturée"],
    eat: [
      { name: 'La Zebra', type: 'resto', note: 'Très bien noté', desc: 'Cuisine mexicaine chic les pieds dans le sable, à Tulum.' },
      { name: 'Nixtamal', type: 'resto', note: 'Qualité "Michelin" selon la presse locale', desc: 'Fine dining dans un jardin tropical à Bacalar, prix étonnamment raisonnables.' },
      { name: 'Painapol', type: 'resto', note: "Meilleur brunch de l'île", desc: 'Cuisine fusion en bord de plage à Holbox.' },
    ],
  },
  {
    id: 'belize', num: 9, title: 'Belize', dates: '26 nov – 2 déc', days: 7, color: '#22C2D6', emoji: '🐠',
    cities: [
      { name: 'San Pedro (Ambergris Caye)', lat: 17.9212247, lng: -87.9613651 },
    ],
    poi: { 'Plage & mer': ['Hol Chan Marine Reserve', 'Shark Ray Alley', 'Belize Barrier Reef', 'Caye Caulker (excursion)'] },
    highlights: ['Snorkeling à Hol Chan avec raies et requins nourrices', "Balade en golf cart sur l'île", 'Soirée reggae/punta sur la plage', 'Excursion à Caye Caulker pour la version calme', 'Coucher de soleil au Split à Caye Caulker', 'Plongée au Blue Hole pour les niveaux avancés'],
    tips: ["L'anglais est la langue officielle — un bon repos linguistique après plusieurs mois d'espagnol", "San Pedro = plus animé, Caye Caulker = plus relax — possible de combiner les deux en day-trip", "Monnaie locale arrimée au dollar US, prix touristiques plus élevés que le reste du parcours"],
    eat: [
      { name: "Elvi's Kitchen", type: 'resto', note: "Le plus emblématique de l'île", desc: 'Institution de San Pedro depuis des décennies — buffet maya, musique live.' },
      { name: 'Wild Mango', type: 'resto', note: 'Très bien noté', desc: 'Fruits de mer en front de mer, dans le centre de San Pedro.' },
      { name: 'The Truck Stop', type: 'bar', note: 'Lieu incontournable', desc: "Conteneurs recyclés, food trucks, piscine et concerts — l'ambiance la plus fun de l'île." },
    ],
  },
  {
    id: 'guatemala', num: 10, title: 'Guatemala', dates: '3 – 12 déc', days: 10, color: '#D87A4A', emoji: '🌋',
    cities: [
      { name: 'Antigua', lat: 14.5572969, lng: -90.7332233 },
      { name: 'Panajachel / Atitlán', lat: 14.7447393, lng: -91.153659 },
      { name: 'Chichicastenango', lat: 14.9429877, lng: -91.1104459 },
      { name: 'Semuc Champey', lat: 15.5337702, lng: -89.958977 },
      { name: 'Tikal', lat: 17.2220409, lng: -89.6236995 },
    ],
    poi: {
      'Histoire & culture': ['Antigua coloniale', 'Tikal', 'Marché de Chichicastenango', 'Ruines de Yaxhá (alternative moins fréquentée à Tikal)'],
      'Nature': ['Volcan Acatenango', 'Lac Atitlán', 'Semuc Champey', 'Volcan Pacaya (option plus courte qu\u2019Acatenango)'],
    },
    highlights: ['Lever de soleil au volcan Acatenango, vue sur le Fuego', 'Piscines turquoise de Semuc Champey', 'Jour de marché à Chichicastenango (jeudi ou dimanche)', 'Coucher de soleil en bateau sur le lac Atitlán', 'Villages mayas autour d\u2019Atitlán (San Juan La Laguna, San Pedro)', 'Grottes de Lanquín près de Semuc Champey'],
    tips: ["L'ascension de l'Acatenango est physiquement exigeante (2 jours, fort dénivelé) — prévoir une bonne condition physique", "Chichicastenango n'est animé que le jeudi et le dimanche — caler l'itinéraire en conséquence", "Route Atitlán–Semuc Champey longue et sinueuse — prévoir une journée complète de transport"],
    eat: [
      { name: 'Café Sky', type: 'bar', note: "Classique d'Antigua", desc: 'Terrasse avec vue imprenable sur le volcan Fuego en éruption.' },
      { name: 'Ulew Cocktail Bar', type: 'bar', note: 'Sélectionné au 50 Best Discovery', desc: 'Speakeasy sans carte — cocktails sur-mesure selon vos goûts, dans la Antigua Brewing Company.' },
      { name: 'El Comalote', type: 'resto', note: 'Cuisine traditionnelle', desc: 'Tortillas de maïs natif et pepián (plat national), engagement envers les petits producteurs.' },
    ],
  },
  {
    id: 'salvador', num: 11, title: 'Salvador', dates: '13 – 17 déc', days: 5, color: '#E84855', emoji: '☀️',
    cities: [
      { name: 'San Salvador', lat: 13.6980638, lng: -89.1915341 },
      { name: 'Santa Ana', lat: 13.9942, lng: -89.5597 },
      { name: 'El Tunco', lat: 13.4928, lng: -89.3789 },
    ],
    poi: {
      'Nature': ['Volcán de Santa Ana (Ilamatepec)', 'Lago de Coatepeque', 'Volcán de Izalco (vue depuis Santa Ana)'],
      'Plage & mer': ['El Tunco — surf', 'El Zonte, plage plus calme'],
      'Gastronomie & marché': ['Ruta de las Flores — Juayúa, Ataco', 'Pupusas, plat national'],
    },
    highlights: ['Randonnée au volcan de Santa Ana au lever du jour', 'Coucher de soleil à El Tunco', "Marché artisanal d'Ataco", 'Pupusas dans un comedor local', 'Baignade au lac de Coatepeque', 'Feria gastronomique de Juayúa le week-end'],
    tips: ["Le Salvador reste moins touristique que ses voisins — une bonne option pour finir le voyage sur une note plus authentique", "Compter une demi-journée de route pour la Ruta de las Flores depuis San Salvador", "El Tunco est à environ 1h de l'aéroport — pratique pour finir le séjour en douceur avant le vol retour"],
    eat: [
      { name: 'La Guitarra', type: 'bar', note: "Emblématique d'El Tunco", desc: 'Face au rocher de Tunco, concerts live le week-end, coucher de soleil.' },
      { name: 'Sasso', type: 'resto', note: 'Très bien noté', desc: 'Fusion salvadorienne créative (jocote, loroco, pupusas revisitées).' },
      { name: 'Pupuserías locales', type: 'resto', note: 'Incontournable', desc: 'Le plat national à tester dans un comedor familial, à El Tunco comme à San Salvador.' },
    ],
  },
];

export const TRANSPORT = [
  { from: 'France', to: 'Mexico City', mode: 'Avion', duration: 'Vol international', date: '8 sept', note: "Vol d'arrivée — prix croissants, à réserver en priorité", urgent: true, icon: '✈️' },
  { from: 'Mexico City', to: 'Puebla', mode: 'Bus', duration: '~1h30', date: 'mi-sept', note: 'Bus ADO, fréquent', urgent: false, icon: '🚌' },
  { from: 'Puebla', to: 'San Miguel de Allende', mode: 'Bus', duration: '~4h', date: '17 sept', note: 'Bus ADO / Primera Plus', urgent: false, icon: '🚌' },
  { from: 'San Miguel de Allende', to: 'Guanajuato', mode: 'Bus', duration: '~1h30', date: '~19 sept', note: 'Bus local fréquent', urgent: false, icon: '🚌' },
  { from: 'Guanajuato', to: 'Chihuahua', mode: 'Bus de nuit', duration: '~13h', date: '21–22 sept', note: 'Pas de liaison directe pratique — bus de nuit via Zacatecas, ou vol via León (BJX)', urgent: false, icon: '🚌' },
  { from: 'Chihuahua', to: 'El Fuerte', mode: 'Train', duration: '~2j avec arrêts', date: '22–26 sept', note: 'Chepe Express — capacité limitée, à réserver tôt', urgent: true, icon: '🚆' },
  { from: 'El Fuerte / Los Mochis', to: 'La Paz', mode: 'Ferry', duration: '~6h', date: '27 sept', note: "Baja Ferries — cabine à réserver à l'avance", urgent: true, icon: '⛴️' },
  { from: 'La Paz', to: 'Todos Santos / Cabo Pulmo', mode: 'Voiture', duration: 'Location', date: '27 sept – 9 oct', note: 'Voiture de location recommandée — bus rares vers Cabo Pulmo', urgent: false, icon: '🚗' },
  { from: 'Basse Californie', to: 'Puerto Escondido', mode: 'Avion', duration: 'Vol avec escale (via CDMX)', date: '10–11 oct', note: 'Pas de vol direct Baja–Oaxaca, prix sensibles avant DDLM', urgent: true, icon: '✈️' },
  { from: 'Puerto Escondido', to: 'Mazunte / Zipolite', mode: 'Colectivo', duration: '30–45 min', date: 'oct', note: 'Colectivos fréquents et bon marché', urgent: false, icon: '🚐' },
  { from: 'Zipolite / Puerto Escondido', to: 'Oaxaca ville', mode: 'Bus', duration: '~6–7h', date: '23 oct', note: 'Route panoramique de la Sierra Madre del Sur', urgent: false, icon: '🚌' },
  { from: 'Oaxaca', to: 'San Cristóbal de las Casas', mode: 'Bus de nuit', duration: '~10–12h', date: '4 nov', note: 'Remplace un vol intérieur par un trajet terrestre', urgent: false, icon: '🚌' },
  { from: 'San Cristóbal', to: 'Palenque', mode: 'Bus', duration: '~5h', date: '~7 nov', note: 'Excursion possible via Agua Azul en route', urgent: false, icon: '🚌' },
  { from: 'Palenque', to: 'Mérida', mode: 'Bus', duration: '~8h', date: '11–12 nov', note: 'Bus ADO ou vol via Villahermosa', urgent: false, icon: '🚌' },
  { from: 'Mérida', to: 'Valladolid', mode: 'Bus', duration: '~2h', date: 'nov', note: 'Bus/colectivo fréquent', urgent: false, icon: '🚌' },
  { from: 'Valladolid', to: 'Holbox', mode: 'Bus + ferry', duration: '~3h', date: 'nov', note: "Bus jusqu'à Chiquilá puis ferry — île petite, logement à réserver tôt", urgent: true, icon: '⛴️' },
  { from: 'Holbox', to: 'Tulum', mode: 'Bus', duration: '~3h', date: 'nov', note: 'Transfert ou bus', urgent: false, icon: '🚌' },
  { from: 'Tulum', to: 'Bacalar', mode: 'Bus', duration: '~3h', date: 'nov', note: 'Bus ADO', urgent: false, icon: '🚌' },
  { from: 'Bacalar', to: 'Belize City', mode: 'Bus', duration: '~3–4h', date: '26 nov', note: 'Bus + passage frontalier à Chetumal', urgent: false, icon: '🚌' },
  { from: 'Belize City', to: 'San Pedro', mode: 'Water taxi', duration: '~1h30', date: '26 nov', note: 'Plusieurs départs par jour', urgent: false, icon: '⛴️' },
  { from: 'Belize', to: 'Flores', mode: 'Shuttle', duration: '~5h', date: '3 déc', note: 'Shuttle touristique direct', urgent: false, icon: '🚐' },
  { from: 'Flores', to: 'Antigua', mode: 'Avion', duration: 'Vol via Guatemala City', date: '~5 déc', note: 'Recommandé plutôt que 10h+ de bus', urgent: false, icon: '✈️' },
  { from: 'Antigua', to: 'Panajachel / Atitlán', mode: 'Shuttle', duration: '~3h', date: 'déc', note: 'Shuttle touristique, très fréquent', urgent: false, icon: '🚐' },
  { from: 'Atitlán', to: 'Semuc Champey', mode: 'Shuttle', duration: '~5–6h', date: 'déc', note: 'Route sinueuse, prévoir une journée complète', urgent: false, icon: '🚐' },
  { from: 'Guatemala City', to: 'San Salvador', mode: 'Bus international', duration: '~5–6h', date: '13 déc', note: 'Tica Bus / King Quality, confortable et fréquent', urgent: false, icon: '🚌' },
  { from: 'San Salvador', to: 'France', mode: 'Avion', duration: 'Vol retour', date: '17 déc', note: 'Vol de sortie — à verrouiller tôt pour le prix', urgent: true, icon: '✈️' },
];
