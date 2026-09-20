import { PromptModifier } from "../types";

export const DEFAULT_MODIFIER_CATEGORIES: string[] = [
  "Lighting Styles",
  "Camera Specs",
  "Skin & Face Textures",
  "Atmosphere & Mood",
  "Composition & Lens",
  "Artistic Mediums"
];

export const DEFAULT_PROMPT_MODIFIERS: PromptModifier[] = [
  // 1. Lighting Styles
  {
    id: "light-golden-rim",
    title: "Golden Hour & Rim Lighting",
    category: "Lighting Styles",
    description: "Iluminación de contorno dorada cálida con destellos envolventes y brillo volumétrico.",
    content: "golden rim lighting, warm sunset backlight, soft atmospheric radiance, volumetric sun rays, delicate specular highlights"
  },
  {
    id: "light-chiaroscuro",
    title: "Claroscuro Dramático (Chiaroscuro)",
    category: "Lighting Styles",
    description: "Contraste extremo entre sombras densas e iluminación puntual inspirada en Caravaggio.",
    content: "dramatic chiaroscuro lighting, deep tenebrism shadows, high contrast specular highlights, moody directional spotlight"
  },
  {
    id: "light-cyber-neon",
    title: "Cyberpunk Dual Neon",
    category: "Lighting Styles",
    description: "Luz de neón cian y magenta intensa con reflejos sobre superficies húmedas.",
    content: "vibrant dual neon lighting, cyan and magenta rim light, reflective wet pavement reflections, chromatic aberration accents"
  },
  {
    id: "light-studio-softbox",
    title: "Softbox de Estudio Comercial",
    category: "Lighting Styles",
    description: "Luz difusa suave sin sombras duras, perfecta para retratos de belleza y moda.",
    content: "large octabox softbox lighting, clean diffuse commercial illumination, gentle fill light, zero harsh shadows, beauty editorial look"
  },
  {
    id: "light-moody-fog",
    title: "Neblina Volumétrica y Tyndall",
    category: "Lighting Styles",
    description: "Rayos de luz filtrados entre niebla con efecto Tyndall cinematográfico.",
    content: "dense volumetric atmospheric fog, God rays (crepuscular rays), soft diffused ethereal glow, deep mood"
  },

  // 2. Camera Specs
  {
    id: "cam-hasselblad-100",
    title: "Hasselblad H6D-100c (100mm)",
    category: "Camera Specs",
    description: "Formato medio profesional con óptica Hasselblad HC 100mm f/2.2 ultra nítida.",
    content: "shot on medium format Hasselblad H6D-100c with 100mm lens, ultra-sharp commercial focus, f/2.8, shallow depth of field, high-fidelity color calibration"
  },
  {
    id: "cam-leica-35mm",
    title: "Leica M11 (35mm Summilux)",
    category: "Camera Specs",
    description: "Textura analógica y grano sutil de fotografía documental de alta gama.",
    content: "shot on Leica M11 with 35mm Summilux f/1.4 lens, natural organic film grain, authentic street photography aesthetic, documentary realism"
  },
  {
    id: "cam-macro-105",
    title: "Macro 105mm F/2.8 Extreme",
    category: "Camera Specs",
    description: "Enfoque macro extremo con profundidad de campo milimétrica y detalle microscópico.",
    content: "shot on 105mm macro f/2.8 lens, extreme close-up magnification, razor-sharp edge definition, micro-focus on fine textures"
  },
  {
    id: "cam-anamorphic-cinematic",
    title: "Panavision Anamorphic 2.39:1",
    category: "Camera Specs",
    description: "Lentes anamórficos de cine con destellos horizontales azules y bokeh ovalado.",
    content: "shot on Panavision anamorphic lenses, horizontal streak flare, wide 2.39:1 cinematic aspect ratio, oval bokeh, 35mm motion picture look"
  },
  {
    id: "cam-sony-85mm-portrait",
    title: "Sony A1 (85mm G-Master f/1.2)",
    category: "Camera Specs",
    description: "Retrato nítido con desenfoque de fondo cremoso bokeh de ensueño.",
    content: "shot on Sony A1 with 85mm f/1.2 GM lens, creamy buttery bokeh, sharp eye focus, professional fashion portraiture"
  },

  // 3. Skin & Face Textures
  {
    id: "face-exact-features-proportions",
    title: "Facciones y Proporciones Idénticas (Cero Variación)",
    category: "Skin & Face Textures",
    description: "Fijación estricta de estructura facial, proporciones simétricas, forma exacta de nariz, mandíbula y labios sin variaciones.",
    content: "exact facial features and bone structure, precise facial proportions, identical nose bridge and tip contours, exact lip fullness and philtrum, sharp defined jawline, strict facial likeness preservation, zero facial drift, symmetrical facial harmony, anatomical fidelity"
  },
  {
    id: "face-exact-eyes-expression",
    title: "Color de Ojos y Expresión Exacta",
    category: "Skin & Face Textures",
    description: "Tono exacto de iris con matices precisos, dirección de mirada y microexpresión emocional idéntica.",
    content: "exact iris color hue and intricate radial patterns, precise eye gaze vector, authentic micro-expression, subtle emotional intensity, natural caught-light reflections, razor-sharp corneal highlights"
  },
  {
    id: "face-exact-hair-hairstyle",
    title: "Color de Cabello y Peinado Idéntico",
    category: "Skin & Face Textures",
    description: "Tonalidad cromática exacta de cabello con reflejos y peinado/corte con partición y volumen idénticos.",
    content: "exact hair color shades and undertones, precise hairstyle cut and volume, identical hair parting and styling, individual flyaway strands, glowing hair edge translucency"
  },
  {
    id: "skin-microtexture-pores",
    title: "Microtextura Dérmica y Poros Reales",
    category: "Skin & Face Textures",
    description: "Detalles fotorrealistas de la piel humana sin filtro plástico, poros y vello fino.",
    content: "ultra-detailed human face, extreme detail on skin microtexture, highly defined realistic skin pores, fine natural peach fuzz, delicate subsurface scattering"
  },
  {
    id: "skin-hair-flyaways",
    title: "Cabello Hebra por Hebra y Flyaways",
    category: "Skin & Face Textures",
    description: "Hebras de cabello individuales, mechones sueltos e iluminación translúcida.",
    content: "microtexturas de hebras individuales de cabello, natural flyaways, individual hair strands, subsurface scattering on hair for translucency and shine"
  },
  {
    id: "skin-eyes-iris-glint",
    title: "Ojos Expresivos y Reflejos de Iris",
    category: "Skin & Face Textures",
    description: "Iris con textura hiperdetallada, destello de luz corneal y pestañas nítidas.",
    content: "expressive piercing eyes, highly detailed iris texture, glossy corneal caught-light reflection, realistic eyelashes micro-detail, clear tear duct moisture"
  },
  {
    id: "skin-hands-neck-detail",
    title: "Detalles Fotorrealistas Manos y Cuello",
    category: "Skin & Face Textures",
    description: "Pliegues cutáneos anatómicos, venas sutiles y textura visible en manos y cuello.",
    content: "photorealistic skin textures on hands and neck, visible pores, subtle skin creases, natural anatomical fidelity, soft epidermal sheen"
  },

  // 4. Atmosphere & Mood
  {
    id: "mood-cinematic-noir",
    title: "Atmósfera Cinematográfica Neo-Noir",
    category: "Atmosphere & Mood",
    description: "Tono sombrío, misterioso, con humo y estética de thriller nocturno.",
    content: "cinematic neo-noir atmosphere, moody shadows, cigarette smoke plumes, heavy air, melancholic dramatic tension"
  },
  {
    id: "mood-ethereal-dreamlike",
    title: "Etéreo y Onírico (Dreamlike)",
    category: "Atmosphere & Mood",
    description: "Ambiente de ensueño con partículas brillantes suspendidas y suave niebla.",
    content: "ethereal dreamlike atmosphere, floating dust motes catching light, misty pastel aura, poetic surreal mood"
  },
  {
    id: "mood-postapocalyptic-gritty",
    title: "Distópico y Arenoso (Gritty Dust)",
    category: "Atmosphere & Mood",
    description: "Sensación árida, textura de polvo en suspensión y tonos desaturados.",
    content: "gritty post-apocalyptic atmosphere, suspended sand and ash particles, desaturated muted tones, harsh weathering"
  },

  // 5. Composition & Lens
  {
    id: "comp-extreme-closeup",
    title: "Primer Plano Intenso (Close-up)",
    category: "Composition & Lens",
    description: "Encuadre cerrado y emotivo que concentra la atención en la mirada y el rostro.",
    content: "intimate extreme close-up portrait framing, tight crop, emotive direct gaze, softly blurred background isolation"
  },
  {
    id: "comp-wide-environmental",
    title: "Plano General Narrativo (Wide Scale)",
    category: "Composition & Lens",
    description: "Perspectiva amplia con contexto ambiental y escala épica.",
    content: "epic wide-angle composition, environmental storytelling, dramatic leading lines, low perspective emphasizing grand scale"
  },
  {
    id: "comp-dutch-angle",
    title: "Ángulo Holandés Dinámico",
    category: "Composition & Lens",
    description: "Cámara ligeramente inclinada para transmitir tensión y energía visual.",
    content: "dramatic Dutch angle camera tilt, kinetic dynamic framing, tension-filled visual diagonal, modern cinematic look"
  },

  // 6. Artistic Mediums
  {
    id: "art-oil-impasto",
    title: "Pintura al Óleo con Espátula (Impasto)",
    category: "Artistic Mediums",
    description: "Trazos gruesos de óleo con relieve visible sobre lienzo de lino.",
    content: "heavy oil impasto painting, rich textured palette knife strokes, visible linen canvas grain, tactile paint buildup, expressive color mixing"
  },
  {
    id: "art-watercolor-bleed",
    title: "Acuarela Húmeda Difusa",
    category: "Artistic Mediums",
    description: "Lavados translúcidos con sangrado orgánico sobre papel de algodón.",
    content: "delicate translucent watercolor, wet-on-wet pigments, organic paint bleeding, cold-press cotton paper texture, deckled edges"
  },
  {
    id: "art-unreal-octane",
    title: "Render 3D Unreal Engine 5 & Octane",
    category: "Artistic Mediums",
    description: "Fotorrealismo generado por computadora con trazado de rayos (ray-tracing).",
    content: "Unreal Engine 5 architectural render, Octane photorealistic ray-tracing, physically based rendering (PBR), nanite geometry, subsurface scattering materials"
  }
];
