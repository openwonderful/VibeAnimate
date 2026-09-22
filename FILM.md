# The Film — cut sheet

Every scene, what it is, what lyric it is standing on, and what seconds it
owns. This is the planning document for the whole video; `src/remotion/timeline.ts`
is the executable version of the table below and the two must agree.

- **Length**: 190s (3:10) — the song, untouched, 1:1 from the first frame to
  the last. **Film time == song time everywhere.** The shipping
  `public/audio/body-to-body.mp3` IS the original recording (189.768s; the
  film's last 0.232s plays out silent under 8.55's fade). There was a period
  when it was not — the track carried 8 seconds of spliced silence at the
  death and replayed a 3.8s phrase, which put film = song + 11.8 for
  everything after 2:06.8 and made the film 201.8s. That is gone; see "The
  death, and the grandmother" below for what replaced it. The spliced cut is
  kept beside the song as `body-to-body-spliced.mp3`, referenced by nothing
  (it is gitignored like every other mp3, but it is also the previous
  committed blob of `body-to-body.mp3`, so it is in history either way).
  `body-to-body-original.mp3` is the same bytes as the shipping file and is
  the pre-swap safety copy.
- **Alt-audio cuts**: two films in the selector share this picture frame for
  frame and change only the score — both drop the closing "I need the whole
  stadium to jump" verse so the song ends on the Arirang. The cut is at
  **176.40s** and is a truncation, not a splice: the Arirang's last hit is at
  176.00 and its reverb decays to near-silence by 176.46, with the outro
  starting after that, so there is a real gap to cut in. Null-tested
  sample-aligned with the master from t=0, so **film time == song time holds
  on all three** and every number in this document reads the same on each.
  They differ only over the last 13.6s — 8.55's jump (T_DROP, film 176.26)
  and the ascension: `arirang` leaves it **silent**, `arirang-bed` puts a
  **wash** under it (the Arirang's own last 16s, slowed to 0.85, low-passed
  at 750Hz, smeared with echo; ~7dB down, fading in at 175.0 under the live
  Arirang tail so there is no seam at the cut, gone by 189.8). We have no
  stems, so that wash is built from the mix — and it is the only spliced file
  here. Compositions `FullVideoArirang` / `FullVideoArirangBed`;
  `render-fast` derives the mp3 from the composition id, so do NOT pass `--audio` for them.
- **Watch it**: `?act=film` plays the whole thing in the browser with the
  song under it. `npm run render:full` makes the file.
- **Scene list**: `src/scenes/manifest.ts`. Anything not in the table below
  exists but is not in the cut.

---

## The two fixed points

**Act 8 starts on "Everybody like you" (song 2:22 = film 2:22) and runs 48
seconds to the end.** One shot carrying the Arirang and the finale together.
It ends when the song does. Nothing is allowed to move it off its lyric. Its
clock position has moved twice — +11.8s when the silence was spliced in, and
back again now the splice is gone — and its anchor has never moved, which is
the point: the lyric is the pin, the number is only where that lyric happens
to sit today.

**Acts 1–3 are one continuous take**, authored against the song at 1:1 from
the first frame through 0:26 — the punch through the star field on 0:07.24,
the wordmark on 0:13.05 and 0:14.96, the facade on 0:18.65, over the stadium
rim on 0:20.31. That stretch is unmovable for the same reason.

What is NOT fixed is how fast the flight plays *after* the stage. The journey
home — out of the bowl, back through the city, over the pass, across the
valley and down onto the two of them on the road — is thirty-one seconds of
pure travelling, and it does not carry thirty-one seconds. It now plays in
ten (`storyTime` in `src/scenes/actB/flight.ts`: a smooth 3.1× average, 4.2×
at its peak, easing to 1:1 at both ends so the joins are invisible). The meal
at the end of it went from fourteen seconds to seven.

Those two cuts bought **28 seconds**, and Acts 4–7 went from 46 seconds to
74. Everything that had been dropped for time is back: both audition
bookends, both halves of the road back, and the apartment/empty-table mirror
at full length.

---

## The cut

| Scene | Song | Len | What it is | Lyric it stands on |
|---|---|---|---|---|
| **1** | 0:00 – 0:26 | 26s | **The Approach.** The lit farmhouse at the end of a black road, up over the range, out through the star field, down the city canyon, over the stadium wall and into the bowl. | "I need" ×5 → "I need the whole stadium to jump" (0:18.65) → the drop (0:20.31) |
| **2** | 0:26 – 0:37.5 | 11.5s | **The Show.** The shot settles and the seven land OUTSIDE IN, two at a time — the wings, then the pair inside them, then the pair flanking, then the centre alone — and the line is complete on 0:24, a bar and a half before the lyric. At 0:27.4 the camera starts to leave; on the "heyyy" (attacks 0:27.78; the jerk sits 200ms after it, at 0:27.98, because on the attack frame it read as the zoom-out arriving before the shout) it JERKS backwards (36 → 150 u/s in a frame, easing up to 450 as the shout rings out, and holding that until the authored build overtakes it) and runs, hard, all the way back out to the valley; the far end is reached four tenths sooner and held that much longer, and the road at 0:37.5 is where it always was. (For a month the departure instead held a second longer in the bowl, crossing the wall on 0:30.0; the jerk is the later note and replaced it.) | "The vibe is high, let the building (Heyyy)" → the rap verse |
| **3** | 0:37.5 – 1:04.8 | 27.3s | **Coming Home.** It touches down behind two figures on a road at golden hour — a two-second look, not a scene — then the tree at night, and a pan up into the river of souls — and from there the camera FLIES home sky-aimed, one continuous move (no cut), tilting down to find them carrying the child up the last stretch. Then the door, and the table. The tree beat lost half a second off its opening hold (`TREE_TRIM`, which moves the whole beat and its cues together) and the meal lost a second of the parked hold at the end: the flight's picture ends at 1:03.8 and one second holds on the table, camera parked, steam still going. Those 1.5s went to 4.2/4.3, the only beats in the film that carry no pin. | "Hop in, 좀 더 가까이 와" → the chorus (0:44.99) → "Somebody like you" ×3 |
| **4.2** | 1:04.8 – 1:07.5 | 2.7s | **First Steps.** A toddler wobbles across the floor and falls into open arms. The tumble completes at 1.55s and the rest is a hold on the landing — the beat has 1.15s of it now rather than 0.45s, which is where 0.7s of Act 3's trim went. | — |
| **4.3** | 1:07.5 – 1:10 | 2.5s | **Persimmon Lift** (before). The child hoisted overhead to reach the fruit. Same story as 4.2: the lift lands early and the extra 0.8s is hold. 4.5a still starts on 1:10 to the frame, so every pin from here to the end of the film is where it was. | — |
| **4.5a** | 1:10 – 1:12 | 2s | **The Doorway, first measure.** Backed against the jamb, a line scratched level with the crown. The valley is farmed, the range is clean, no wire over the road. | **"Somebody like you, somebody like"** |
| **4.2r** | 1:12 – 1:13.7 | 1.7s | **First Steps, Reversed.** Same room, same camera, a few years on — the child walks *out* past the kneeling caregiver, whose hands start a lift and don't finish it. 4.2's missing mirror, and Act 5's wave at a distance he can still come back from. | — |
| **4.4** | 1:13.7 – 1:15.4 | 1.7s | **Sickbed Care** (before). A hand on the child's forehead, a bowl of broth. | **"Everybody like you"** (1:14) |
| **4.5b** | 1:15.4 – 1:17.4 | 2s | **The Doorway, second measure.** Halfway up the post. Half the paddies out of production, the power line arrived, the first towers up behind the range. | — |
| **4.6** | 1:17.4 – 1:19.1 | 1.7s | **Sickbed Reversed** (after). Same room, same camera, roles inverted. | *(was on "It's so tight / 너와의 사이" — see below)* |
| **4.5c** | 1:19.1 – 1:21.1 | 2s | **The Doorway, third measure.** Nearly the adult's height. No fields at all, just worked-over dirt, and the city fully risen on the horizon. | — |
| **4.7** | 1:21.1 – 1:22.8 | 1.7s | **Persimmon Hand-down** (after). The grown child picks and hands the fruit *down*. | — |
| **4.9** | 1:22.8 – 1:24.5 | 1.7s | **Piggyback Inversion** (after). The grown child carries the load. Pays off Act 3's carry. | — |
| **4.10** | 1:24.5 – 1:27 | 2.5s | **The Pat.** The caregiver has to reach *up* now. Three unhurried pats. Permission, not farewell. | **"우리만의 그 style"** — SCRIPT.md's own pin |
| **5.1** | 1:27 – 1:30 | 3s | **The Wave.** Both hands up across a growing distance. The doorway stays open. Shot from the paddy side now, so the wave and the 삿갓 read against the dark range instead of against the lamp-lit facade. Cuts while the caregiver's hand is still up — it is never seen to come down. | **"두 눈을 감지 않을 이 밤"** |
| **5.15** | 1:30 – 1:31 | 1s | **Through the Mountains.** One warm figure the size of a thumbnail on the floor of the pass, walking away from the lens under four hundred metres of ridge. The connective beat: without it he leaves a farmyard at dawn and is in a city canyon at night one frame later. | **"솟구치는 겨레의 마음"** |
| **5.2** | 1:31 – 1:34.9 | 3.9s | **The Streets.** Black and white, and him. He starts at the canyon mouth close to the lens and walks INTO the city — towers rising ahead, a wall of high-rise closing the far end — through a grey tide that never looks up. Every light monochrome; he is the only colour in the film's one colourless frame. (Was 5s; the fisheye morph completes at 3.0 and the rest was hold.) | "Be about it" |
| **5.3** | 1:34.9 – 1:38.2 | 3.3s | **The Apartment.** Eating alone at the counter, the bundle from home beside him. He sits in the LEFT third. | **"I need some body to body"** — the chorus as absence |
| **5.4** | 1:38.2 – 1:41.5 | 3.3s | **The Empty Table.** The mirror, and now it is actually a mirror: the caregiver sits in the RIGHT third with the child's place laid and empty on the left. Both scenes used to put their one person left of centre, and cut together that read as one body in one room. | **"All of your body beside me"** |
| **6.4** | 1:41.5 – 1:44.6 | 3.1s | **Phone Call I.** Eating alone and calling home are one gesture, so the call sits directly on the mirror: him in the grey city, phone up; the screen splits from the right and the grandmother slides in — warm against his monochrome. Her half is **7.4's house, built 7.4's way**: `ValleyHouse`'s own recipe at panel scale — the hanok frontal in its real palette, the warm lamp in front of the door doing the lighting, house-to-figure ratio 1.9 like the valley's, and her rocker on the porch corner screen-right of the door, where the chair lives in every scene the house appears in ("use the house that we have right now and place the chair where it is in these other scenes"). He calls her *before* he dares the audition door. | **"손에 손, 너와 나, we on and on"** |
| **6.1** | 1:44.6 – 1:46 | 1.4s | **The Waiting Room.** The glow is dormant. | — |
| **6.2** | 1:46 – 1:52.85 | 6.85s | **The Audition.** The one room where it works. The glow ignites, the camera goes a complete turn around him, and on the last word he puts his hand down the lens — and the shot HOLDS on it. The hold was 1.5s and is 1.15s: 0.35s came off the tail here, and because the timeline is gapless that trim is what slides everything from 6.3 to 6.85 earlier. | **"Sunrise, but we don't go home"** → the point lands on **"you" (1:51.74)**, holds through the **"ayy" (1:52.10)**, out after the last B4 tail (1:52.70) and before the phrase repeats at **1:53.20** |
| **6.3** | 1:52.85 – 1:56.55 | 3.7s | **Busking.** A corner of the same city, in the rain. All seven of them doing the entire show — mic, amp, open case — to a pavement three metres away that does not stop. His glow runs the audition's ramp backwards. | — |
| **6.5** | 1:56.45 – 1:59.35 | 2.9s | **Small Stage.** A basement club, two dozen backs, all seven of them on the boards. He finds the one camera in the room and waves into it — she can't tell which of seven boys is hers unless he does. | **"Somebody like you, ayy"** (1:59.03) — 2.58s into the clip |
| **6.6** | 1:59.35 – 2:03.25 | 3.9s | **The Interview.** Daytime, a television studio. The blue one is being interviewed; the MEMBER — the gold one — is behind the backdrop being obviously sneaky about it: head, shoulder and whole waving arm leaned out past its edge stanchion, body hidden by the board, bobbing on the held lean. A TV in the middle of the frame is the hinge: the grandmother faces the TV, the TV faces the peek (its picture dim enough to actually read now), and she waves back at the screen. Two waves crossing through a television. | — |
| **6.85** | 2:03.25 – 2:15.5 | 12.25s | **The Call.** ONE unbroken piece — and the call owns its first 7.68s outright now: he opens already holding the lit phone at his chest, the buzz, the hospital panel — **her heartbeat written LARGE across it**, a bold trace that sweeps the panel and goes to one bright flat line ("right now it's not apparent that they're dying"), the satgat on the mattress beside her head, the doctor standing frame-right — his gold drains, the panel leaves, the phone comes down, his head sweeps down ALONE as the room dies (the huddle is unlinked to the backlog — `HuddleVignette` in the file, not in the cut). On **"Somebody like you, oh"** the black becomes the 0:20 stadium: dolly-back reveal, the trophy flaring into his hand, **streamer cannons firing from the deck edges** (side jets, not a centre burst), the six standing their marks, breathing, and ONE slow push to chest-up across the wave into the pedestal lens — **and the wave never comes down**. Then the transition the notes asked for: he STANDS STILL and the camera arcs around him — **leftward** ("the camera should move arcing left"), the pit crowd wheeling behind him, the fast dim, the world swapping EARLY in the sweep so the market and its people are around him for most of the ride — settling behind his shoulder onto 7.4's key. (The real moment: his first win, weeks after she died — "Grandma, I love you. I'm sorry. I wish I said it sooner," said into the camera.) | **"Everybody like you, ayy"** (2:07.21) on the first breath of the drain → **"Somebody like you, oh"** (2:10.93) IS the swap frame → **"Somebody like you, ayy"** (2:15.02) mid-arc, on the home valley wheeling in around him |
| **7.4** | 2:15.5 – 2:22 | 6.5s | **The Walk Home.** Continues 6.85's last frame exactly: he STANDS on the road past the last stalls, arm up, still waving at the lit house — and sets off from rest, the wave releasing over the first quarter. The grandmother rises from the rocker **the moment she sees the wave** (t≈0.55) and takes the yard at an amble — ~3.5s for the few steps that used to be a 1.85s dash — staying porch side, frame-right, never crossing the frame; in 8.55 it is HIS hand that goes up first. His gray warms back. Last frame = 8.55's first. **Length untouched at 6.5s** — `journey74.ts` solves Z_START, DECEL_T, the fov ramp and three arrival gates backwards from `DUR`, and those gates must read exactly 0 on the handoff frame. | **"Somebody like you, somebody like"** (2:19.04) |
| **8.55** | 2:22 – 3:10 | 48s | **Arirang → The Finale.** The Arirang sung standing on the road, the field swaying, the jump, and the ascent into Korean constellations. Every internal beat keeps its lyric (T_LINES 1.87/9.69/17.93/25.89, T_DROP 34.26, `from = 142`, no conversion). The ignition ring ACCELERATES: identical to the old cut out to ~8.5s, then each drum ring bigger than the last — and the expansion **includes the mountains**: the ring reaches each hill's skirt, then the light climbs the dome, bottom half on one hit, top half on the next, whole range alight on the 16.82 kick before line 3 (2:39.93). From line 3 to line 4 (2:47.89) the light flashes on every heavy beat — with the first two beats of the window (2:40.06, 2:40.82) flashing as hard as the later ones (the flash gain leans against line 3's own swell so its absolute brightness is constant) — then never again: the eye goes to the souls leaving the ground. The tail is ONE UNBROKEN CRANE that follows the orbs ("we want to follow the orbs… see them become the stars"): from 2:53 the aim climbs off the house — never back down to it — the jump grazes the frame’s bottom edge and the flood is held in frame all the way to the dome; from 2:59.5 the camera itself RISES with the column and pulls back over the house line ("it needs to move more up"). The aim is written as a SKY BEARING (see `CameraRig`), and it stops climbing at ~62° of elevation on purpose. Every earlier pass answered "look further up" by raising it, and by 3:00 it sat within nine degrees of the zenith — which is why the finish read as a narrow column: the river was directly overhead and we were looking at it END-ON, up its own length, so the widest thing in the sky projected to the narrowest thing in the frame. Standing the aim off to 62° puts the lens BROADSIDE to it. The bearing sweeps one way, all the way across by 3:00 (a draft that arrived slower left two thirds of the frame black), and from there the shot is ONE MOVE, 10.5s long, to the frame the film ends on — a framing flown on the studio stage and handed over as a shot ref, reproduced exactly. The camera crosses the valley, twenty units left and thirteen forward, while the aim tilts twenty degrees onto its back and the sky wheels 77° in frame. That wheel has to be EVEN, and the number to watch is not azimuth (meaningless this close to the zenith) but the angle the river makes ON SCREEN: straight-line interpolation to the end pose turns it 2°/s for eight seconds and then 34°/s in the last one — dead, dead, dead, SPIN, which is the old roll defect arriving by another road. The keys carry the bearing on a near-linear schedule instead, holding the turn between 6 and 9°/s the whole way: the sky wheeling over, not the camera rolling. No roll, fov constant at 62 (an earlier push-in read as "a random zoom in"). The last frame of the film: the Big Dipper hanging at the left edge, the 은하수 sweeping out of the top-left corner and across to the right. | **"Everybody like you"** → 아리랑 → "I need the whole stadium to jump" |

**Total 190s.** The timeline throws at module load on any overlap, any
gap, or any total that is not the song's length — so this table cannot
silently drift out of sync with what renders.

---

## The death, and the grandmother

The middle of the film is now about the person the film was always secretly
about. The arc stands on V's real story: raised by his grandmother in rural
Geochang; she watched every broadcast but couldn't tell which of seven boys
was hers, so he learned to find the camera and greet it *for her*; she died
in September 2016 while he was away working, and he performed through the
whole comeback in silence; at BTS's first music-show win he finally said
into the camera, "Grandma, I love you. I'm sorry. I wish I said it sooner";
his stated one wish since is "one phone call with my grandmother." The
phone-call split screens, the background wave, the trophy, the sea of souls
— all of it is that story, kept impressionistic (no captions, no names).

**The song is not cut. It was, and it is not any more.** For a while the
track died at 2:06.8 — the breath after "somebody like", right before
"Everybody like you" — into 8 seconds of true silence that belonged to the
death alone, and then resumed from source 2:03.0, replaying the phrase she
died inside of. That bought the death an enormous amount of room (`6.85`
ran 20.5s) at the price of an edit in the audio: the film ran 201.8s, film
time and song time differed by 11.8s for the last third, and the lyric sheet
had to be *generated* through the splice rather than pinned to the record.

**The film plays the recording whole now.** 190s, film time == song time
from the first frame to the last, one number for everything. The lyric sheet
is pinned 1:1 again and `scripts/lyrics-splice.mjs` is a tombstone.

**What that cost is picture, and almost all of it came out of one clip.**
The film is 11.8s shorter: 11.45s of that is `6.85` going 20.5s → 9.05s, and
the other 0.35s is the trim off `6.2`'s tail the director asked for
separately. `7.4` did not move at all — its 6.5s is a solved number, not a
preference (see the row above). What survives in those 9 seconds is the
call, the drain, the huddle, the stage and the trophy; what went is the
strangers-in-the-street vignette, the hospital bed, and two seconds off the
tail of the death itself. The death is no longer given silence to stand in;
it stands inside the hooks, on "Everybody like you, ayy" (2:07.21) and
"Somebody like you, oh" (2:10.93), which is a different film and a
deliberate one — the world does not stop for it.

The grief stretch is also the only place in the film where a background is
*swapped* rather than cut: under the confetti, the stadium becomes the
countryside road with the camera still moving. Nothing else in the cut does
that, and it is there because `6.85` → `7.4` has to be one continuous move.

**7.1/7.2 left the cut** (files and keys remain), and so did the first
version of the grief stretch, **6.8/6.9/6.95** — three slots merged into
the one connected `6.85` after the three cuts between them read as seams
(the head-sweep, the bed-to-stage, and the wave-to-road each need to be one
camera). The walk home is `7.4`, ending on the same OPEN_CAM handoff into
8.55 that 7.2 used.

---

## The order: Act 5 before Act 6

The child leaves home, is alone in a city of strangers, and only *then*
walks into an audition room. Running the audition first — as an earlier cut
did — made the leaving read as the consequence of a decision the audience
had not been shown, and put the film's loneliest stretch after its most
hopeful one.

---

## The doorway, and the one pin it cost

Act 4's three measures (`4.5a/b/c`) are three windows on **one** montage,
`src/scenes/act4/doorway.tsx` — the marks, the light, the child's growth and
the camera's orbit are all functions of montage time, so playing them in order
is the same thing as playing the montage straight through, and retiming means
editing `PART` and nothing else. They replace `4.5`, a single held 6.5s shot
that had all the same content and read as one frame with a filter over it.

Cutting them *through* the act rather than stacking them at the front is what
makes the pairs legible: the world visibly changes between the measures — the
paddies drain, the towers go up, and by the third there are no fields at all —
so the years between "parent lifts the child" and "the child hands the fruit
down" are on the screen instead of implied.

The 1.2 seconds came off **the meal** at the end of Act 3, which is the only
slack in the picture: Act 4 has to hand over at 1:27 for 5.1's wave, and 8.55
is nailed to 2:22, so 4–7 is pinned at both ends.

**And it cost one pin, which is worth stating plainly.** `4.6` was on "It's so
tight / 너와의 사이" at 1:19.4 and now plays at 1:17.4. The run from 4.6 to
4.10 filled 1:19.4 → 1:27 *exactly* — 1.7 + 1.7 + 1.7 + 2.5, no slack — with
4.10 nailed to "우리만의 그 style". Putting the third measure between 4.6 and
4.7 meant something in that run had to give, and moving 4.6 earlier is cheaper
than cutting three 1.7s beats to 1.1s each. Everything from 4.7 onward keeps
the frame it had.

---

## What is built but not in the cut

Not failures — most of these are the versions the current ones came out of,
and a few are ideas that are simply not this film.

| | |
|---|---|
| **4.5** | The doorway as ONE held 6.5s shot. Superseded by `4.5a/b/c`, which is the same montage cut into three measures and threaded through the act. Kept for comparison. |
| **4.1** | The industrialisation timelapse. Absorbed into the doorway, which plays it as the background. In `Archive`. |
| **5.3-B, 4.1-\*, old-road-\*** | Style studies. The shipping look came out of them. In `Legacy`. |
| **The retired opening** (`old-mountains`, `old-depth-chain`, `old-stadium`, `old-stadium-dive`, `old-arirang-cosmos`, `old-stage-to-mountains`, `old-road-sunset`, `old-road-night`, `old-table`, …) | Acts 1–3 as eleven separate scenes stitched together — an SVG depth chain, a 3D city of flat rows, a CSS portal punching a stadium over the top. Replaced by one flight through one world. In `Legacy`. |
| **8, 8.5, 8.51–8.54, 9** | Six iterations of the ascension plus the old standalone finale, all superseded by 8.55. In `Legacy`. |
| **8b and its design sheets** | A *different* Act 8 — a release of paper lanterns rather than an ascension of people. Not a draft of 8.55. In `Lab`. |
| **Figures, 아리랑, Homages** | Character studies, symbol animations, film tributes. Reference material. |

---

## The gaps

Honest list of what the film does not yet have, in the order it matters.

1. **7.3 (Night Market — Fireworks) is the only Act scene not in the cut.**
   It is marked a test. Decide whether it is a beat or a study.
2. **Act 4's seven short beats run at 1.7–2.5s each.** That is roughly double
   what they had before and they now breathe, but 4.2 (first steps) and 4.10
   (the pat) are still the two carrying the most per second.
3. **The 1:07.5 hand-over** — Act 3's table cutting to Act 4's doorway — is
   the one join in the film that has had no attention at all.
4. **The pull-out peaks at 4.2× story rate.** That is the intent, but it is
   the fastest the camera ever moves and the one stretch most likely to read
   as rushed rather than as urgent. Judge it in motion, not in stills.
