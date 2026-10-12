# 復元台本

|      | Word    | Reading | Meaning |
|:----:|:-------:|:--------|:--------|
| 復元 | [fukugen](https://jisho.org/word/%E5%BE%A9%E5%85%83) | ふくげん | restoration (to an original state); reconstruction |
| 台本 | [daihon](https://jisho.org/word/%E5%8F%B0%E6%9C%AC) | だいほん | script (of a play, film, etc.); libretto; scenario |

> *Restored scripts.* Destiny 1 BungieScript and EncounterScript files rewritten to the best of our ability.

## What are BungieScript files?
In short - Destiny server-side mission scripts, required to play missions.

If you are familiar with Halo scripting, this is what HaloScript evolved into, kindof. Each activity in Destiny 1 has associated scripts which run on the Destiny servers and tell your game what to do. Activities include everything - Social Spaces, Strikes, Raids, Story Missions, Cutscenes, Patrols, Crucible, Public Events and more.

The BungieScript syntax to my knowledge has never been shared, so this repository targets the BullShcript syntax instead, which is a best-guess based on what we do know about the language.

## Supported Versions

|Build String | Version Name | Note |
|:---------:|:-------:|:--------|
| 36735.13.12.02.1953.alpha | Leaked Alpha | Scripts decompiled from packages.|
| 41375.14.07.03.1501.live | Release TU0 |  |

> More to come.

## Folder Structure
On June 21, 2023 Gamecheat13 located a `release_internal` Alpha build of Destiny 1 (ver `36735.13.12.02.1953.alpha`) on Production Xbox LIVE (ProdNet). This is the earliest known build of Destiny and the only `release_internal` build that has leaked. This build of Destiny 1 is unique in that it includes compiled BungieScript files. Source files inside `destiny1\v36735_13_12_02_1953_alpha` have been decompiled from this leaked build with their original file names and folders.
Other versions of the game have had their scripts written from scratch, using the same folder layout and naming conventions.