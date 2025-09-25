-- EchoTrail Norwegian Trails Seed Data
-- Real Norwegian hiking trails with AI-enhanced context
-- Version: 1.0.0

-- Insert demo users with AI preferences
INSERT INTO users (id, email, password_hash, display_name, ai_preferences) VALUES
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'kent@zentric.no', 
    '$2b$10$K2HZGNm4VQP8qvTzHqZhG.YHzq5B2Q5p4c4VJGHpZGzQh8Qz2JVJK', -- ZentricAdmin2024!
    'Kent Kristensen',
    '{
        "story_types": ["historical", "nature", "adventure", "folklore"],
        "language": "no", 
        "voice_model": "nova",
        "story_length": "long",
        "interests": ["history", "geology", "photography", "norse_mythology"],
        "experience_level": "expert"
    }'
),
(
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'test@echotrail.no',
    '$2b$10$testhashedpasswordfortestuser',
    'Demo Bruker',
    '{
        "story_types": ["nature", "adventure"],
        "language": "no",
        "voice_model": "nova", 
        "story_length": "medium",
        "interests": ["nature", "wildlife", "photography"],
        "experience_level": "intermediate"
    }'
);

-- Insert real Norwegian trails with comprehensive AI context
INSERT INTO trails (
    id, name, slug, description, difficulty, distance_km, elevation_gain_m, 
    estimated_duration_hours, start_location, end_location, region, 
    story_themes, cultural_context, natural_features, ai_story_prompts, featured
) VALUES

-- Preikestolen
(
    'c2eedd99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Preikestolen',
    'preikestolen',
    'En av Norges mest kjente og spektakulære fjellformasjoner. Preikestolen er et 604 meter høyt fjellplatå som stuper bratt ned i Lysefjorden. Turen er moderat krevende og belønner vandrere med en av verdens mest fotograferte utsikter.',
    'hard',
    8.0,
    334,
    4.5,
    ST_GeogFromText('POINT(6.1878 58.9867)'), -- Preikestolen Parking
    ST_GeogFromText('POINT(6.1881 58.9864)'), -- Preikestolen Platform  
    'Rogaland',
    '["adventure", "geology", "photography", "norse_mythology", "folklore"]',
    '{
        "historical_significance": "Preikestolen har vært et hellig sted for nordmenn i århundrer. Ifølge gammel folketro var dette et møtested for gudene.",
        "geological_formation": "Dannet for over 10000 år siden da innlandsisen trakk seg tilbake",
        "norse_mythology": "Kjent som Forsete''s domstol i norrøn mytologi - stedet hvor guden Forsete dømte tvister",
        "modern_tourism": "Ble verdenskjent etter Mission Impossible filmen og Instagram",
        "local_legends": ["Trollenes møteplass", "Steinene som synger i vinden", "Den forsvunne vandreren"],
        "cultural_events": "Årlige midsommerfeiring med bål på platået"
    }',
    '{
        "flora": ["bjørkeskag", "einer", "blåbær", "tyttebær", "reinlav"],
        "fauna": ["rein", "rev", "hare", "jerv", "kongeørn", "ryper"],
        "geology": ["prekambrisk grunnfjell", "granitt", "glimmerskifer"],
        "climate": "marint klima med milde vintre og kjølige somre",
        "water_features": ["Lysefjorden", "Refsvatnet", "mindre bekker"],
        "vegetation_zones": ["subalpinskog", "lavalpine_zone", "alpine_zone"]
    }',
    '[
        "Fortell en spennende historie om hvordan Preikestolen ble dannet under istiden",
        "Del en saga om trollene som møttes her på fullmånenetter",
        "Beskriv den norrøne mytologien rundt Forsetes domstol",
        "Fortell om de første turistene som besøkte stedet på 1800-tallet",
        "Del historier fra moderne ekstremsportutøvere og basejumpere"
    ]',
    true
),

-- Trolltunga
(
    'd3ffee99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'Trolltunga',
    'trolltunga',
    'Norges mest kjente fotospot og en av de mest utfordrende dagturene. Trolltunga er et spektakulært bergformasjon som stikker 700 meter ut over Ringedalsvatnet. Turen krever god fysisk form og tar normalt 10-12 timer.',
    'expert',
    28.0,
    1200,
    12.0,
    ST_GeogFromText('POINT(6.7400 60.1240)'), -- Skjeggedal Parking
    ST_GeogFromText('POINT(6.7402 60.1242)'), -- Trolltunga Platform
    'Hordaland', 
    '["extreme_adventure", "perseverance", "trolls", "geological_wonder", "social_media_phenomenon"]',
    '{
        "troll_mythology": "Ifølge sagn var dette tungen til en troll som ble forvandlet til stein av sollys",
        "geological_age": "Formet av isbreers erosjon over flere istider",
        "climbing_history": "Oppdaget av geologer på 1800-tallet, turisme startet på 2000-tallet",
        "instagram_fame": "Ble verdensberømt gjennom sosiale medier fra 2010 og utover",
        "safety_evolution": "Fra ukjent hemmelighet til regulert turistattraksjon",
        "local_impact": "Transformerte Odda fra industriby til turismehoved"
    }',
    '{
        "flora": ["dverggråor", "vier", "rododendron", "alpine_planter", "mose", "lav"],
        "fauna": ["villrein", "fjellrev", "tiur", "ryper", "havørn", "jakt_falk"],
        "geology": ["prekambrisk_gneis", "granitt", "kvarts", "feld_spat"],
        "weather_patterns": "Ekstrem værvariation, plutselig tåke og regn vanlig",
        "water_systems": ["Ringedalsvatnet", "Tverrdalselva", "mange fossefall"],
        "elevation_zones": ["fjordnivå", "subalpint", "lavalpint", "høgalpint"]
    }',
    '[
        "Fortell sagaen om trollet som ble forvandlet til stein",
        "Beskriv den episke kampen mellom is og berg som skapte Trolltunga",
        "Del historier om de første modige fotografene som fant dette stedet",
        "Fortell om hvordan sosiale medier forandret dette hemmelighetsløse stedet",
        "Beskriv villreinens vandring gjennom dette området i tusenvis av år"
    ]',
    true
),

-- Galdhøpiggen
(
    'e4ffff99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'Galdhøpiggen',
    'galdhopiggen',
    'Norges høyeste fjell på 2469 meter over havet. En relativt tilgjengelig topptur som krever god værforhold. Fra toppen har du utsikt over store deler av Sør-Norge og kan se både til Sverige og til atlanterhavet.',
    'hard',
    14.0,
    1300,
    8.0,
    ST_GeogFromText('POINT(8.3125 61.6362)'), -- Spiterstulen
    ST_GeogFromText('POINT(8.3144 61.6367)'), -- Galdhøpiggen Summit
    'Oppland/Innlandet',
    '["conquest", "highest_peak", "alpine_environment", "skiing_history", "mountaineering"]',
    '{
        "name_origin": "Galdh = steinur/hard, øpiggen = toppen. Betyr den steinige/harde toppen",
        "first_ascent": "Første registrerte bestigning i 1850 av tre lokale menn",
        "ski_history": "Viktig i norsk skihistorie, hjemsted for sommerskikjøring",
        "weather_station": "Har vært værstasjons-lokasjon i over 100 år",
        "national_importance": "Symbol på norsk fjelltradisjon og friluftsliv",
        "royal_visits": "Besøkt av norske konger og andre prominente personer"
    }',
    '{
        "alpine_flora": ["snøsoleie", "fjellsmelle", "rypelyng", "musøre", "reinrose"],
        "fauna": ["villrein", "fjellrev", "snøspurv", "fjellerke", "ryper"],
        "geology": ["vulkansk_gneis", "glimmerskifer", "amfibolitt"],
        "glaciers": ["rester av istidsbreer", "permanent snødekke"],
        "climate": "subarktisk høgfjellsklima med korte somre",
        "unique_features": "Norges høyeste punkt, ekstreme værforhold"
    }',
    '[
        "Fortell historien om de første menneskene som beseiret Norges høyeste topp",
        "Beskriv hvordan dette fjellet ble formet av eldgamle geologiske krefter", 
        "Del historier om værstasjon-pionerene som jobbet her i ekstreme forhold",
        "Fortell om de modige ski-pionerene som innførte sommerskikjøring her",
        "Beskriv villreinenes kamp for overlevelse i dette høyalpine miljøet"
    ]',
    true
),

-- Besseggen
(
    'f5aaaa99-9c0b-4ef8-bb6d-6bb9bd380a66', 
    'Besseggen',
    'besseggen',
    'En av Norges mest populære fjellturer. Besseggen-kanten er en smal og spektakulær fjellrygg mellom de blågrønne Gjende og det mørkblå Bessvatnet. Turen er teknisk enkel, men luftig og krever respekt for været.',
    'moderate',
    17.0,
    1000,
    8.0,
    ST_GeogFromText('POINT(8.6833 61.4983)'), -- Gjendesheim
    ST_GeogFromText('POINT(8.7500 61.4950)'), -- Memurubu
    'Oppland/Innlandet',
    '["iconic_ridge", "peer_gynt", "two_lakes", "norwegian_classic", "henrik_ibsen"]',
    '{
        "literary_fame": "Gjort verdenskjent av Henrik Ibsens Peer Gynt - her red Peer Gynt på reinsbukk over kanten",
        "geological_formation": "En smal fjellrygg dannet ved glasial erosjon mellom to daler",
        "tourism_history": "En av de første organiserte fjellturer i Norge, startet på slutten av 1800-tallet",
        "cultural_significance": "Regnes som en klassisk norsk fjelloplevelse - en slags inngangsport til høyfjellet",
        "peer_gynt_connection": "Inspirerte Ibsens berømte scene hvor Peer Gynt red reinsbukk over kanten",
        "dnts_history": "Viktig i utviklingen av Den Norske Turistforening"
    }',
    '{
        "lakes": ["Gjende (blågrønn)", "Bessvatnet (mørkblå)", "ulike mineralinnhold gir fargeforskjell"],
        "flora": ["fjellbirkeskag", "vier", "einer", "alpine_blomster", "bærbusker"],
        "fauna": ["villrein", "jerv", "gaupe", "kongeørn", "ryper", "småfugl"],
        "geology": ["kambrisk_skifer", "sandstein", "konglomerat"],
        "climate": "typisk indre fjellklima med store døgnvariasjoner",
        "unique_features": "den smale kanten, to forskjelligfargede innsjøer"
    }',
    '[
        "Gjenfortell Peer Gynts ville ritt på reinsbukk over Besseggen-kanten",
        "Forklar hvorfor de to innsjøene har så forskjellige farger",
        "Fortell om de første turistene som oppdaget denne spektakulære ruten",
        "Beskriv hvordan Henrik Ibsen ble inspirert av dette dramatiske landskapet",
        "Del historier om værguder og fjelltroll som hersket over disse toppene"
    ]',
    true
);

-- Insert detailed trail points with AI story triggers
INSERT INTO trail_points (
    trail_id, name, description, location, point_type, distance_from_start_km,
    story_context, ai_story_prompt, story_themes, trigger_radius_meters
) VALUES

-- Preikestolen trail points
(
    'c2eedd99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Preikestolen Base Camp',
    'Startpunkt for turen til Preikestolen. Her forbereder vandrere seg mentalt og fysisk.',
    ST_GeogFromText('POINT(6.1878 58.9867)'),
    'landmark',
    0.0,
    '{
        "historical_context": "Dette området ble brukt som samlingssted av lokale bønder før de dro til seter",
        "preparation_advice": "Siste sjanse for å snu hvis været blir dårlig",
        "local_stories": "Gamle historier om trolljakt i disse skogene"
    }',
    'Fortell en historie om de første vandrerne som våget seg mot det ukjente Preikestolen for 150 år siden',
    '["preparation", "adventure_begins", "local_folklore"]',
    75
),
(
    'c2eedd99-9c0b-4ef8-bb6d-6bb9bd380a33', 
    'Trollenes Sti',
    'Stien stiger bratt gjennom tett bjørkeskog. Lokale sagn sier trollene brukte denne stien på nattestid.',
    ST_GeogFromText('POINT(6.1860 58.9875)'),
    'story_trigger',
    1.5,
    '{
        "folklore": "Trollene samlet seg her før de gikk til Preikestolen for å holde råd",
        "natural_features": "Tett bjørkeskog, store steiner som kan ligne troll",
        "atmosphere": "Mystisk og mørk selv på dagen"
    }',
    'Del en saga om trollrådet som møttes her hver fullmånenatt for å planlegge sine utsyk over menneskene',
    '["trolls", "mystery", "folklore", "ancient_meetings"]',
    100
),
(
    'c2eedd99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Utsiktspunkt Lysefjorden', 
    'Første glimt av den spektakulære fjorden. Her åpenbarer seg panoramaet som gjør turen verdt det.',
    ST_GeogFromText('POINT(6.1870 58.9860)'),
    'viewpoint',
    3.2,
    '{
        "geological_formation": "Lysefjorden ble skåret ut av isbreer over millioner av år",
        "depth_facts": "Fjorden er over 400 meter dyp",
        "historical_significance": "Viktig transportvei for vikinger og handelsfolk"
    }',
    'Beskriv den mektige kraften som skar denne dype fjorden ut av fjellet, og hvordan vikingene seilte disse farvannene',
    '["geological_wonder", "vikings", "natural_forces", "fjord_formation"]',
    150
);

-- Trolltunga trail points  
INSERT INTO trail_points (
    trail_id, name, description, location, point_type, distance_from_start_km,
    story_context, ai_story_prompt, story_themes, trigger_radius_meters
) VALUES
(
    'd3ffee99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'Trolltunga Base - Skjeggedal',
    'Startpunktet for den episke turen til Trolltunga. Her begynner en av Norges mest utfordrende dagsturer.',
    ST_GeogFromText('POINT(6.7400 60.1240)'),
    'landmark', 
    0.0,
    '{
        "preparation_importance": "Kritisk at vandrere er forberedt på 12+ timer i fjellet",
        "weather_dependency": "Været kan endre seg raskt og dramatisk",
        "historical_use": "Tidligere industriplass, nå turistsentrum"
    }',
    'Fortell historien om hvordan dette industristedet ble forvandlet til utgangspunktet for en av verdens mest kjente fjellturer',
    '["transformation", "preparation", "industrial_heritage"]',
    100
),
(
    'd3ffee99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'Mågelitopp Platå',
    'Første store rastepunkt. Her får vandrere sitt første glimt av Ringedalsvatnet langt nedenfor.',
    ST_GeogFromText('POINT(6.7380 60.1250)'),
    'rest_area',
    8.0,
    '{
        "elevation_gain": "Allerede 400 høydemeter tatt",
        "view_description": "Første spektakulære utsikt over Ringedalsvatnet",
        "wildlife": "Ofte villrein og fjellrev i området"
    }',
    'Beskriv følelsen av å ha kommet halvveis, og fortell om villreinen som har vandret disse stiene i tusenvis av år',
    '["perseverance", "wildlife", "halfway_victory"]',
    200
);

-- Insert AI-generated sample stories
INSERT INTO ai_stories (
    trail_id, trail_point_id, title, content, content_type, language, 
    ai_model, generation_prompt, generation_context, play_count
) VALUES
(
    'c2eedd99-9c0b-4ef8-bb6d-6bb9bd380a33',
    (SELECT id FROM trail_points WHERE name = 'Trollenes Sti' LIMIT 1),
    'Trollrådet på Preikestolen',
    'For tusen år siden, når månen var full og fjordene lå i dypeste stillhet, samlet trollene seg på denne stien. De kom fra alle kanter av Rogaland - store, gamle vesener med skjegg som mose og øyne som glødende kull. 

Lederen deres, den mektige Steintroll Grondal, banket sin store hammer i bakken tre ganger. Dette var tegnet for at Trollrådet skulle begynne. "Mine brødre," buldret hans dype stemme gjennom skogen, "i natt skal vi bestemme skjebnen til de små menneskene som våger seg inn på vårt område."

På Preikestolen ventet Forsete, gudenes dommer, på deres råd. For selv guder trengte trollenes visdom når det gjaldt fjellets hemmeligheter. Men trollene var kloke - de visste at mennesker en dag ville komme til å elske dette stedet like mye som de selv gjorde. Så de bestemte at Preikestolen skulle være et sted for alle - både troll, gud og menneske.',
    'folklore',
    'no',
    'neon-gpt-4o-mini',
    'Fortell en saga om trollrådet som møttes her hver fullmånenatt for å planlegge sine utsyn over menneskene',
    '{
        "weather": "clear_night",
        "moon_phase": "full_moon", 
        "time_of_day": "midnight",
        "season": "summer"
    }',
    45
);

-- Insert app settings for AI configuration
INSERT INTO app_settings (key, value, description) VALUES
('ai_story_generation_enabled', 'true', 'Enable real-time AI story generation'),
('default_story_length', '{"short": 150, "medium": 300, "long": 500}', 'Default story lengths in words'),
('supported_languages', '["no", "en"]', 'Languages supported for story generation'),
('tts_cache_duration_days', '30', 'How long to cache TTS audio files'),
('ai_model_preferences', '{
    "primary": "neon-gpt-4o-mini", 
    "fallback": "claude-3.5-haiku",
    "tts_model": "openai-nova"
}', 'AI model configuration for story generation'),
('story_generation_prompts', '{
    "base_prompt": "Du er en ekspert på norsk fjellculture, historie og folklore. Lag engasjerende historier basert på brukerens lokasjon og preferanser.",
    "safety_reminder": "Inkluder alltid sikkerhetstips når det er relevant.",
    "cultural_sensitivity": "Vær respektfull overfor samisk kultur og tradisjonier."
}', 'Base prompts for AI story generation');

-- Sample user interactions for ML training
INSERT INTO user_story_interactions (user_id, story_id, interaction_type, rating) VALUES
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    (SELECT id FROM ai_stories WHERE title = 'Trollrådet på Preikestolen' LIMIT 1),
    'played',
    5
),
(
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    (SELECT id FROM ai_stories WHERE title = 'Trollrådet på Preikestolen' LIMIT 1),
    'liked',
    4
);