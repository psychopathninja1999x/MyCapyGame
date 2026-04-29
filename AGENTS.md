# CapyMe — Agent Handoff

Cozy pixel-art capybara pet sim built with **React Native + Expo Router**.
This document is the single source of context for the next agent picking up
this project. Read it end-to-end before making changes.

---

## 1. Tech stack

- **React Native** 0.81.5 / **React** 19
- **Expo** SDK ~54, **Expo Router** ~6 (file-system routing under `app/`)
- **TypeScript** ~5.9, strict mode on, path alias `@/* → ./*`
- `expo-image`, `expo-haptics`, `react-native-safe-area-context`
- `react-native-reanimated` is installed but **not used** — all animation
  goes through built-in `Animated`. Don't switch without a reason.

Run scripts (from `MyCapy/`):

```bash
npm start           # expo dev server
npm run android     # native build to attached android
npm run ios         # native build to attached ios
npm run web
npm run lint
npx tsc --noEmit    # type-check only (no build artifacts)
```

If Metro keeps showing a stale "Unable to resolve" error after fixing an
asset path, restart with cache reset:

```bash
npx expo start -c
```

---

## 2. Folder structure

```
MyCapy/
├─ app/                         Expo Router routes
│  ├─ _layout.tsx               Root: SafeAreaProvider + Stack
│  ├─ (tabs)/_layout.tsx        Tab bar hidden; only `index` shows the game
│  ├─ (tabs)/index.tsx          → renders <MainGameScreen />
│  └─ modal.tsx                 (boilerplate, unused)
│
├─ assets/images/
│  ├─ Backgrounds/
│  │  ├─ bg.png                 The painted scene (pond, house, tree)
│  │  ├─ Buttons/               Pixel-art FEED/PLAY buttons (3 states each)
│  │  │  ├─ btn_feed_normal.png
│  │  │  ├─ btn_feed_pressed.png
│  │  │  ├─ btn_feed_disabled.png
│  │  │  ├─ btn_play_normal.png
│  │  │  ├─ btn_play_pressed.png
│  │  │  ├─ btn_play_disabled.png
│  │  │  └─ manifest.json
│  │  ├─ idle/  idle_NN.png
│  │  ├─ happy/ happy_NN.png
│  │  ├─ sad/   sad_NN.png
│  │  ├─ hungry/hungry_NN.png
│  │  ├─ eating/eating_NN.png
│  │  ├─ swimming/swimming_NN.png
│  │  ├─ walking/walking_NN.png
│  │  ├─ running/running_NN.png
│  │  ├─ turn/   turn_NN.png
│  │  └─ manifest.json
│  └─ (icon / splash / favicon — Expo defaults)
│
├─ components/
│  ├─ Capybara.tsx              Sprite renderer (frame swap + scale pulse)
│  ├─ ActionButton.tsx          Pixel-art image button (variant: 'feed'|'play')
│  └─ StatBar.tsx               HUD stat bar (label + filled track + value)
│
├─ logic/                       Pure game brain (no React Native imports
│  │                            in most files; testable in isolation)
│  ├─ types.ts                  Pet, PetStats, traits, mood, memory types
│  ├─ animations.ts             Clip manifest: frames + fps + frameDurationsMs
│  ├─ scenePositions.ts         Scene anchors (static + dynamic resolution)
│  ├─ behavior.ts               Single source of tunable knobs
│  ├─ petReducer.ts             FSM (FEED, PLAY, SWIM, IGNORE, TICK, END_TRANSIENT)
│  ├─ usePet.ts                 Owns state, runs the decay tick + transient end
│  ├─ useAutonomy.ts            Autonomous swim decisions
│  ├─ useSpriteAnimation.ts     setTimeout-recursive frame scheduler
│  └─ index.ts                  Barrel export
│
├─ screens/
│  ├─ MainGameScreen.tsx        The whole game in one screen
│  └─ index.ts
│
├─ scripts/
│  └─ remove-outline.py         Strip white pixel-art outlines from sprites
│
├─ AGENTS.md                    ← you are here
└─ README.md                    Expo boilerplate readme
```

Old `assets/images/CapyMovements/` and `CapyMovements_original/` folders
are unused after the asset migration to `Backgrounds/<state>/`. They can
be deleted without consequence — left in place pending user permission.

---

## 3. Data flow / architecture

```
                    ┌─────────────────────────────────┐
                    │       MainGameScreen.tsx        │
                    │  ─────────────────────────────  │
                    │  usePet()  ───►  pet, actions   │
                    │  useAutonomy(pet, { swim })     │
                    │                                 │
                    │  state → resolveScenePosition()  │
                    │  state → animationName          │
                    │                                 │
                    │  <ImageBackground bg.png>       │
                    │   ├─ stage layer ─ <Capybara/>  │
                    │   └─ ui layer    ─ HUD + dock   │
                    └─────────────────────────────────┘
                                 │
   ┌─────────────────────────────┼──────────────────────────────┐
   ▼                             ▼                              ▼
usePet.ts                   useAutonomy.ts               useSpriteAnimation.ts
   │                             │                              │
   │ useReducer(petReducer)      │ setInterval every 12s,       │ recursive setTimeout
   │ + setInterval every 5s      │ checks pet via ref,          │ honoring per-frame
   │   → dispatch TICK           │ rolls swim chance.           │ durations from clip.
   │ + setTimeout on             │                              │
   │   transientUntil            │                              │
   │   → END_TRANSIENT           │                              │
   ▼                             ▼                              ▼
behavior.ts ◄─── reads ────  petReducer.ts ─── action effects ─►
   │                             │
   ▼                             ▼
derivePassiveState()       memories[], lastInteractionAt,
deriveMood()               stats clamp 0..100
applyDelta()
```

**Key idea**: the screen is dumb. All decisions live in `logic/`. Components
read `pet` and call action callbacks — they never compute new state.

---

## 4. Subsystems

### 4.1 Pet state machine — `logic/petReducer.ts` + `logic/types.ts`

`PetState` is one of:
`'idle' | 'happy' | 'sad' | 'hungry' | 'eating' | 'swimming'`

Two categories:
- **Transient** (user/autonomy-triggered): `eating`, `happy`, `swimming`.
  Set `transientUntil = now + duration` and revert to a passive state when
  the timer fires `END_TRANSIENT`.
- **Passive** (derived from stats): `idle`, `hungry`, `sad`. Picked by
  `derivePassiveState()` whenever a `TICK`, `IGNORE`, or `END_TRANSIENT`
  resolves.

Every action also writes a `PetMemory` entry with a valence (positive /
negative) — see `remember()` inside `petReducer.ts`. The future memory
system reads from this; today nothing else consumes it but it costs
~nothing to keep populated.

### 4.2 Severity-based state derivation — `logic/behavior.ts`

The reason the capy *isn't* always hungry is in `derivePassiveState`:

```
hungerSeverity    = max(0, hunger    - thresholds.hungerHigh)
happinessSeverity = max(0, thresholds.happinessLow - happiness)
```

Whichever **deficit is larger** wins. If both are zero → `idle`. This is
the same model The Sims uses (motive-decay → strongest unmet need drives
behavior). Don't replace this with a fixed priority list — the user
explicitly wanted severity-weighted.

### 4.3 Animation system — `logic/animations.ts` + `logic/useSpriteAnimation.ts` + `components/Capybara.tsx`

- **Manifest** (`animations.ts`) — per-clip `frames[]`, `fps`, `loop`,
  optional `frameDurationsMs[]` for variable-per-frame timing.
- **Scheduler** (`useSpriteAnimation.ts`) — recursive `setTimeout` loop
  that honors per-frame durations. Switched away from `setInterval`
  specifically to support that.
- **Renderer** (`Capybara.tsx`) — single `<Image>` whose `source` prop
  swaps every frame tick. **No crossfade, no opacity blend.** A separate
  always-on scale pulse (`1.0 → 1.025`) gives a "breathing" feel without
  blurring the pixel art.

#### Locked decisions (do **not** silently change these)

1. **Frame-by-frame, no smoothing.** The user explicitly rejected
   crossfade. Each frame must hard-cut.
2. **Slow pacing.** All clips live in the **1-3 fps** band. Cycling at
   4-8 fps reads as "too fast" for cozy pixel art.
3. **Per-frame durations are how `idle` feels alive** — long rest hold
   (~2.8 s) + slow breath cycle + settled exhale. Don't replace with a
   uniform fps.
4. **Position changes are instant.** `MainGameScreen` does *not*
   `Animated.timing` translate values. Each state change snaps the capy
   to the new anchor. The only `Animated` thing left is a one-shot
   opacity fade-in on first mount.

### 4.4 Scene positioning — `logic/scenePositions.ts`

Coordinate convention:
- `x` = horizontal **center** of the sprite, fraction of stage width.
- `y` = **bottom** of the sprite (its "feet" / ground line), fraction of
  stage height.
- `size` = rendered sprite size in dp at the reference width.
- `flipped` = horizontal mirror (base sprite faces right).

Two functions:

| Function | What it returns |
|---|---|
| `scenePositions[state]` | Static default anchor (read-only) |
| `resolveScenePosition(state, ctx)` | Dynamic anchor per call. `swimming` randomizes within `POND_BOUNDS`; `sad` picks `PORCH_CRY` vs `HOUSE_HIDE` biased by `ctx.msSinceLastInteraction`. |

`MainGameScreen` always uses `resolveScenePosition` and stores the result
in component state so the position survives re-renders without
re-randomizing on every passive tick.

While `pet.state === 'swimming'`, a separate effect re-resolves the swim
position every `behaviorConfig.autonomy.pondWanderIntervalMs` (3 s) so
the capy hops between random pond spots.

### 4.5 Autonomy — `logic/useAutonomy.ts`

Currently the capy has **one** autonomous behavior: it goes for a swim
on its own when content. Hook structure (use this as a template for
adding wander / nap / forage later):

- Reads `pet` and `actions` through refs so passive ticks don't reset
  the decision interval.
- Fires every `decisionIntervalMs` (12 s).
- Bails if the capy isn't `idle` or is in a transient.
- Checks comfort gates (`happiness ≥ 50`, `hunger ≤ 60`, `energy ≥ 30`).
- Rolls a random chance (`0.4`).

The user's design intent: the capy entertains itself when it can. If
`Feed` and `Play` aren't pressed, energy eventually drops below the
threshold, autonomy stops firing, happiness decays, and the passive
state machine surfaces `sad` — which then chooses porch-cry or
house-hide based on how long the user has been gone.

### 4.6 Buttons — `components/ActionButton.tsx`

Pure pixel-art image buttons. The label/icon are baked into the bitmaps
at `assets/images/Backgrounds/Buttons/`. The component just `<Pressable>`s
an `<Image>` whose source flips between `_normal` / `_pressed` /
`_disabled` based on press / disabled state. **No emoji, no text label**
on top of the bitmap — it's all in the art.

Source aspect ratio is **384×144 (8:3)**, baked into `BUTTON_ASPECT_RATIO`.
Add a third variant by:

1. Drop `btn_<name>_<state>.png` (3 states) into `Buttons/`.
2. Extend the `ActionButtonVariant` union and the `BUTTON_ASSETS` map.
3. Use `<ActionButton variant="<name>" onPress={...} />` in the screen.

### 4.7 Screen layout — `screens/MainGameScreen.tsx`

```
ImageBackground (bg.png, cover)
├─ stage layer (StyleSheet.absoluteFill, pointerEvents="none")
│   └─ Animated.View (only opacity is animated, transform is plain numbers)
│        └─ <Capybara animation={animation} size={renderSize} flipped={...}/>
│
└─ SafeAreaView (top + bottom edges)
    ├─ HUD panel (name + mood + StatBars)
    └─ bottom dock
         ├─ dialog box (state title + subtitle)
         └─ actions row (Feed + Play)
```

Important details:
- The screen measures the **rendered area** via `onLayout`, **not**
  `useWindowDimensions()`. Trusting `useWindowDimensions` caused the
  "missing capybara on small phones" class of bugs because it returned 0
  on the first frame.
- The capy only renders once `stage.width > 0 && stage.height > 0`.
  Combined with the opacity fade-in, this gives a clean "appears at the
  right spot" entrance.
- Sprite scales down on small phones via
  `clamp(stage.width / 380, 0.65, 1)`. `380` is the design reference
  width; `0.65` is the floor.

---

## 5. Configuration cheat-sheet

Every commonly-tuned knob lives in one of four files. **Do not scatter
magic numbers elsewhere.**

### `logic/behavior.ts`

| Knob | What it does | Current |
|---|---|---|
| `tickIntervalMs` | Passive decay cadence | `5000` |
| `tickDeltas.hunger` | +/min hunger when ignored | `+0.5` per tick |
| `tickDeltas.happiness` | -/min happiness | `-0.25` per tick |
| `tickDeltas.energy` | -/min energy | `-0.15` per tick |
| `ignoreTicks` | Used by IGNORE action (legacy debug) | `120` |
| `thresholds.hungerHigh` | When hunger counts as "hungry" | `75` |
| `thresholds.happinessLow` | When happiness counts as "sad" | `30` |
| `thresholds.energyLow` | Reserved for future "tired" state | `25` |
| `transientDurationMs.eating` | How long eating plays | `3000` |
| `transientDurationMs.happy` | After Play | `2500` |
| `transientDurationMs.swimming` | Long enough to wander 2-3 pond spots | `10000` |
| `actionEffects.feed` | Stat deltas on Feed | `{hunger:-45, happiness:+6, energy:+2}` |
| `actionEffects.play` | Stat deltas on Play | `{hunger:+2, happiness:+30, energy:-12}` |
| `actionEffects.swim` | Applied for both user/autonomy swim | `{hunger:+3, happiness:+20, energy:-18}` |
| `autonomy.decisionIntervalMs` | How often capy considers acting | `12000` |
| `autonomy.swim.chance` | Per-decision probability when conditions met | `0.4` |
| `autonomy.swim.minHappiness/maxHunger/minEnergy` | Comfort gates | `50/60/30` |
| `autonomy.pondWanderIntervalMs` | Time between random pond spots while swimming | `3000` |

### `logic/animations.ts`

- `fps` and `frameDurationsMs[]` per clip
- All clips currently 1-3 fps (cozy pacing)

### `logic/scenePositions.ts`

- `POND_BOUNDS` = `{ xMin: 0.32, xMax: 0.7, yMin: 0.72, yMax: 0.84 }`
- `PORCH_CRY` and `HOUSE_HIDE` ScenePosition constants
- `STATIC_POSITIONS[state]` map

### `components/Capybara.tsx`

- `PULSE_PEAK_SCALE = 1.025` — how much the breathing scale grows
- `PULSE_HALF_PERIOD_MS = 1100` — half cycle (full breath = 2.2 s)

### `screens/MainGameScreen.tsx`

- `REFERENCE_WIDTH = 380` — design width sprites are sized against
- `MIN_SCALE = 0.65` — floor scale on tiny screens

---

## 6. Locked-in design decisions

If a future task seems to imply changing one of these, push back and
confirm with the user before doing it. They are explicit user choices.

1. **Frame-by-frame sprite cycling, no crossfade.** Two attempts to add
   smoothing were reverted. Pixel art must hard-cut.
2. **Position changes are instant**, no gliding/lerping. The `Animated`
   transitions on `translateX/Y` were removed by user request.
3. **Slow animation pacing** (1-3 fps band). Faster than 3 fps reads as
   "too fast" for cozy pet sims.
4. **Subtle breathing pulse on the capy is OK** (it's a +2.5 % scale on
   the wrapper, not a frame interpolation).
5. **No Swim button. No Ignore button.** The capy decides to swim on its
   own; "ignore" is the natural state of not pressing anything (passive
   decay → sad → porch/hide).
6. **White outline removal** was applied to legacy sprites. The current
   `Backgrounds/<state>/` sprites have *dark* line-art outlines and must
   not be re-stripped. The `remove-outline.py` script targets pixels
   touching transparency only, so re-running on the current set is a
   no-op — but still, default to **not** running it on new drops.
7. **Stat balance: severity-based**, not fixed priority. Don't restore
   "if hunger > X return 'hungry' else if happiness < Y return 'sad'".
8. **Buttons render via images, not styled views.** No emoji or label
   text drawn on top of the bitmap.

---

## 7. Known issues / gotchas

### Asset drops sometimes have malformed filenames

Twice the user has dropped fresh sprites and one file had a stray space
in its name (`idle_01 .png`) or was missing entirely (`idle_04.png`).
After any asset replacement, run this audit:

```ps1
# find any PNG with whitespace in the name
Get-ChildItem MyCapy\assets\images\Backgrounds -Recurse -File -Filter '*.png' |
  Where-Object { $_.Name -ne $_.Name.Replace(' ', '') } |
  Select-Object FullName

# verify frame counts match what animations.ts expects
$expected = @{ 'idle'=5; 'happy'=6; 'sad'=6; 'hungry'=6; 'eating'=6;
               'swimming'=6; 'walking'=5; 'running'=5; 'turn'=6 }
foreach ($k in $expected.Keys) {
  $count = (Get-ChildItem "MyCapy\assets\images\Backgrounds\$k" -Filter '*.png' | Measure-Object).Count
  if ($count -ne $expected[$k]) { Write-Host "$k : $count files, expected $($expected[$k])" }
}
```

If a frame is missing, **drop the require from `animations.ts`** rather
than inventing a substitute (the user prefers visible gaps to wrong art).

### Metro caches missing-asset errors

After fixing a path or rename, the dev server sometimes continues to
show "Unable to resolve" for one or two reloads. Restart with:

```bash
npx expo start -c
```

### `idle_04.png` is currently missing

The `idle` clip is 5 frames not 6 because that file isn't on disk in the
current asset drop. `frameDurationsMs` was adjusted to match (5 entries:
`[2800, 650, 650, 650, 1700]`). If `idle_04.png` reappears, restore the
require and add a 4th `650` to the durations array.

### `swimming/swimming_06.png` exists but was originally unreferenced

Now wired up — the `swimming` clip uses 6 frames. Frame count audits
above reflect this.

---

## 8. Asset pipeline

### Sprites

- Live under `assets/images/Backgrounds/<state>/` as `<state>_NN.png`.
- Naming convention: `swimming_01.png`, not `swim_01.png`. The folder
  and prefix must match.
- Each clip's `frames[]` in `animations.ts` is a hand-maintained list of
  `require()`s. Metro's static-only `require` means we **cannot** loop
  over the manifest at runtime — every frame must appear as a literal
  `require('@/assets/.../foo.png')`.
- Pixel art: render at intrinsic size, use `resizeMode="contain"`,
  set `fadeDuration={0}` to prevent Android's default cross-fade.

### Background

- `assets/images/Backgrounds/bg.png` — single full-scene painting,
  ~472×1024 (matches typical phone aspect). Rendered with
  `resizeMode="cover"`. Scene anchors are tuned against this aspect; if
  the painting is replaced with one of a different shape, retune
  `scenePositions.ts`.

### Buttons

- `assets/images/Backgrounds/Buttons/btn_<variant>_<state>.png`
- Authored at 384×144 (8:3 aspect). Aspect is hard-coded in
  `ActionButton.tsx` as `BUTTON_ASPECT_RATIO`.

### Outline removal script

`scripts/remove-outline.py` strips white pixels touching transparency
(the perimeter outline) while preserving internal whites (eye sparkles,
water droplets, etc). Idempotent. Backs up originals to a sibling
`*_original/` folder.

```bash
python scripts/remove-outline.py                           # default folder
python scripts/remove-outline.py path/to/some/sprites      # custom folder
```

The current `Backgrounds/<state>/` sprites already have *dark* line-art,
not white outlines, so running the script on them is a no-op. Don't run
it preemptively.

---

## 9. Roadmap / extension hooks

Pre-wired places to plug in future systems. The reducer / hooks were
designed so each can be added without restructuring.

### Personality traits (already typed, not consumed)

`Pet.traits: PetTrait[]` is populated (default `['playful', 'curious']`).
Use them to bias action effects:

```ts
// in behavior.ts
function effectiveActionEffect(action, pet) {
  const base = behaviorConfig.actionEffects[action];
  if (pet.traits.includes('shy')) return { ...base, happiness: base.happiness * 0.7 };
  if (pet.traits.includes('gluttonous')) return { ...base, hunger: base.hunger * 1.3 };
  return base;
}
```

### Emotional system

`deriveMood(pet)` is a single pure function — replace its body with
something that weights memories, traits, recent events. Nothing else
needs to change.

### Memory system

Every action already pushes a `PetMemory` with a valence into
`pet.memories` (capped at 50). Read it for:

- "Capy remembers you fed it 3 times today" copy in the dialog.
- Bias `pickSadPosition` by recent negative-valence count instead of
  raw elapsed time.

### More autonomous behaviors

`useAutonomy.ts` is a template. Add new branches:

```ts
// pseudo:
if (energy < 25 && random < napChance) actionsRef.current.nap();
if (happiness > 70 && random < wanderChance) actionsRef.current.wander();
```

…with matching reducer cases and (optionally) new `PetState` values.

### Walking between waypoints

The `walking` and `running` clips are already in the manifest but
unused. To make the capy *walk* between scene anchors instead of
teleporting:

- Replace the per-state-change anchor with a small array of waypoints.
- Use `Animated.timing` on `translateX/Y` *only during traversal*,
  swapping the animation prop to `walking` while moving and back to the
  destination clip on arrival.
- Note: this would partially relax the "no glide" rule. Confirm with
  the user before implementing.

### Offline/background catch-up

Currently `setInterval` pauses when the app is backgrounded, so stats
freeze. Real Tamagotchi-style decay would:

- Persist `lastTickAt` to `AsyncStorage` on every TICK.
- On `AppState.active`, compute elapsed real time and apply a
  proportional batch decay before resuming the interval.

### Stats persistence

The whole `Pet` object is currently in-memory only — restart the app
and you start fresh. If persistence is wanted, drop a small effect in
`usePet.ts`:

```ts
// on every pet change → AsyncStorage.setItem('pet', JSON.stringify(pet))
// on mount → load and dispatch a 'HYDRATE' action
```

---

## 10. Quick "where do I change X?" index

| I want to… | Edit |
|---|---|
| Tune how fast the capy gets hungry | `behavior.ts → tickDeltas.hunger` |
| Add a new animation clip | `animations.ts` (new entry) + drop frames in `Backgrounds/<state>/` |
| Move where the capy stands when sad | `scenePositions.ts → PORCH_CRY` / `HOUSE_HIDE` |
| Change pond boundaries | `scenePositions.ts → POND_BOUNDS` |
| Change idle pacing | `animations.ts → idle.frameDurationsMs` |
| Make autonomy more/less eager | `behavior.ts → autonomy.swim.chance` and `decisionIntervalMs` |
| Add a third button | `ActionButton.tsx → ActionButtonVariant` + `BUTTON_ASSETS` |
| Adjust breathing pulse | `Capybara.tsx → PULSE_PEAK_SCALE` / `PULSE_HALF_PERIOD_MS` |
| Make sprite bigger on small phones | `MainGameScreen.tsx → MIN_SCALE` (floor it higher) |
| Add a new pet state (e.g. `tired`) | `types.ts` → union • `animations.ts` → clip • `scenePositions.ts` → anchor • `behavior.ts → derivePassiveState` → branch • `petReducer.ts` → maybe |

---

## 11. Things explicitly out of scope right now

The user has not asked for these. Don't add them unprompted:

- A pet name editor.
- A settings screen / pause menu.
- Multiple capybaras / multiplayer.
- IAP / monetization affordances.
- Stats persistence (see roadmap, but not requested).
- Sound effects / music.
- Day-night cycle on the background.
- Walking between waypoints (would relax the "no glide" rule).

If a request implies one of these, ask first.
