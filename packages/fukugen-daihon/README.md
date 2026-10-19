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
| 52553.16.09.28.1551.evil | Release 01.29 | |

> More to come.

## Folder Structure
On June 21, 2023 Gamecheat13 located a `release_internal` Alpha build of Destiny 1 (ver `36735.13.12.02.1953.alpha`) on Production Xbox LIVE (ProdNet). This is the earliest known build of Destiny and the only `release_internal` build that has leaked. This build of Destiny 1 is unique in that it includes compiled BungieScript files. Source files inside `destiny1\v36735_13_12_02_1953_alpha` have been decompiled from this leaked build with their original file names and folders.
Other versions of the game have had their scripts written from scratch, using the same folder layout and naming conventions.

A script's file name is its encounter's name, and the root of its rows' names (`enc_x.sq_y`). Name a script after its rows.

Every encounter names the bundle it runs in with an `@activity_bundle` decorator, at the top of a `.es` file or above a shared `.bs` encounter's class. A script without one runs in no bundle (a root that is only start decorators, with no members, is left alone: it only starts its activity). The name is usually the encounter's own, but not always: in the Alpha, `venus_bounty_1.es` runs in the bundle `bounty_1_activity`, and each PvP map's script runs in that map's bundle `pvp`. A name never cracked is written as its hash:

```python
@activity_bundle("bounty_1_activity")
@activity_bundle(0x11B7A83E)
```

This is probably not true to Bungiescript - these names would have come from the host tags, but since we arent building from tags this is a minimal stand-in.

An activity's root declares its missions as members, in the order they run (`venus_strike_1_mission1 engineering_phase`); a `.esp` the root doesn't declare never runs.

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

## Tag Data

Bungie's build tools for packages (tool and tool_lib) can be configured to compile "hostonly" packages, a handful of these packages were included in the 36735.13.12.02.1953.alpha (leaked pre-alpha) package. These hostonly packages include compiled scripts and extra tag data needed to run them.

We don't know much about Destiny's loose tags, nor do we need much from them. It appears that each encounter script would have been bound to an encounter host tag in some manner. Script data is a small portion of hostonly packages, so recompiling these packages is beyond the scope of this project. Instead, our compiled scripts include JSON files with supplementrary data which would have come from these hostonly tags, and we dont compile them from loose tags but instead needed data is included within script source using decorators (eg @activity_bundle).

These decorators carry that data:

- `@activity_bundle("name")` on an encounter: the bundle it runs in, which the bundle's host named.
- `@member_counts({dreg: 3, vandal: 1})` on a squad (or on an array or archetype instance holding squads): the host-only squad host's cells, by member name, named members included: the anonymous bodies each member of the squad's definition spawns (a named member's actor comes besides). The client packages list a squad's members but not how many bodies each spawns; Bungie's host-only squad hosts held that. A squad without it spawns one body per member. Member counts are reconstructed from retail captures, and for the pre-alpha from its host-only tags.
- `@placed()` on a squad: the squad host's `+0x54` flag, which stood the squad's named members from the first apply with no script placing them (the warp gates').
- `@objective(obj_x)` on a squad (or `@objective({_squad: obj_x})` on an array or archetype instance holding squads): the Objective the squad host authored the squad against, which the client reads as the squad's first ref. Release dropped it from the host and has no replacement.
- `@task("name", squad: sq_x, condition: flag)` on an Objective, once per task: the task's squad filter and condition, the two fields release dropped from the Objective host's task tree. The rest of the tree is in the packages.
- `@activity("name", ...)` with `@start_slice("region", "phase")`, `@phase("name", "region")`, `@spawn_transition("spawn point")`, `@region_spawn_transition(region, "spawn point")` and `@time_of_day(fraction)` under it, on the encounter that starts those activities: how the activity starts. For the pre-alpha the start slice is the host-only scenario_fah's (initial_bubble, named by its region) and the phases are the strike's; for TU0 (whose packages ship no scenario) the values come from retail captures. A script without them has no start data authored, and its activity cannot start. An activity whose encounters are not written yet has a script of only these decorators. Decorator lines are left out of a chunk's line numbers, so they sit on their own lines under `@activity_bundle` without moving any line of Bungie's code (bullshcript's LANGUAGE.md, Line numbers).

Everything else we need from tags is read from the retail client packages at runtime with gibbon. There are no offline tag dumps. Every fact the host uses comes from a compiled script or a runtime package read.