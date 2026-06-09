# BETWEEN SUNDAYS — Production Guide
### ElevenLabs Setup, Script-to-Audio Workflow, and Distribution
*GraceNotes Daily | Internal Reference*

---

## Overview

This guide covers three things in sequence:

1. **Setting up the five voice profiles** in ElevenLabs
2. **Turning a script into a finished audio episode** using ElevenLabs Studio
3. **What to do with the audio** — distribution to Spotify, Apple Podcasts,
   and YouTube

Read this once end-to-end before touching anything in ElevenLabs.
The decisions you make in Phase 1 (voice setup) carry through every episode.
Getting them right once saves hours across the whole season.

---

# PHASE 1: SETTING UP YOUR VOICE PROFILES

## What You Need Before You Start

- An ElevenLabs account at [elevenlabs.io](https://elevenlabs.io)
- **Recommended plan:** Creator ($22/month) or Pro ($99/month).
  The free plan has limited character allowance and does not give you
  full access to Voice Design or Studio. For a 30-40 minute podcast,
  a Creator plan is the minimum working level.
- The five voice descriptions from the Host & Voice Bible document
  (each one has an 11 Labs prompt suggestion ready to paste)

---

## Step 1: Create Eli Beni's Voice

This is your primary host voice. Set it up first and spend the most
time getting it right, because it will carry every episode.

1. Log into ElevenLabs and go to **Voices** in the left sidebar.
2. Click **+ Add a New Voice**.
3. Select **Voice Design** (not Voice Cloning — you are creating a
   synthetic persona, not cloning a real person).
4. You will see fields for: **Age**, **Gender**, **Accent**, and a
   free-text **Description** field.
5. Fill in as follows:
   - **Age:** 45
   - **Gender:** Male
   - **Accent:** African (select from dropdown, then add nuance in description)
   - **Description:** Paste the 11 Labs prompt from the Host Bible:
     *"45-year-old Congolese man speaking English with a French accent.
     Rich, warm baritone. Passionate and animated — this voice has conviction
     and is not afraid to show it. Variable pace: builds with urgency when
     making a point, lands the final word with deliberate weight. Strong
     emphasis on key words. Educated, articulate, and deeply expressive.
     The musicality of French-inflected African English — colourful vowels,
     intentional consonants. Sounds like a man who has decided what he thinks
     and is telling you with everything he has. Warm, grounded, and very
     much alive."*
6. Click **Generate** — ElevenLabs will create four voice variations.
7. Listen to all four. Look for: warmth in the baritone, the slight
   deliberateness in pace, any hint of French-inflected vowels.
8. If none of the four are right, adjust the description (add: *"slight
   French influence on vowels"* or *"voice deepens when making a significant
   point"*) and generate again.
9. When you find the right one, click **Use Voice** and name it: **Eli Beni**
10. Save to your Voice Library.

**Voice settings to save alongside the Eli Beni profile:**
- **Stability:** 30% (lower = more natural variation and expressiveness; this is what keeps him from sounding flat)
- **Similarity Enhancement:** 75%
- **Style:** 65% (this is the critical setting — Style drives passion and expressiveness; anything below 50% will make him sound like he's reading you a bedtime story)
- **Speaker Boost:** On

---

## Step 2: Create Thando Dube's Voice

1. Back in **Voices** → **+ Add a New Voice** → **Voice Design**.
2. Fill in:
   - **Age:** 38
   - **Gender:** Female
   - **Accent:** African (then specify in description)
   - **Description:** Paste:
     *"38-year-old Kenyan woman with a slight British accent. Clear, warm
     mid-range voice. Articulate and precise without being cold. Laughter
     is natural and genuine. Pace varies — slows when searching for the
     right word, fluent and direct when certain. Carries intelligence and
     warmth together. Sounds like a well-read, well-travelled woman who
     has been through something real and is speaking honestly about it."*
3. Generate four variations. Look for: clarity, the Kenyan-British blend,
   warmth underneath the precision.
4. Select, name **Thando Dube**, save to library.

**Voice settings for Thando:**
- **Stability:** 40% (she is more emotionally variable than Eli)
- **Similarity Enhancement:** 75%
- **Style:** 35%
- **Speaker Boost:** On

---

## Step 3: Create The Specialist Voice (Male)

This voice appears when the episode's expert/professional guest speaks.

1. **Voices** → **+ Add a New Voice** → **Voice Design**
2. Fill in:
   - **Age:** 50
   - **Gender:** Male
   - **Accent:** African
   - **Description:** *"48-52 year old Nigerian male voice speaking English.
     Nigerian accent with slight international inflection — educated, professional
     register. Warm, measured, authoritative without being cold. The voice of a
     specialist or counsellor: credible and caring in equal measure. Deliberate
     pace, clear articulation. Grounded and steady. Does not perform emotion but
     carries genuine warmth."*
3. Generate, select, name **The Specialist**, save.

**Voice settings:**
- **Stability:** 60% (professional voices need more consistency)
- **Similarity Enhancement:** 80%
- **Style:** 20%

---

## Step 4: Create The Witness Voice (Female)

This voice carries the personal story segments from female guest perspectives.

1. **Voices** → **+ Add a New Voice** → **Voice Design**
2. Fill in:
   - **Age:** 37
   - **Gender:** Female
   - **Accent:** African
   - **Description:** *"35-39 year old Kenyan woman, neutral English accent.
     Warm, real, conversational. Not broadcast-polished — this is the voice
     of someone telling their story to a friend. Emotionally present and
     variable: can hold grief, laughter, relief. Pace varies naturally with
     content. Sounds unscripted even when scripted. The quality of genuine
     honesty."*
3. Generate, select, name **The Witness (F)**, save.

**Voice settings:**
- **Stability:** 35% (most emotionally variable voice — you want this)
- **Similarity Enhancement:** 70%
- **Style:** 40%

---

## Step 5: Create The Witness Voice (Male)

1. **Voices** → **+ Add a New Voice** → **Voice Design**
2. Fill in:
   - **Age:** 43
   - **Gender:** Male
   - **Accent:** African
   - **Description:** *"40-45 year old East African male voice, neutral English
     accent. Warm baritone, slightly lighter than a full broadcast voice.
     Grounded, honest, measured pace. The voice of a thoughtful man telling
     a real story. Not emotionally demonstrative but genuinely present. Sounds
     like a real person in conversation, not a produced voiceover. Carries
     conviction through steadiness rather than volume."*
3. Generate, select, name **The Witness (M)**, save.

**Voice settings:**
- **Stability:** 45%
- **Similarity Enhancement:** 75%
- **Style:** 25%

---

## After Setting Up All Five Voices

You now have a Voice Library with five saved profiles. These are permanent —
you will use the same five voices for every episode of the season.

Label them in your library exactly as follows so they match the script notation:
- **Eli Beni** → maps to `[ELI]` in all scripts
- **Thando Dube** → maps to `[THANDO]` in all scripts
- **The Specialist** → maps to `[SPECIALIST]` in all scripts
- **The Witness (F)** → maps to `[WITNESS-F]` in all scripts
- **The Witness (M)** → maps to `[WITNESS-M]` in all scripts

---

# PHASE 2: TURNING A SCRIPT INTO AN EPISODE

## How the Scripts Are Formatted

Every Between Sundays script follows this format:

```
[ELI] — *[direction note, e.g.: quietly, landing a point]*
The spoken line goes here. It can be multiple sentences. All of it
belongs to this speaker until the next speaker label.

[SPECIALIST] — *[measured, professional]*
The specialist's response goes here.
```

The speaker labels (`[ELI]`, `[THANDO]` etc.) tell Studio which voice to use.
The direction notes in italics (*quietly*, *with a slight laugh*) are for you
as the producer — they guide how you adjust the voice settings for that
specific line, not text for the voice to speak.

**Important:** Remove the direction notes before pasting into Studio.
Only the spoken text should be in the generation input.

---

## Step-by-Step: From Script to Audio in ElevenLabs Studio

### Step 1: Open Studio

1. In ElevenLabs, click **Studio** in the left sidebar.
2. Click **+ New Project**.
3. Select **Podcast** as your project type.
4. Name the project: e.g., *Between Sundays — EP01 — God Didnt Promise You That Job*
5. Click **Create**.

### Step 2: Set Up Your Speakers

When your project opens, Studio will ask you to add speakers.

1. Click **+ Add Speaker**.
2. Add all five voices from your Voice Library: Eli Beni, Thando Dube,
   The Specialist, The Witness (F), The Witness (M).
3. Even if an episode only uses three voices, add all five now — it costs
   nothing and you will reuse this setup for every episode.

### Step 3: Paste the Script

You have two options:

**Option A — Auto-detect (recommended for first episodes):**
Paste the full script text and let Studio attempt to detect speakers
from the `[ELI]`, `[THANDO]` labels. Review what it assigns and correct
any errors.

**Option B — Manual:**
Paste the script section by section, assigning the correct voice
to each block as you go. This gives you more control and is worth
doing for the first episode until you trust the auto-detect.

### Step 4: Generate the Audio

1. Click **Generate All** to process the full episode in one pass,
   or **Generate** section by section.
2. First-pass generation takes 5-15 minutes for a full 30-40 minute episode.
3. Listen through the entire episode on first pass before making any edits.
   Note timestamps where delivery feels off — do not fix line by line
   in real time or you will lose the overall sense of flow.

### Step 5: Refine Problem Lines

For lines that don't land correctly:

- **Pacing too fast:** Add a comma or period in the middle of the line
  to force a natural pause.
- **Wrong emphasis:** Use ElevenLabs' inline SSML tags to shift stress:
  `<emphasis level="strong">this word</emphasis>`
- **Too flat/robotic:** Slightly lower the Stability setting for that
  voice in that segment (go from 45% to 35% for that line).
- **Mispronounced word:** Use the Pronunciation Dictionary in Settings
  to add custom pronunciations for names like *Dube*, *Beni*, *Amara*,
  or any Swahili/Lingala words that appear in the scripts.
- **Re-generate a single line:** Highlight the specific text block,
  click the refresh icon, and regenerate just that segment without
  touching the rest.

### Step 6: Add Music and Sound Design

ElevenLabs Studio has a built-in music layer. Alternatively:

**Recommended approach for Between Sundays:**
- **Opening music bed:** 10-15 seconds of warm, acoustic instrumental,
  fading under Eli's cold open. Keep it simple — the voice is the show.
- **Transition music:** A short 3-5 second musical phrase between
  the major episode sections (cold open → welcome, grace note → close).
- **Closing music:** Same theme as opening, fading up under Eli's
  final line.

Sources for royalty-free music that fits the brand:
- [Epidemic Sound](https://www.epidemicsound.com) — subscription-based,
  excellent quality, cleared for Spotify and YouTube.
- [Artlist](https://artlist.io) — one annual fee, unlimited use.
- [ElevenLabs GenFM](https://elevenlabs.io/blog/genfm-podcasts-in-projects) —
  AI-generated music built into Studio.

### Step 7: Export

1. Click **Export** in the top right of Studio.
2. Select **MP3** (128kbps minimum; 192kbps recommended for Spotify quality).
3. Name the file clearly: `BetweenSundays_EP01_GodDidntPromiseYouThatJob.mp3`
4. Download to your computer.

---

# PHASE 3: DISTRIBUTION

## Spotify and Apple Podcasts — via a Podcast Host

You do not upload directly to Spotify or Apple Podcasts from your computer.
You need a **podcast hosting platform** — it stores your audio files and
generates the RSS feed that Spotify and Apple pull from.

**Recommended host for Between Sundays:** [Buzzsprout](https://www.buzzsprout.com)

Why Buzzsprout:
- Clean, simple dashboard
- Direct Spotify and Apple Podcasts integration (one-click submission)
- Episode analytics
- Affordable ($12/month for the plan that supports episode sizes this length)
- Generates a public podcast page that works as a basic web presence

**Steps to publish an episode:**

1. Create a Buzzsprout account and set up the *Between Sundays* podcast profile:
   - Show name: **Between Sundays**
   - Description: *"A GraceNotes Daily podcast. Real conversations about faith,
     life, and everything that happens between Sundays."*
   - Category: Religion & Spirituality → Christianity
   - Cover art: GraceNotes-branded artwork (1400x1400px minimum, JPG or PNG)
   - Language: English

2. Submit to Spotify: In Buzzsprout's dashboard → Directories → Spotify.
   Click Submit. Approval takes 2-7 days the first time. After approval,
   all future episodes publish automatically.

3. Submit to Apple Podcasts: Same pathway. Apple's approval takes 24-72 hours
   for the first submission.

4. For each new episode: Go to **Episodes** → **+ New Episode** in Buzzsprout.
   Upload the MP3. Fill in:
   - **Episode title:** Same as the script title (e.g., *God Didn't Promise You
     That Job*)
   - **Episode description:** 2-3 sentences summarising the episode.
     Use keywords from the SEO list in the strategy document.
   - **Episode number and season number**
   - **Publish date/time:** Schedule for Tuesday or Wednesday mornings —
     podcast listening peaks mid-week.

5. Buzzsprout automatically pushes the episode to Spotify and Apple
   within 15 minutes of publishing.

---

## YouTube — AI Video Format

The YouTube version of each episode is the audio plus a visual layer.
Between Sundays is not a talking-head show on YouTube — it is a branded
visual experience.

**Recommended approach:**

**Option A: Static Brand Card + Captions (simplest, still effective)**
A single branded image (the Between Sundays cover art or a branded
episode card with the episode title and a relevant visual) held for
the full episode duration, with animated subtitles generated from
the transcript. This is the approach used by most successful audio-native
podcasts on YouTube.

Tools:
- [Canva](https://www.canva.com) — design the episode card image
- [Kapwing](https://www.kapwing.com) or [Submagic](https://www.submagic.co)
  — add auto-captions to the audio over the still image. Export as MP4.
- Upload the MP4 to YouTube.

**Option B: Animated Visual with ElevenLabs Studio Video (more production)**
ElevenLabs Studio 3.0 supports video output — you can add a visual layer
directly in the Studio editor. This is still developing but is functional
for lyric-video style outputs.

**Episode card template for each YouTube upload should include:**
- Show name: BETWEEN SUNDAYS
- GraceNotes Daily logo
- Episode title (bold, readable at thumbnail size)
- A single image that represents the episode theme — not a stock photo
  of a Bible. Something visual and specific: a boardroom, a hospital
  corridor, a wedding ring, an empty office chair.

**YouTube episode description format:**
```
BETWEEN SUNDAYS | Episode 01
[Episode title]

[2-3 sentence episode summary using SEO keywords]

--- In this episode ---
[Timestamp] 00:00 — Cold Open
[Timestamp] 02:30 — Welcome
[Timestamp] 06:00 — The Conversation
[Timestamp] 28:00 — The Grace Note
[Timestamp] 34:00 — The Close

--- About Between Sundays ---
A GraceNotes Daily podcast. Real conversations about faith, life, and
everything that happens between Sundays. Hosted by Eli Beni,
with Thando Dube.

--- Links ---
GraceNotes Daily app: [link]
Spotify: [link]
Apple Podcasts: [link]
Instagram: [link]

#BetweenSundays #GraceNotesPodcast #ChristianPodcast #FaithAndLife
[Episode-specific hashtags from the strategy document]
```

---

## YouTube Shorts (Clips)

Each full episode should yield 3-5 short clips (45-90 seconds) for
YouTube Shorts, Instagram Reels, and TikTok.

**Clip selection criteria:**
When reviewing the final audio, timestamp the moments that match these types:
- The honest gut-punch (when someone names the thing nobody names)
- The scripture reframe (a biblical story used in an unexpected way)
- Eli's opinion-forward take (the direct, bold statement of position)
- The guest's most unguarded personal moment
- The closing line of the Grace Note

**Clip production:**
1. Export the clip timestamps from Studio or trim from the full MP3
   in [Audacity](https://www.audacityteam.org) (free) or GarageBand.
2. Add captions in Submagic or CapCut.
3. Add the Between Sundays brand watermark in the corner.
4. Export as MP4 (vertical format: 1080x1920 for Reels/TikTok/Shorts).

---

## Content Publishing Cadence

| Platform       | Format          | Cadence       | When to post        |
|----------------|-----------------|---------------|---------------------|
| Spotify        | Full episode    | Weekly        | Wednesday morning   |
| Apple Podcasts | Full episode    | Weekly        | Wednesday morning   |
| YouTube        | Full episode    | Weekly        | Wednesday morning   |
| YouTube Shorts | 45-90s clip     | 2-3 per week  | Thu, Sat, Mon       |
| Instagram Reel | 45-90s clip     | 2-3 per week  | Thu, Sat, Mon       |
| TikTok         | 45-90s clip     | 2-3 per week  | Thu, Sat, Mon       |
| GraceNotes app | Grace Note devotional | Weekly | Thursday           |
| Email list     | Episode + Grace Note | Weekly  | Wednesday           |

---

## File Naming Convention (keep this consistent)

All files use the same naming format:

```
BetweenSundays_EP[##]_[ShortTitle].[extension]
```

Examples:
```
BetweenSundays_EP01_GodDidntPromiseYouThatJob.mp3
BetweenSundays_EP01_GodDidntPromiseYouThatJob_CLIP01.mp4
BetweenSundays_EP01_GodDidntPromiseYouThatJob_YOUTUBE.mp4
BetweenSundays_EP05_WhenGodOpensTheDoor.mp3
```

Keep all episode files in a single organised folder structure:
```
BetweenSundays/
  Season01/
    EP01/
      Script/
      Audio/
      Clips/
      YouTube/
    EP02/
    ...
```

---

## Quick Reference: What to Do Each Episode

1. Receive final script
2. Clean script (remove direction notes, keep only spoken text)
3. Open ElevenLabs Studio → New Project → Paste script → Assign voices
4. Generate full episode audio
5. Review and refine problem lines
6. Add music beds
7. Export MP3
8. Design episode card in Canva
9. Create YouTube MP4 (audio + card + captions)
10. Upload to Buzzsprout → publishes to Spotify + Apple automatically
11. Upload MP4 to YouTube with full description and timestamps
12. Cut 3-5 clips from the episode
13. Post clips across Reels, TikTok, YouTube Shorts over the following week
14. Extract the Grace Note segment → format as GraceNotes Daily devotional
    → schedule in-app and email for Thursday

---

*End of Production Guide | Between Sundays*
*GraceNotes Daily — Internal Reference*
