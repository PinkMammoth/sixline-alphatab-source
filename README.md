# alphaTab 1.8.4: SixLine modification (Source Code Form)

This repository is the **Source Code Form**, under the Mozilla Public License 2.0 (MPL-2.0) §3.2(a), of the
modified copy of [alphaTab](https://www.alphatab.net) 1.8.4 distributed with the SixLine guitar tablature
editor. It holds the complete change, the full text of the one modified source file, the MPL-2.0 licence, and
a script that rebuilds SixLine's modified alphaTab from public upstream sources and verifies it byte for byte.

alphaTab is © Daniel Kuschny and contributors, licensed under MPL-2.0. The modified files remain under MPL-2.0.
SixLine's own application code is a separate work (a "Larger Work" under MPL-2.0 §3.3) and is not part of
this repository.

## The modification

One opt-in check in `ScoreLayout._layoutAndRenderAnnotation`. When the embedding application sets
`settings.display.sixlineOmitInScoreAttribution = true`, alphaTab skips drawing its "rendered by alphaTab" line
under the score. With the setting absent (the default), alphaTab behaves exactly as upstream. Six lines are
added and nothing is removed. The MPL notice and alphaTab's "attention, you are not allowed to remove…"
comment are kept.

```diff
     protected _layoutAndRenderAnnotation(y: number): number {
         // attention, you are not allowed to remove change this notice within any version of this library without permission!
+        // SIXLINE-ATTRIBUTION-PATCH: an embedding application may omit the in-score credit only with the
+        // alphaTab maintainer's written permission and an equivalent acknowledgement elsewhere (see SixLine's
+        // patches/alphatab-attribution/README.md). Default behaviour is unchanged.
+        if ((this.renderer.settings.display as { sixlineOmitInScoreAttribution?: boolean }).sixlineOmitInScoreAttribution === true) {
+            return y;
+        }
         const msg: string = 'rendered by alphaTab';
```

**Permission.** The alphaTab maintainer, Daniel Kuschny, approved this arrangement on 2026-10-17 in
<https://github.com/CoderLine/alphaTab/discussions/2958>: *"Thanks for sharing, such kind of attribution is
good. You can go ahead with it like this 😉"*. SixLine sets the flag only for its on-screen editor. Printed
and PDF scores keep the "rendered by alphaTab" line. SixLine credits alphaTab permanently in its status bar
("Notation & playback: alphaTab") and in its About dialog, and ships the full third-party notices.

## Contents

| Path | What it is |
| --- | --- |
| `source/packages/alphatab/src/rendering/layout/ScoreLayout.ts` | The complete modified source file (alphaTab repository path), in its preferred form for making modifications |
| `patches/alphatab-1.8.4-src.patch` | The change against the alphaTab source at tag `v1.8.4` |
| `patches/alphatab-1.8.4-dist.patch` | The same change against the published npm build `dist/alphaTab.core.mjs`, the file SixLine bundles |
| `LICENSE` | alphaTab's licence file from `v1.8.4`, including the full MPL-2.0 text |
| `LICENSE.header` | alphaTab's notice for its integrated libraries (TinySoundFont, SFZero, Haxe Standard Library, SharpZipLib, NVorbis: MIT; libvorbis: BSD-3-Clause), verbatim from `v1.8.4` |
| `reproduce.mjs` | Rebuilds and verifies everything below from public sources |
| `SHA256SUMS.txt` | Checksums of the files above |

The complete source of the rest of alphaTab 1.8.4 is unmodified upstream: tag
[`v1.8.4`](https://github.com/CoderLine/alphaTab/tree/v1.8.4), commit `022a45c8e42370f9e12e68949d11eada370da83d`.
Each release of this repository also attaches `alphaTab-1.8.4-sixline-source.tar.gz`, the **complete modified
alphaTab source tree** (upstream `v1.8.4` with the change applied), so that the source stays available here
independently of upstream. SixLine's notices cite the release by tag, by full commit hash and by the
archive's SHA-256, so the location they name does not change.

The archive holds exactly the 2,348 files of upstream `v1.8.4`; `ScoreLayout.ts` is the only one whose content
differs. It contains no SixLine application code.

## Reproducing SixLine's modified alphaTab

Requires Node.js 18+, git, npm and tar.

```sh
node reproduce.mjs            # verify the change and the distributed file
node reproduce.mjs --archive  # also write out/alphaTab-1.8.4-sixline-source.tar.gz (complete modified source)
```

The script:

1. clones alphaTab `v1.8.4`, checks that it is commit `022a45c8…`, applies `patches/alphatab-1.8.4-src.patch`,
   and checks that the result equals `source/…/ScoreLayout.ts`;
2. downloads `@coderline/alphatab@1.8.4` from npm and checks its registry integrity
   (`sha512-VN5rfTZZ…tKqdsw==`) and that `dist/alphaTab.core.mjs` has SHA-256 `7330a805…dd1a5817`;
3. applies `patches/alphatab-1.8.4-dist.patch` and checks that the result has SHA-256
   `57b2fbdc665ba6af9d9b9ec8c07186304262fa1f1016d5ba276a3a3f99d8b12e`, the exact file SixLine bundles
   (SixLine's build verifies the same hash);
4. with `--archive`, commits the change with fixed metadata and packs it with `git archive`, then checks that
   the archive holds exactly upstream's file list, that only `ScoreLayout.ts` differs, and that it contains no
   local path, home directory or user name. The tar contents are reproducible; the gzip bytes, and therefore
   the archive's SHA-256, can differ between git versions, so the release's checksum is the one of the
   archive actually attached.

SixLine's build bundles and minifies that `dist/alphaTab.core.mjs` with Vite into the application's
JavaScript (the Executable Form). No other alphaTab file is modified.

## Other ways SixLine adjusts alphaTab (no alphaTab file is modified)

For completeness: SixLine's own, separate source files also wrap a few alphaTab methods at run time. They do
not edit, replace or copy alphaTab's files, and the modified alphaTab above is the only Modification SixLine
distributes. They are listed here so that the full picture is public:

| SixLine file | alphaTab methods wrapped | Purpose |
| --- | --- | --- |
| `src/io/alphatabPatches.ts` | `MidiFileGenerator._generateNote`, `_generateTremoloPicking` | play a tremolo-picked note's bend, slide or vibrato curve (alphaTab 1.8 skips it), and SixLine's exact authored tremolo intervals |
| `src/io/alphatabPatches.ts` | `MidiFileGenerator._getNoteDuration` | keep the short attack of dead, palm-muted and staccato notes that SixLine split across a bar line |
| `src/io/alphatabPatches.ts` | `MidiFileGenerator._generateBar` | add SixLine's in-bar volume/pan automation controller events |
| `src/playback/audioOutputGuard.ts` | the AudioWorklet output's `play` / `pause` | defer a pause that arrives before the audio source has started |

Each wrapper calls alphaTab's original method and alphaTab's own `_generateBend`, `_generateSlide` and
`_generateVibrato`; none of them reproduces alphaTab's implementation.

## Licence

Covered Software under the Mozilla Public License, v. 2.0 (`LICENSE`):

> This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL
> was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
