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

## How are scripts reconstructed?

Destiny 1 conveniently lists everything an encounterscript can interract with for a given section of a given map in a given activity in an activity bundle. For example...

The Nexus strike has these items in its bundle (among others)

- pt_ledge (Player Trigger)
- sq_ruins_ledge01 (Squad)
- sq_ruins_ledge02 (Squad)
- sq_ruins_ledge03 (Squad)
- sq_ruins_ledge04 (Squad)

So we know we have a player trigger and 4 corresponding squads. It would be a resonable guess to assume that activating the trigger spawns the squads, and that's exactly what happens.

```bungiescript
# destiny1\v36735_13_12_02_1953_alpha\es\venus\vex_ruins\enc_ruins_strike1.es
thread sc_ledge_encounter:
    sleep_until(pt_ledge.is_triggered())
    sq_ruins_ledge01.place()
    sq_ruins_ledge02.place()
    sq_ruins_ledge03.place()
    sq_ruins_ledge04.place()
```

Scripts aren't always so simple though, especially when Incidents get involved. Incidents are events the game sends up to the server about things the player has done, for example enemies they have killed, loot they have picked up, triggers they have activated, devices they have interracted with.

The best way to assess and reimplement a mission script I have found is to play that mission on the live Destiny 1 servers and capture packets. You can observe every incident the game sends to the server, and which items the server interracts with in response. It's still quite fiddly and labourious, but its a good start!