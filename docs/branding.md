# SpikeSim brand foundation

Edition 1, 2026-11-04. The folder is named `legobuild`; the product name remains
**SpikeSim**, following the user's earlier naming decision. This guide extends the
established violet/lime direction. It describes the first usable identity, not a
claim that a release or public campaign has happened.

## Positioning and language

SpikeSim is a robotics playground for students aged 10–17 and their teachers.
Students build, program, observe and improve virtual robots; teachers can bring
those experiments into lessons and local competitions.

- Name: **SpikeSim**. Keep the capital S in both words.
- Descriptor: **Robotics playground**.
- Main line: **A little code. A world of possibilities.**
- Short action line: **Build. Code. Try again.**
- Voice: a helpful lab partner. Use short verbs, concrete actions and encouraging
  explanations. Describe the result that actually happened. Never invent saved
  progress, endorsements, classroom adoption or performance claims.

`src/shared/brand.ts` owns the product identity. UI copy remains in the shared
strings. The static brand preview is presentation collateral and uses the same
name, tagline and palette.

## Mark, type and colour

The original mark traces an S-shaped route between a white starting point and a
lime endpoint. It connects coding with motion without using a LEGO brick, logo,
font or borrowed mascot. The canonical mark is `public/icon.svg`; the app lockup
uses that same file. Keep it upright and undistorted. Leave clear space of at least
one quarter of the mark's width. Use 24 px minimum in layouts; favicons can be smaller.

| Colour | Value | Use |
| --- | --- | --- |
| Route violet | `#5745C9` | Mark and strong identity emphasis; white text |
| Studio violet | `#7460EE` | Existing interface accents |
| Idea lime | `#B9E769` | Highlight on dark backgrounds; ink text |
| Midnight ink | `#172342` | Text, reverse lockup backgrounds, presentations |
| Studio paper | `#F6F8FC` | Main light surface |

Lexend 600 is the wordmark/headline face. Atkinson Hyperlegible is for explanations;
JetBrains Mono remains the code font. Use sentence case. Status must have a label
or icon in addition to colour. Avoid lime text on white.

Use the primary wordmark on light surfaces, the reverse on dark ones, and the
single-colour mark for simple print. The SVG wordmarks embed the licensed Lexend
font. Use the PNG version in tools that do not support embedded SVG fonts.
Font license files are bundled with the kit.

## Assets and review

Open `http://127.0.0.1:5173/brand/index.html` with the preview running, or open
`public/brand/index.html` locally. It includes logo treatments, palette, typography,
voice examples, a classroom/social card and download links. Everything is local.

`npm run brand:export` regenerates artwork from the canonical mark and identity,
using the already installed Chrome and Playwright. It writes SVG/PNG wordmarks,
the 1200×630 card, 1024/256/180 px PNG icons, Windows ICO and macOS ICNS assets.
The ICO contains a 256 px PNG and the ICNS a 1024 px PNG. Electron packaging uses
these assets. Windows executable/installer acceptance passed; see
[packaging](packaging.md) for the evidence and remaining platform checks.

This is independent educational software. Use “Not affiliated with or endorsed by
the LEGO Group” in about/legal contexts. The identity does not change the bundled
simulator's GPL or other asset notices. Keep those notices with distribution.
