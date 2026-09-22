# The Lantern Keeper — Story Bible

> Original short film for Flow Studio (Iteration 8). 60 seconds, six
> 10-second shots, all filmed inside the **Lantern Valley** world
> (`src/studio/worlds/LanternValley`) — one location, six places/times.

## Logline

In a valley where paper lanterns hold the village's memories, the old
keeper tends the flames alone — until the night her grandchild follows
her up the shrine hill, and she passes the light on.

## Theme

Same DNA as the Body to Body arc (care handed down across generations),
told forward instead of in reverse: light as inheritance.

## Look

- Warm lantern gold (`#FFB84D`) as the only "alive" color against deep
  indigo nights (`#080E1F`) and violet dusk (`#2A1E3A`).
- Bloom + vignette on every shot (`StoryPost`); the gold figures and
  lantern paper are the brightest values in every frame.
- The valley is always the same world — continuity of place is the
  quiet star of the film.

## Characters (ingredients)

- **The Keeper** — `char.goldAdult`, walks with a hand-lantern.
- **The Child** — `char.goldChild`, quicker gait, always a step behind.

## Beat sheet / shot list

| # | Key | Time | Place (anchor) | Beat |
|---|-----|------|----------------|------|
| 1 | `story.1` | 0–10 | valley wide (gate) | **Waking the lanterns.** Dusk. Crane down from the ridge: the lantern road lights the valley like a vein of gold. The keeper is a speck walking the road. |
| 2 | `story.2` | 10–20 | village lane | **The follower.** Night. Low tracking shot up the lane; the keeper walks ahead with her lantern; the child slips out and hurries to catch up. |
| 3 | `story.3` | 20–30 | bridge | **The bridge.** They cross the wooden bridge together; the river carries the lantern's reflection; the child reaches up toward the light. |
| 4 | `story.4` | 30–40 | hill steps | **The climb.** The shrine hill against the mountain ring; two small glows ascend the stone steps. |
| 5 | `story.5` | 40–50 | shrine | **The passing.** At the shrine under the old persimmon tree, the keeper lowers the lantern into the child's hands — the glow transfers. |
| 6 | `story.6` | 50–60 | shrine → valley | **First light.** Dawn. The child holds the lantern up; pull back wide: the valley wakes below. Title: *The Lantern Keeper*. |

## Continuity rules

- One world (`LANTERN_VALLEY`), no set redressing between shots — camera
  and lighting presets only (`dusk` / `night` / `dawn`).
- The keeper's lantern is the same ingredient instance parameters
  everywhere: `scale={0.55}`, warm `#FFB84D`.
- Region culling per shot (SPEC §6): each shot mounts only the regions
  its camera can see.

## Deliverables

- Manifest keys `story.1`–`story.6` (group Studio), 10s each.
- `StoryFilm` / `StoryFilm720` Remotion compositions
  (`src/remotion/StoryFilm.tsx`, timeline in `src/studio/story/timeline.ts`).
- Render: `npm run render:act -- story.1` per shot, or the full film via
  the StoryFilm composition.
