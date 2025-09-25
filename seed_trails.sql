-- EchoTrail Norwegian Trail Data with AI Context
-- Seeding database with real Norwegian hiking trails

-- Demo users with AI preferences
INSERT INTO users (email, password_hash, display_name, role, ai_preferences, stats) VALUES
('demo@echotrail.no', '$2b$12$LQv3c1yX8LjjW0mqPRYaA.SRJoQZH.R3oN/1IgRo4ZO6YqKz1jCyq', 'Demo Bruker', 'user', 
 '{"story_types": ["legend", "historical_fact", "adventure"], "language": "no", "voice_model": "nova", "story_length": "medium", "interests": ["historie", "natur", "fotografi"], "experience_level": "intermediate"}',
 '{"trails_completed": 3, "total_distance_km": 42.5, "stories_listened": 23, "memories_created": 8}'),
 
('guide@echotrail.no', '$2b$12$LQv3c1yX8LjjW0mqPRYaA.SRJoQZH.R3oN/1IgRo4ZO6YqKz1jCyq', 'Turleder Kari', 'guide', 
 '{"story_types": ["safety_tip", "natural_info", "historical_fact"], "language": "no", "voice_model": "nova", "story_length": "detailed", "interests": ["sikkerhet", "geologi", "botanikk"], "experience_level": "expert"}',
 '{"trails_completed": 127, "total_distance_km": 2340.8, "stories_listened": 456, "memories_created": 89}'),
 
('tourist@echotrail.no', '$2b$12$LQv3c1yX8LjjW0mqPRYaA.SRJoQZH.R3oN/1IgRo4ZO6YqKz1jCyq', 'Tourist Emma', 'user', 
 '{"story_types": ["legend", "adventure", "folklore"], "language": "en", "voice_model": "alloy", "story_length": "short", "interests": ["culture", "photography", "adventure"], "experience_level": "beginner"}',
 '{"trails_completed": 1, "total_distance_km": 8.2, "stories_listened": 7, "memories_created": 12}');

-- Preikestolen (Pulpit Rock) - The most famous Norwegian hike
INSERT INTO trails (name, slug, description, difficulty, distance_km, elevation_gain_m, estimated_duration_hours, 
                   start_location, region, story_themes, cultural_context, natural_features, ai_story_prompts, 
                   images, safety_info, facilities, featured, ai_generated_content_enabled) VALUES
('Preikestolen', 'preikestolen', 
 'Preikestolen, også kjent som Pulpit Rock, er Norges mest berømte fjellformasjon. Den 604 meter høye klippen henger dramatisk over Lysefjorden og tilbyr et av verdens mest spektakulære utsiktspunkter.',
 'moderate', 8.00, 350,  4.0,
 ST_GeogFromText('POINT(6.188 58.982)'), -- Preikestolen Parkering
 'Rogaland',
 '["dramtisk natur", "fjorder", "klipper", "utsikt", "pilegrimer", "turisme"]',
 '{"historical_significance": "Preikestolen har vært et pilegrimed siden 1800-tallet", "geological_formation": "Granitt dannet for 10,000 år siden av istidsbreer", "cultural_impact": "Ikonisk symbol for Norge, brukt i utallige filmer og reklamer", "mythology": "Sagn forteller at trollet som skapte klippen fortsatt bor i fjellet"}',
 '{"rock_type": "granitt", "formation_age": "10000 år", "height": "604m over Lysefjorden", "wildlife": ["rein", "ørn", "jerv"], "vegetation": ["bjørk", "furu", "lyngheier", "alpine planter"], "geology": "Prekambrisk grunnfjell"}',
 '["Fortell om Preikestolens dramatiske dannelse under istiden", "Beskriv følelsen av å stå på kanten av Europa mest kjente klippe", "Forklar hvordan Lysefjorden ble formet av breer", "Fortell sagnet om trollet som skapte Preikestolen"]',
 '["https://images.unsplash.com/photo-1469474968028-56623f02e42e", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4"]',
 '{"wind_warning": "Sterke vindkast kan være farlige ved kanten", "weather_changes": "Vær kan skifte raskt", "cliff_safety": "Hold avstand fra kanten, spesielt med barn", "winter_conditions": "Ikke anbefalt i vintermåneder"}',
 '{"parking": "Preikestolen fjellstue", "restrooms": "Ved startpunktet", "accommodation": "Preikestolen fjellstue", "food": "Kafé ved fjellstua"}',
 true, true),

-- Trolltunga - The most Instagram-famous Norwegian hike  
('Trolltunga', 'trolltunga',
 'Trolltunga er en spektakulær klippeformasjon som strekker seg horisontalt ut fra fjellet, 700 meter over Ringedalsvatnet. Denne krevende 28 km lange turen er blitt et globalt ikon for extrem turisme.',
 'expert', 28.00, 1200, 12.0,
 ST_GeogFromText('POINT(6.740 60.124)'), -- Skjeggedal
 'Hordaland', 
 '["ekstrem tur", "instagram", "trollmagi", "industrihistorie", "kraft", "utholdenhet"]',
 '{"mythology": "Trolltunga ble skapt når en sint troll bet av et stykke av fjellet", "industrial_history": "Området var sentrum for kraftutbygging tidlig på 1900-tallet", "modern_fame": "Ble verdenskjent gjennom sosiale medier etter 2010", "challenge_culture": "Symbol på den nye ekstreme turismen"}',
 '{"rock_formation": "Kvartsittskifer fra prekambrium", "elevation": "1180m over havet", "water_features": ["Ringedalsvatnet", "mange fosser"], "wildlife": ["rein", "ryper", "fjellrev"], "vegetation": ["fjellfuru", "einer", "alpine planter"], "climate": "Atlantisk fjellklima"}',
 '["Fortell myten om trollet som skapte Trolltunga", "Beskriv den episke 12-timers marsjen til dette naturmirakel", "Forklar hvorfor Trolltunga ble så berømt på Instagram", "Fortell om den kraftige industrihistorien i området"]',
 '["https://images.unsplash.com/photo-1578662996442-48f60103fc96", "https://images.unsplash.com/photo-1500534623283-312aade485b7"]',
 '{"difficulty": "Meget krevende 12+ timers tur", "weather": "Været kan være uforutsigbart", "equipment": "Profesjonelt turutstyr påkrevd", "season": "Kun juni til september", "fitness": "Krever svært god fysisk form"}',
 '{"parking": "Skjeggedal P2/P3", "shuttle": "Buss fra Tyssedal", "accommodation": "Tyssedal Hotel", "guides": "Profesjonelle guider anbefales"}',
 true, true),

-- Galdhøpiggen - Norway's highest peak
('Galdhøpiggen', 'galdhopiggen',
 'Galdhøpiggen er Norges høyeste fjell på 2469 meter. Turen fra Spiterstulen tilbyr en opplevelse av arktisk natur og fantastisk utsikt over Jotunheimen nasjonalpark.',
 'hard', 14.00, 800, 8.0,
 ST_GeogFromText('POINT(8.312 61.636)'), -- Spiterstulen
 'Oppland',
 '["høyeste punkt", "arktisk natur", "nasjonalpark", "bre", "samisk kultur", "fjellklatring"]',
 '{"highest_point": "Norges høyeste punkt siden måling i 1850", "sami_culture": "Tradisjonelt samisk område med reindrift", "mountaineering": "Sentralt i norsk fjellklatringshistorie", "scientific": "Viktig for klimaforskning og glaciologi"}',
 '{"elevation": "2469m over havet", "glaciers": ["Styggebreen"], "geology": "Gabbro og granitt", "arctic_flora": ["snøsoleie", "fjellsmelle", "reinrose"], "wildlife": ["villrein", "fjellrev", "snøspurv"], "weather": "Arktisk alpine forhold"}',
 '["Fortell om følelsen av å stå på Norges tak", "Beskriv den arktiske naturen på høyeste punkt", "Forklar samenes tilknytning til dette området", "Fortell om de dramatiske værforholdene på toppen"]',
 '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4"]',
 '{"altitude": "Høydesyke kan forekomme", "weather": "Ekstreme værforhold", "glacier": "Brekunnskap nødvendig", "season": "Juli-september anbefalt"}',
 '{"mountain_lodge": "Spiterstulen", "guides": "Breføring tilgjengelig", "equipment": "Spesialisert fjellutstyr"}',
 true, true),

-- Besseggen - The classic Norwegian ridge hike
('Besseggen', 'besseggen',
 'Besseggen er Norges mest populære fjelltur. Den dramatiske eggvandringen mellom det smaragdgrønne Bessvatnet og det dypblå Gjende tilbyr noen av de vakreste utsiktene i Jotunheimen.',
 'moderate', 14.00, 900, 7.0,
 ST_GeogFromText('POINT(8.674 61.496)'), -- Gjendesheim
 'Oppland',
 '["klassisk fjelltur", "eggen", "peer gynt", "to innsjøer", "tradisjon", "litteratur"]',
 '{"literary_fame": "Gjort berømt av Ibsens Peer Gynt", "hiking_tradition": "Den mest populære fjellturen i Norge siden 1900-tallet", "geology": "Spektakulær kontrast mellom to innsjøer på hver side", "cultural_icon": "Symbol på norsk friluftsliv"}',
 '{"ridge_formation": "Smal egg mellom to innsjøer", "water_colors": "Bessvatnet grønt, Gjende blått pga mineraler", "elevation_change": "900m stigning og nedstigning", "wildlife": ["rein", "jerv", "kongeørn"], "vegetation": ["bjørk", "vier", "alpine blomster"]}',
 '["Fortell hvorfor Besseggen er Norges mest elskede fjelltur", "Beskriv mysteriet bak de forskjellige fargene på innsjøene", "Fortell om Peer Gynts hopp over eggen", "Forklar hvorfor denne eggen er så spesiell geologisk"]',
 '["https://images.unsplash.com/photo-1469474968028-56623f02e42e"]',
 '{"balance": "Krev godt balansesans på eggen", "exposure": "Eksponert for vind og vær", "crowds": "Meget populær - start tidlig", "season": "Juni til september"}',
 '{"boat": "Båt over Gjende", "lodge": "Gjendesheim og Memurubu", "transport": "Populær rundtur med båt"}',
 true, true);

-- Trail points for Preikestolen with detailed AI context
INSERT INTO trail_points (trail_id, name, description, location, point_type, distance_from_start_km, 
                         story_context, ai_story_prompt, story_themes, trigger_radius_meters) VALUES
-- Preikestolen trail points
((SELECT id FROM trails WHERE slug = 'preikestolen'), 
 'Preikestolen Basecamp', 'Startpunkt med parkeringsplass og fasiliteter', 
 ST_GeogFromText('POINT(6.188 58.982)'), 'rest_area', 0.0,
 '{"historical_context": "Turismens startpunkt siden 1900-tallet", "facilities": ["parking", "restrooms", "information"], "visitor_stats": "Over 300,000 besøkende årlig"}',
 'Fortell om hvordan Preikestolen gikk fra å være et lokalt ukjent sted til å bli en global turistattraksjon',
 '["turisme", "historie", "tilgjengelighet"]', 100),

((SELECT id FROM trails WHERE slug = 'preikestolen'),
 'Trollskogen', 'Magisk skog med vindskjeve træer og mystisk atmosfære',
 ST_GeogFromText('POINT(6.185 58.978)'), 'landmark', 1.2,
 '{"natural_features": "Vindformede bjørketrær", "mythology": "Lokale sagn om skogstroll", "atmosphere": "mystisk og eventyrlig"}',
 'Beskriv den magiske stemningen i trollskogen hvor vinden har formet træerne til fantastiske figurer',
 '["folklore", "natur", "mystikk"]', 80),

((SELECT id FROM trails WHERE slug = 'preikestolen'),
 'Første utsiktspunkt', 'Første glimt av Lysefjorden og dramatisk natur',
 ST_GeogFromText('POINT(6.187 58.975)'), 'viewpoint', 2.8,
 '{"view_description": "Første panoramautsikt over Lysefjorden", "geological_info": "Granittformasjon synlig", "photo_opportunity": "Populært fotopunkt"}',
 'Forklar hvordan dette første utsiktspunktet gir en forsmak på det spektakulære som venter ved Preikestolen',
 '["utsikt", "fjorder", "forventning"]', 60),

((SELECT id FROM trails WHERE slug = 'preikestolen'),
 'Preikestolen topp', 'Den berømte 604m høye klippen over Lysefjorden',
 ST_GeogFromText('POINT(6.190 58.987)'), 'viewpoint', 4.0,
 '{"elevation": "604m over Lysefjorden", "formation": "Flat granittplatform", "danger": "25m bred klippe", "fame": "Verdens mest fotograferte klippe", "geological_age": "Formet av isbre for 10000 år siden"}',
 'Beskriv den overveldende følelsen av å stå på kanten av Europa mest ikoniske klippe, med 604 meter ned til Lysefjorden',
 '["ekstrem utsikt", "adrendin", "erobring", "ikonisk"]', 150);

-- More trail points for other trails
INSERT INTO trail_points (trail_id, name, description, location, point_type, distance_from_start_km, 
                         story_context, ai_story_prompt, story_themes, trigger_radius_meters) VALUES
-- Trolltunga trail points  
((SELECT id FROM trails WHERE slug = 'trolltunga'),
 'Mågelitopp', 'Første store utfordring med bratt stigning',
 ST_GeogFromText('POINT(6.745 60.130)'), 'landmark', 4.5,
 '{"challenge": "Første store stigning", "elevation_gain": "400m", "milestone": "25% av turen fullført"}',
 'Fortell om den første store testen på veien til Trolltunga - stigningen til Mågelitopp',
 '["utfordring", "utholdenhet", "milepæl"]', 100),

((SELECT id FROM trails WHERE slug = 'trolltunga'),
 'Trolltunga', 'Den berømte horisontale klippeformasjonen',
 ST_GeogFromText('POINT(6.743 60.124)'), 'viewpoint', 14.0,
 '{"formation": "Horisontal klippeutspring", "elevation": "1180m", "instagram_fame": "Mest instagrammede sted i Norge", "mythology": "Skapt av sint troll"}',
 'Beskriv følelsen av å endelig nå den berømte Trolltunga etter 12+ timers vandring',
 '["seier", "ekstrem tur", "belønning", "ikon"]', 200);

-- Sample AI stories with embeddings placeholders (would be generated by actual AI)
INSERT INTO ai_stories (trail_point_id, title, content, content_type, language, ai_model, 
                       generation_prompt, generation_context, user_rating, play_count) VALUES
((SELECT id FROM trail_points WHERE name = 'Preikestolen topp'),
 'Legenden om Preikestolen', 
 'For lenge, lenge siden levde det et enormt troll høyt oppe i fjellene over Lysefjorden. Dette trollet var kjent for sin styrke og sitt sinte temperament. En dag ble trollet så rasende at det bet av et enormt stykke av fjellet. Når det spyttet ut steinbiten, dannet den den flate plattformen vi i dag kjenner som Preikestolen. Lokalbefolkningen sier at når vinden hviner gjennom fjellene, kan du fortsatt høre trollets åndedrett, og at sjelen til det gamle trollet fortsatt vokter over denne magiske klippen.',
 'legend', 'no', 'gpt-4o',
 'Skap en fengslende norsk legende om hvordan Preikestolen ble dannet, basert på lokale sagn og tradisjonell norsk folklore.',
 '{"location": "Preikestolen", "theme": "mythology", "audience": "families", "tone": "mystical"}',
 4.8, 1247),

((SELECT id FROM trail_points WHERE name = 'Trollskogen'),
 'De magiske træerne i Trollskogen',
 'Du går nå gjennom det som kalles Trollskogen - et område hvor naturen selv har skapt kunst. Vinden som blåser inn fra Lysefjorden har gjennom hundrevis av år formet disse bjørketrærne til fantastiske skulpturer. Hvert tre forteller sin egen historie om storm og stillhet, kamp og overgivelse. De lokale har gjennom generasjoner fortalt at skogstroll bor mellom disse vindskjeve træerne, og at de vokter over vandrere som viser naturen respekt.',
 'natural_info', 'no', 'gpt-4o',
 'Beskriv de unike naturformene i Trollskogen på vei til Preikestolen, kombinert med lokal folklore.',
 '{"location": "Trollskogen", "theme": "nature_folklore", "scientific_element": "wind_erosion"}',
 4.6, 892);

-- Sample memories from users
INSERT INTO memories (user_id, trail_id, title, description, location, location_name, 
                     media_urls, weather_conditions, hiking_companions, tags, visibility) VALUES
((SELECT id FROM users WHERE email = 'demo@echotrail.no'),
 (SELECT id FROM trails WHERE slug = 'preikestolen'),
 'Min første gang på Preikestolen',
 'Utrolig opplevelse! Været var perfekt og utsikten var helt magisk. Følte meg som på toppen av verden.',
 ST_GeogFromText('POINT(6.190 58.987)'),
 'Preikestolen topp',
 '["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]',
 '{"temperature": 18, "condition": "sunny", "wind": "light"}',
 '["Ola", "Kari"]',
 '["første gang", "perfekt vær", "uforglemmelig"]',
 'public'),

((SELECT id FROM users WHERE email = 'tourist@echotrail.no'),
 (SELECT id FROM trails WHERE slug = 'preikestolen'),
 'Norwegian Adventure of a Lifetime',
 'As a tourist, this hike exceeded all expectations. The stories along the way made the experience so much richer!',
 ST_GeogFromText('POINT(6.190 58.987)'),
 'Pulpit Rock summit',
 '["https://example.com/tourist_photo.jpg"]',
 '{"temperature": 15, "condition": "partly_cloudy", "wind": "moderate"}',
 '["Solo adventure"]',
 '["bucket list", "norway", "amazing views"]',
 'public');

-- Sample trail session
INSERT INTO trail_sessions (user_id, trail_id, started_at, completed_at, status, 
                           actual_distance_km, actual_duration_hours, visited_points, stories_played) VALUES
((SELECT id FROM users WHERE email = 'demo@echotrail.no'),
 (SELECT id FROM trails WHERE slug = 'preikestolen'),
 NOW() - INTERVAL '2 days',
 NOW() - INTERVAL '2 days' + INTERVAL '4.5 hours',
 'completed',
 8.2, 4.5,
 ARRAY[(SELECT id FROM trail_points WHERE name = 'Preikestolen Basecamp'), 
       (SELECT id FROM trail_points WHERE name = 'Trollskogen'),
       (SELECT id FROM trail_points WHERE name = 'Første utsiktspunkt'),
       (SELECT id FROM trail_points WHERE name = 'Preikestolen topp')],
 ARRAY[(SELECT id FROM ai_stories WHERE title = 'Legenden om Preikestolen')]);

-- User favorites
INSERT INTO user_favorites (user_id, trail_id) VALUES
((SELECT id FROM users WHERE email = 'demo@echotrail.no'), (SELECT id FROM trails WHERE slug = 'preikestolen')),
((SELECT id FROM users WHERE email = 'demo@echotrail.no'), (SELECT id FROM trails WHERE slug = 'besseggen')),
((SELECT id FROM users WHERE email = 'guide@echotrail.no'), (SELECT id FROM trails WHERE slug = 'trolltunga')),
((SELECT id FROM users WHERE email = 'tourist@echotrail.no'), (SELECT id FROM trails WHERE slug = 'preikestolen'));

SELECT 'Norwegian trail data seeded successfully!' as status,
       (SELECT COUNT(*) FROM trails) as trails_count,
       (SELECT COUNT(*) FROM trail_points) as trail_points_count,
       (SELECT COUNT(*) FROM ai_stories) as ai_stories_count,
       (SELECT COUNT(*) FROM users) as users_count,
       (SELECT COUNT(*) FROM memories) as memories_count;