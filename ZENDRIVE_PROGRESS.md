# ZenDrive — Implementation Progress

> Gitignored working log. Updated after every sprint. Source of truth for "where are we"
> if context is lost. Sprint specs live in `zendrive-sprints/`, design in `ZENDRIVE_MASTER.md`.

## Current State

- **Currently on:** Sprint 8.2 (session stats screen + journey log map) next
- **Phases 1–6 complete** — living world + 7 vehicles + full HUD + cockpit +
  records; traffic (instanced + reactive) + ambient life + scenic-layby menu;
  full procedural audio (engines/ambience/weather/horns/music, Howler.js);
  unified InputManager: keyboard + gamepad (rumble) + gyro + touch, one
  keydown listener, normalised getState()
- **Note:** SPRINT_INDEX.md had Phases 1–2 pre-marked `[x]` but NO code existed in the repo
  when this run started (2026-07-05). Statuses there were stale/aspirational. Implementation
  starts from scratch at Sprint 1.1.

## Environment / Decisions Log

- 2026-07-05: Installed `three` + `simplex-noise` into `frontend/`.
- Engine lives at `frontend/src/components/games/ZenDrive/engine/` per master doc.
- Progress tracked here + Claude task list (9 phase-level tasks) + SPRINT_INDEX.md checkboxes.
- Commit convention: `feat(zendrive): Sprint X.Y — <title>` after each sprint, no push.

## Sprint Log

| Sprint | Status | Commit | Notes |
|--------|--------|--------|-------|
| 1.1 | done | 74e332a | scaffold, WebGL, loading, fallback; verified headless-chromium screenshot |
| 1.2 | done | 67f81f9 | chunked infinite road, 12 chunks constant |
| 1.3 | done | 65c9fb2 | box vehicle, WASD, chase cam; DEV debug hook `window.__ZD_DEBUG` |
| 1.4 | done | 61f2731 | arcade physics, VEHICLE_CONFIGS, drift model |
| 2.1 | done | c1279ae | spline road x(z), arc-length table, lateral-offset steering, ?turn= |
| 2.2 | done | 2734d0d | heightmap terrain (road-pinned), trees/walls, per-chunk PRNG |
| 2.3 | done | ddc0ea8 | biome.js system + City/Desert/Coastal, ocean shader, crossfades |
| 2.4 | done | cebc91e | Mountain (WINDY override via road.setTurnModifier) + Industrial (smoke) |
| 2.5 | done | 1a5f886 | Sky shader, 10min=24h clock, sun keyframes, hud.js clock, ?time= |
| 2.6 | done | 46ec310 | streetlight PointLight pool, headlight SpotLights, star field |
| 2.7 | done | 29c9ea4 | weather.js: 7 states + DYNAMIC, particles, wet road, lightning, ?weather= |
| 3.1 | done | 2976872 | vehicleFactory.js: procedural geometry for all 7 vehicles, KeyV cycler |
| 3.2 | done | 9883924 | per-vehicle physics (understeer, lean, wobble, trailer lag, terrain drag) |
| 3.3 | done | b929878 | idle animations per vehicle (exhaust puffs, wobble, indicator blink) |
| 3.4 | done | 4d6fa8d | HUD: SVG speedo dial w/ spring needle, LCD, gear, rolling ODO + lifetime (localStorage `zendrive_odo`), biome toast, weather icon, night mode |
| 3.5 | done | 03ad079 | tach: TACH_CONFIG, manual gears formula/bike (Q/E, gate >75% redline), auto D1–D4 bands, redline glow, shift hint ▲ |
| 3.6 | done | 4166cb1 | cockpit cam (C), 0.5s eased blend, body hidden in cockpit (opaque windscreens!), CSS dash skins, __ZD_SCENE |
| 3.7 | done | 74ec4a5 | records.js localStorage `zendrive_records`, speed toast (5s cooldown, +5km/h margin), distance at session end |
| 4.1 | done | 1646693 | traffic.js instanced cars + truck/bus pools, 4 lanes (±1.5/±4.5), biome density, follow-the-leader |
| 4.2 | done | 4957ec0 | traffic reactivity: tailgate brake, cut-off honk, slow-crawl flash; shared light-bar InstancedMeshes; setOnHonk hook |
| 4.3 | done | 90c3a8f | ambience.js: birds/gulls/dust-devil/peak-snow/pedestrians, canvas textures, crossfade-weighted |
| 4.4 | done | 90f1f87 | menu.js scenic layby + orbit cam + ZENDRIVE overlay; vehicle park/unpark; MENU→DRIVING sweep; ?drive=1 skips menu |
| 5.1 | done | f93f3ba | audio.js Howler engines, pitch by RPM, vol by throttle; procedural WAV loops (generate.mjs); computeTarget pure/tested |
| 5.2 | done | ef64bc2 | biome ambient beds (5s xfade), weather rain/storm/wind (speed-reactive), thunder (dist delay), positional horns; weather.setOnLightning, traffic.setOnHonk |
| 5.3 | done | 8e00128 | 5 music loops, biome→genre map, genre override dropdown, speed low-pass (node-patch), RPM duck |
| 6.1 | done | f80e7d7 | input.js InputManager (only key listener), normalised getState, vehicle uses {throttle,brake,steer}, menu kbd nav |
| 6.2 | done | 9f6484f | gamepad poll/merge (idle doesn't block kbd), button edges, rumble, HUD device indicator |
| 6.3 | done | a8a7679 | gyro detect/permission prompt, gamma→steer (deadzone/sens), ?gyro=1 test |
| 6.4 | done | 81cb372 | touch joystick + gas/brake, touchState override, pinch→camera.adjustZoom, ?touch=1 test |
| 7.1 | done | fc61387 | race.js seeded circuits (FNV seedToInt + mulberry32), URL hash #seed=X&length=Y shareable, RACE_LENGTHS, start/finish gates |
| 7.2 | done | 56d3813 | AI opponents: AI_DIFFICULTY tiers (beginner→elite), 11 AI colours, lane-offset racing lines, menu pickers (length/rivals/difficulty) |
| 7.3 | done | 5ff00c7 | race timing: live timer, P{n}/{field} position, ±s gaps, progress bar w/ AI dots, sector splits, personal best (localStorage per seed+length), countdown |
| 7.4 | done | 510bb33 | results.js slide-up screen: standings (seeded AI names, projected* times), PB delta, top speed, sanitised name entry + submit stub (localStorage `zendrive_race_pending` until 7.6), Race Again (same seed), Exit→menu (rebuilds layby); gameplay HUD hidden under results |
| 7.5 | done | 91a8dd8 | road-space player↔AI collisions (impulse, restitution 0.5, cooldown), camera.shake, collision rumble, synthesised thud (audio.playCollision), dent marks on hit face (vehicleFactory.addDamageMark, cap 5/3, cleared on reset); race-only |
| 7.6 | done | 3976536 | ZenDriveRace model + GET/POST /api/zendrive/leaderboard (top-5 per seed+length, sanitize/qualify/trim like GameScore); race.fetchLeaderboard/submitScore; BEST TIMES block on results screen, live re-fetch after submit; verified vs live Atlas, test docs removed |
| 8.1 | done | d54827b | stats.js sessions (road-distance deltas, top speed, biomes/weather sets, wrap-aware game clock); ODO → structured {total,zen,race,perVehicle} w/ legacy-float migration + 5s crash-safe commits; sessions start/end wired in index.js; __ZD_STATS hooks |

## Performance (player-reported 3fps → fixed 2026-07-05)

- **Root cause: fragment/fill-bound.** fps scaled with viewport pixel count
  (confirmed by the user and by a headless viewport-sweep probe). NOT geometry
  (37K tris / ~100 draw calls are trivial) and NOT the lights or Sky
  specifically (removing either didn't move fps).
- **The fix that mattered: MeshStandardMaterial → MeshLambertMaterial everywhere.**
  Full PBR shading is pure per-fragment cost for a flat-shaded low-poly game.
  Measured 3.4× headless fill speedup; larger on a real GPU. **RULE: never use
  MeshStandardMaterial in ZenDrive — always MeshLambert (or MeshBasic for
  unlit). Lambert has no roughness/metalness.** vehicleFactory `mat()` strips
  those keys; wet-road look is carried by colour darkening, not specular.
- Also capped `renderer.setPixelRatio` at 1.5 (was 2) — retina renders 4×
  fragments at DPR 2. A future quality setting (9.4) can expose this.
- If still slow on weak hardware, next levers: disable `antialias` (MSAA),
  cut the 12-light streetlight pool, reduce chunk view distance.
- DEV perf hooks: `window.__ZD_PERF` (draw calls/tris/lights/DPR), `__ZD_THREE`,
  `__ZD_RENDERER`; `scratchpad/perfprobe.js` sweeps fps across viewport sizes.

## Other fixes (2026-07-05)

- Acceleration was absurd (formula 55 m/s² = 0–100km/h in 0.5s). Tuned formula
  20, bike 18, scooty 12; braking eased on formula/bike. Others were realistic.
- Neck-snapping turns: camera used `lerp * frames` which clamps to 1 on slow
  frames (instant teleport). Replaced with framerate-independent exponential
  smoothing `1-(1-k)^frames` in camera.js.
- 2026-07-06: the "3fps on real hardware" turned out to be the player's
  chromium having hw-accel disabled — but the Lambert/DPR perf work stands.

## Player-reported fixes round 2 (2026-07-06, commit 3303625)

- **Inverted steering** ("screen yanks left, car goes right"): road.js `side`
  was `(tangent.z, 0, -tangent.x)` — documented as road-RIGHT but geometrically
  screen-LEFT (chase cam faces +Z ⇒ screen-right = −X). vehicle.js yaw/lean
  were written to the true screen convention, so nose and slide disagreed.
  Fixed at source: `side = (-tangent.z, 0, tangent.x)` (= tangent × up). All
  consumers (traffic lanes, biome setbacks, layby, race grid) use symmetric ±
  offsets, so the world mirrors consistently — no other changes needed.
- **Night pitch-black**: ambient 0.15 × colour 0x223355 (~22% luma) + moon
  0.25, all crushed by ACES tone mapping at 0.6 exposure → mean screen
  luminance 0.016. Fix bundle in sky.js + vehicle.js: moon 0.9, ambient night
  floor 0.32 with brighter moonlit-blue AMBIENT_COLOR_STOPS (0x5c6c96 /
  0x4d5c85), headlights 60→150cd (range 60→90, cone 0.4→0.5rad), and
  night-adapted `toneMappingExposure` lerp 0.6 (day) → 1.0 (night). Result:
  midnight mean luminance 0.047, terrain/trees/headlight pool readable;
  daytime pixel-identical intent (0.46 mean, exposure still 0.6 at daylight 1).
- **RULE:** any new night-time material/colour must survive ACES @ night
  exposure — check with `zendrive-tools/shot.mjs '?drive=1&time=0'` + magick
  mean luminance (target ≳0.04).
- Regression seam note: frontend has NO test framework (no vitest/jest), so
  these are locked by probe scripts instead: `zendrive-tools/steerprobe.mjs`
  (asserts key → camera-relative displacement sign) and shot.mjs + ImageMagick
  luminance. Tools dir is gitignored; needs `npm i puppeteer-core` inside it.

## Known notes / deviations

- Coastal road is NOT elevated (spec suggested +2 spline Y); instead terrain
  drops to sea level on the ocean side — same visual read, no road-Y plumbing.
- Headless chromium (swiftshader) renders ~3fps since the Sky shader landed —
  fine for screenshots; sim time just advances slowly in tests. Real GPUs OK.
- Tree LOD placeholder skipped (full LOD in 9.1).
- Lightning audio hook (weather.onLightning) wired for Sprint 5.2.
- Weather dropdown in HUD is temporary (debug only); full settings in 8.5.
- Game now boots to the scenic-layby MENU. For screenshot/harness tests that
  need to drive immediately, append `?drive=1` to skip straight to DRIVING_ZEN.
- Traffic lanes are ±1.5/±4.5 (spec said ±2.5/±5.5, which overhang the 12m road).
- Menu default start time is golden hour (0.74); `?time=HH` still overrides.
- Layby geometry persists in the scene after driving off (reads as a pull-off).
- Audio: spec said download CC0 files from freesound; instead ALL sounds are
  procedurally synthesised in `public/audio/zendrive/generate.mjs` (engines,
  ambience, weather, thunder, horns, music) — fits the no-external-assets ethos,
  ~2.1MB total, reproducible via `node generate.mjs`.
- Music low-pass reaches into Howler internals (`howl._sounds[]._node`) to
  filter only the music bus; wrapped in try/catch — plays unfiltered if the
  internal shape ever changes.
- Audio-context unlock is handled by Howler autoUnlock + explicit unlock on
  the Start click / first keydown, so ZenDrive.jsx needs no audio changes.
- DEV audio hooks: `window.__ZD_AUDIO` (per-frame getDebug snapshot) and
  `window.__ZD_AUDIO_API` (the module, for calling setGenre/onLightning/etc.).
- shot.js now passes `--autoplay-policy=no-user-gesture-required` so audio
  runs in headless tests.
- Input test params: `?gyro=1` forces the gyro prompt, `?touch=1` forces the
  on-screen touch controls (both otherwise gated on device heuristics).
- DEV `window.__ZD_INPUT` exposes the InputManager for tests (getState,
  enableGyro, isGyroEnabled, etc.).
- Gyro/touch permission + control DOM live in the engine (hud/input), not
  ZenDrive.jsx, keeping React to just the canvas + HUD container.
- justPressed edge detection needs one frame; at headless ~3fps, brief
  (<300ms) synthetic key taps can fall between frames — hold keys longer or
  drive edges via `__ZD_INPUT` when testing.

## Test harness

- Puppeteer script: `$SCRATCHPAD/shot.js <url> <out.png> [waitMs] [keys "KeyW:3000,KeyD:800"] [evalJs]`
  (uses system chromium + swiftshader; captures console errors; keys held sequentially)
- Vite dev server runs in background task on http://localhost:5173
- `window.__ZD_DEBUG` (DEV only): { state, x, z, speed(m/s), yaw, chunks }
