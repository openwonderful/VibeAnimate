# TODO — queued review notes

Raised while reviewing `out/renders/FullVideo720.mp4`. Not yet actioned;
listed roughly in the order they were called out.

## Cranes (opening) — refine the fix

`src/scenes/act1/components/CraneLayer.tsx`

The wings were sweeping forward over the beak; they now rake back
(`scaleX(-1)` about the shoulder). Two adjustments still wanted:

- [ ] Wings are a touch **too far back** now — ease the rake off a little
      (scale the mirrored wing's x by ~0.8 about the shoulder rather than a
      full mirror).
- [ ] The **lower wing sits too far left** — from the viewer's side it should
      move right, so the two wings read as a matched pair around the body
      instead of the lower one trailing.

## The parent figure — colour

- [ ] The parent currently reads as the same warm gold as the child. Decide a
      distinct colour and, most likely, make it **considerably darker**.
      Worth brainstorming a few options against the SCRIPT.md logic: the
      caregiver dims a shade per beat through Act 4 (landing at
      `CARE_GOLD_49`) while the child holds its gold, so whatever is picked
      has to survive that dimming ramp and still read against a sunset road,
      a lamplit room and a night street.
      Scenes affected: 3.1, 3.2, 3.3, 4.2–4.10, 5.1, 5.4, 7.

## Act 3.3 — "The Table" (1:00–1:14)

- [ ] **Does not look good.** It reads blurry, and the framing is too close.
- [ ] Use the **same stick-figure characters** as the surrounding scenes
      rather than whatever it renders now — the family around the table
      should be recognisably the same people as on the road.
- [ ] `Act3_3.tsx` has **eleven bare `Math.random()` calls** building its
      layout. See the note below — in a render that alone makes the scene
      strobe, and is very likely part of why it reads as "blurry". Fix it
      whatever else happens to the scene.

## Everything after 1:00

- [ ] The whole run of scenes from the one-minute mark onward needs another
      pass — Act 4's ten one-second beats, Act 5, 7, 8, 9. Current verdict:
      "all kind of bad". Treat as a rework, not a touch-up; the pieces after
      the table have had far less attention than Acts 1–3.

---

## Reference — the flicker class of bug (fixed in Acts 2 and 3)

Worth knowing before touching any scene above, because it looks like a
rendering artefact and is actually a determinism bug.

A Remotion render splits the frame range across several parallel browser
tabs. Anything whose **layout is built from bare `Math.random()` at mount**
gets a *different* layout in every tab, so consecutive frames of the finished
video come from different layouts and the elements strobe — what read on
screen as "the glittering lights are flickering like crazy".

Fixed so far:
- drei's `<Sparkles>` (its position/size buffers are `Math.random()`)
  → replaced by `src/scenes/effects/SeededSparkles.tsx` in Act 3.1 and 3.2.
- `StageHaze` in `Act2_2_B.tsx` → seeded.

Still unaudited, all in the post-1:00 bucket: `Act3_3`, `Act5_B`,
`Act8`'s `WarmSparkles`, the `CharStickGold*` / `CharWireframe` figures,
`YourNameCutoutsScene`. Anything using `seededRandom()` is already fine.
