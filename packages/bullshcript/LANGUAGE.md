# BungieScript

Destiny's missions, strikes and public spaces are driven by scripts that run on Bungie's servers. Bungie wrote them in their own language, which the engine calls `bs`. This document describes that language as best we can reconstruct it.

There are two names for it:

- **BungieScript** (`.bs` files) is used for libraries and shared classes.
- **EncounterScript** (`.es`, `.esp`, `.esu` files) is the same language, used for encounters and missions.

Bungie's original source code is lost. What survives is the compiled output in an early alpha build of Destiny. From that we've rebuilt the language, and we check our work by compiling our version of the alpha's scripts and comparing the result with Bungie's. They match.

## A few terms

- **Activity:** a mission, strike, patrol or other playable space.
- **Bundle:** the data for one part of an activity: its squads, objectives, triggers, loot and so on. Each bundle has a script.
- **Encounter:** the script that runs a bundle. It is known by its file name: `enc_dig_site_strike1.es` is the encounter `enc_dig_site_strike1`. It names the bundle it runs in with `@activity_bundle`.
- **Row:** one entry in a bundle, like one squad or one trigger. Scripts refer to rows by name.
- **Native:** a function provided by the game engine, like "spawn this squad" or "how many of this squad are alive?".
- **Schema:** a description of a class's members (names, types and starting values) that the compiler writes beside the code.

## A first look

This is an ambient encounter from the alpha's Venus academy, in full:

```python
c_encounter_manager encounters
ambush_encounter dig_site_ambush_encounter01
simple_encounter dig_site_simple_encounter01
loot_dig_site loot_venus_dig_site_1

startup thread ss_encounter_controller_thread:
    encounters.actor_budget = 11
    encounters.add_ambient_encounter(dig_site_ambush_encounter01, 9, 100, 20, 120, 0)
    encounters.add_ambient_encounter(dig_site_simple_encounter01, 2, 120, 20, 120, 0)
```

The file is one class. The first four lines declare its members, type first, then name. Most of them are rows in the encounter's bundle. The `startup thread` runs as soon as the encounter starts, and tells the encounter manager to keep two smaller encounters going in the background.

Inside the thread, the code is ordinary Python 2. Members are used by name alone (`encounters`, not `self.encounters`).

## Files

| File | What it holds | Class name |
|---|---|---|
| `.es` | one encounter | `c_encounter__<file name>` |
| `.esp` | one phase of a mission (`mission1.esp`, `mission2.esp`, ...) | the file name |
| `.esu` | one reusable piece, like "kill this squad" | the file name |
| `.bs` | any number of classes, structs and enums | as written |

In `.es`, `.esp` and `.esu` files, the whole file is the class. In a `.bs` file you write the classes out:

```python
class weapon : c_weapon:
    real damage = 10

    def fire():
        ...

enum e_state:
    idle
    attacking
```

### Which bundle an encounter runs in

An encounter says which bundle it runs in with `@activity_bundle`, at the top of a `.es` file:

```python
@activity_bundle("bounty_1_activity")
string_hash sh_first_play = "first_play"
...
```

The bundle's name is usually the encounter's own, but not always: `venus_bounty_1.es` runs in `bounty_1_activity`, and each PvP map's script runs in its map's bundle `pvp`. A name that was never cracked is written as its hash, `@activity_bundle(0x3C2F5ED5)`. An encounter without the decorator runs in no bundle, and the compiler warns about it.

An encounter can also live in a `.bs` file, as the bundles every activity shares do. Write its class out as `c_encounter__<file name>`, built on `c_encounter`, with the decorator above it. A shared encounter runs in its bundle in every destination:

```python
# bs/activities/common/story_common.bs
@activity_bundle("story_common")
class c_encounter__story_common : c_encounter:
    c_lifetime_sensor_host lifetime
    c_timer_sensor_host lifetime_timer
```

The game finds an encounter's class by its file name, so the compiler warns about an encounter class with any other name. It also warns about a class that has the `c_encounter__` prefix but is not built on `c_encounter`. `@activity_bundle` on anything but an encounter is an error.

Bungie's own data kept this link on the bundle's side (the bundle's host named its script), and their compiler left the bundle name out. The decorator is our way of writing it down, since we have the scripts but not the bundles' sources.

### How many bodies a squad spawns

A squad's definition lists its members (one per roster cell), each with a name such as `dreg`, `vandal` or `thrall_1`. How many bodies each member spawns was Bungie's host-only data (the squad host's cells), so a script writes those cells with `@member_counts` on the squad's declaration, keyed by member name:

```python
@member_counts({dreg: 3, vandal: 1})
c_squad_sensor_host sq_fallen_landing01
```

- A member left out keeps the default: one body, or none for a member a named actor fills (`sq_x__captain`). A squad with no decorator is all defaults.
- Two members with the same name take a list, in member order: `{dreg: [2, 1]}`. A name that never cracked is written as its hash: `{0xD1F11E74: 1}`.
- Named actors' members are written too, as the host had them. A named member's count is the anonymous bodies beside its actor, and it goes out as is: nearly always 0 (192 of the pre-alpha's 206 named cells, and every one retail served), 1 for the pre-alpha Tower talkers.
- An array of squads takes a list by index, `{}` for one left at its defaults: `@member_counts([{thrall: 2, thrall_1: 2}, {}])`.
- An archetype instance takes a map of its own members: `@member_counts({_squad: [{dreg: 2}, {vandal: 2}]})` on `simple_encounter amb_x`.
- The decorator goes on its own line above the member. It can share the member's line (`@member_counts({dreg: 2}) c_squad_sensor_host sq_x`), but then the line is the member's and counts as a line of the script (see Line numbers).

The compiler checks the shape against the member's type. The host checks the names against the squad's definition when the script loads: an unknown name or the wrong number of counts for a name stops the script loading, with a note saying why. On `place()` the squad gets the authored bodies, and its roster goes out per cell.

### How an activity starts

Where an activity starts (its slice, the phases it runs, the spawn point) was host-only data too: the alpha's scenario tags held the start bubble, and later builds ship no scenario at all. An activity's encounter writes it with decorators under `@activity_bundle`, once per activity the script starts:

```python
@activity_bundle("act_cosmo_m0_highway")
@activity("act_cosmo_m0_highway")
@start_slice("highway", "cosmo_m0_phase00_highway_intro")
@phase("cosmo_m0_phase00_highway_intro", "highway")
@phase("cosmo_m0_phase00_highway", "highway")
@spawn_transition(0xEAEC2335)
@region_spawn_transition(24, 0x68935472)
@time_of_day(0.77)
```

- `@activity("name", ...)` names the activities the script starts (the activity definition's name; the Tower's three states share one script). Every other decorator here needs it, and two scripts cannot name the same activity.
- `@start_slice("region", "phase")` is the slice the activity starts in and the phase row that owns the state it starts in. A slice is named by its region: the name the scenario client's bubble holds the fnv1 of (`region_name_hash`), such as `plaza`, `dig_site` or `highway`, unique among an activity's bubbles. The slice descriptors' own names are the destination's (`venus`) and cannot tell bubbles apart. The state is never written as a number, and never taken from the order of the `@phase`s: a phase's state in a slice is the one whose phase hash is the fnv1 of its name, so naming the phase names the state (the cutscene state of `highway` is `cosmo_m0_phase00_highway_intro`'s).
- The phase argument is required when any `@phase` plays in the start slice, and must be one of those (a name or `0x<hash>`, the same row as written there). It is left out only when no `@phase` plays in the start slice, so no phase owns a state there and the activity starts in the slice's state 0. A phase that does not play in the slice, or an argument beside no phase in the slice, is a compile error.
- `@phase("name", "region")`, repeated, lists the phase rows in the order the lifetime runs them, each with the slice it plays in. The phase's own state in that slice is the one whose phase hash is the fnv1 of its name.
- `@spawn_transition("spawn point")` is the spawn point the activity starts at; its fnv1 is the GAS spawn transition. Left out, the activity starts at the default one.
- `@region_spawn_transition(region, "spawn point")`, repeated, is the transition the server names for a region once a client has been there. The region is the number the GAS carries, `bubble << 3 | state`, not a slice name.
- `@time_of_day(fraction)` locks the clients' time of day from world entry, as a fraction of the day (`0.77` is sunset, `0.025` night); `set_time_of_day` moves it once scripts run. Left out, nothing is locked and each client keeps its own clock (the Tower). No client package holds it: the lifetime carries it from the server.
- A spawn point, phase or slice name that never cracked is written as its hash, `0x<hash>`; `sliceRegionHash(slice)` turns either form into the region hash to match against the scenario client.
- A root can be nothing but these decorators: an `.es` with `@activity` and its start decorators, no `@activity_bundle` and no members, starts the activity and runs nothing. It is the minimal script for an activity whose encounters are not written yet; the "runs in no bundle" warning is kept for an encounter that has a body.
- Each goes on its own line under `@activity_bundle`, with the comment that explains it directly above it. They never need to share a line to keep a script's line numbers (see Line numbers).

The values travel in the compiled tree (`index.json`) beside the script, and `activityStart(name)` on the compiled set or the script folder gives them back with the destination (the script's `es/<destination>/` folder) and the script's path.

## Members

A member is declared on its own line: its type, its name, and optionally a starting value.

```python
int waves_left = 3
bool boss_spawned = false
string_hash music = "boss_theme"
c_squad_sensor_host sq_boss
```

- **Basic types:** `int`, `short`, `real` (a number with a fraction), `bool`, `string`, `string_hash`, `vector2d`, `vector3d`, `vector4`.
- **Engine types:** most members are game objects, like `c_squad_sensor_host` (a squad) or `simple_encounter`. Their type decides which natives you can call on them.
- **Lists:** `static_array<T, N>` and `T[N]` hold a fixed number of items, and `table<K, V>` maps keys to values. `dynamic_array<T>` holds a variable number, which the bundle decides for each copy of the class: one `simple_encounter` gets one squad, another gets three.
- **Starting values:** numbers, `true`/`false`, `"text"`, vectors as `(x, y, z)`, and enum values like `e_state.idle`. Without one, numbers start at `0` and bools at `false`.

Two optional extras:

- **`static`** in front of a member shares it between every copy of the class, like a static in C++.
- **`bind(...)`** after a member connects it to another one when the script loads: `pt_x bind(tv_x)`. A string binds an identifier by its authored name, which the host hashes with FNV-1: an objective and the placement it unlocks share one (`bind("vex_block")`). A name never cracked is written as its hash, `bind("0x8C8D186C")`.

**Rows are declared by hand.** Every squad, objective or trigger a script uses has its own member line. The bundle's rows were made to match the script, not the other way round, so some declared rows are never used by the code. A squad's individual actors are declared as `<squad>__<actor>`.

Not every row in a bundle belongs to its script, and not every member becomes a row:

- **Rows that belong to the world:** firing areas, spawn points, landing points, kill volumes, factions and spawn influencers. The level's tools make them, and scripts never declare them.
- **Members that are not rows:** devices, incident listeners, activity flags, capturables, interactables, player iterators and objective timers. These are engine objects the script owns outright.

**Other encounters.** A `c_encounter_handle` member reaches the encounter of another bundle in the activity. Name the member after the encounter, because the game fills it in by that name:

```python
c_encounter_handle enc_engineering_strike1

thread main:
    enc_engineering_strike1.sc_engineering_trash.wake()
```

## Threads

Most of a script's work happens in threads. A thread is a function that can pause and pick up where it left off.

```python
startup thread main:
    sq_boss.place()                         # spawn the boss squad
    sleep_until(sq_boss.alive_count() == 0) # wait until it's dead
    wake(reward)                            # start the reward thread

thread reward:
    sleep(2)                                # wait two seconds
    objective.set_complete()
```

- `startup thread` starts as soon as the class does.
- `thread` waits until something calls `wake` on it.

Pausing:

| Call | Waits until |
|---|---|
| `sleep(t)` | `t` seconds have passed |
| `sleep_until(c)` | `c` is true (checked once a second; `sleep_until(c, period)` to change that) |
| `sleep_until_timeout(c, t)` | `c` is true, or `t` seconds have passed |
| `sleep_forever()` | never |

Controlling other threads:

| Call | Does |
|---|---|
| `wake(t)` | starts a waiting thread |
| `restart(t)` | starts a thread again from the top |
| `kill(t)` | stops a thread |
| `is_running(t)`, `is_finished(t)` | report on a thread |

## Methods and the rest

```python
def name(params):               # a method
static def name(params):        # a method shared by every copy of the class
delegate name(params)           # a callback another class can implement
def member.name(params):        # implements a member's callback
command_script cs_name(params): # a list of orders for an AI
```

- **Callbacks:** to handle one of the engine's callbacks, write a `def` with its name: `d_startup`, `d_finalize`, `d_on_player_enter`, `d_restore_from_game_state`.
- **Command scripts:** each line is an order for an AI to carry out later (`follow_path(...)`, `snap_to(...)`, `sleep(2)`), not code that runs right away. Hand one to an AI with `pilot.execute(cs_name())`.
- **Load-time code:** encounter files get an `import()` method written for them. Define `user_import()` to run your own code when the script loads.

## Code

Method and thread bodies are Python 2, with four differences:

1. **No `self`.** Members are used by name alone. A name is looked up as a local first, then a member, then a type, then a builtin. Write `self.x` only when a local has the same name as a member.
2. **`switch`:**
   ```python
   switch state:
       case e_state.idle:
           wake(patrol)
       default:
           pass
   ```
3. **`true`, `false` and `nil`** are lowercase.
4. **`+` joins strings** when either side is a string: `"Wave: " + i`.

Everything else works as in Python 2: indentation, `if`/`elif`/`else`, `while`, `for`, `break`, `return`, `pass`, lists (counting from 0), `a, b = f()`, `"text {}".format(x)` and `#` comments. Some specifics:

- **Variables** are created when first assigned, and last until the end of the block they're in.
- **`for` loops:** `for i in range(a, b)` counts from `a` up to `b - 1`. `for v in things` goes through a list, and `for i, v in things` gives the index too.
- **Long lines** can be split inside brackets, or with a `\` at the end of a line.
- **`;`** puts two statements on one line. The alpha uses this to give an order and wait for it:
  ```python
  pilot.execute(cs_x()); sleep_until(pilot.get_command_script_state() != e_command_script_state.executing)
  ```

## Talking to the game

Scripts do very little themselves. Almost everything is a call to the engine, a **native**:

- **On members:** `squad.place()`, `squad.alive_count()`, `objective.set_complete()`, `encounters.add_ambient_encounter(...)`. Each engine type has its own set.
- **Everywhere:** `print`, `assert`, `len`, `event_message` and a few more.

[NATIVES.md](NATIVES.md) lists every native, and [INCIDENTS.md](INCIDENTS.md) lists the incidents: the named events players cause and scripts listen for or submit.

## How scripts run

### When an activity starts

1. The server loads the script for every bundle in the activity.
2. Each class gets a fresh copy, with every member at its starting value.
3. Members are connected to their bundle rows, then `user_import()` runs if there is one. Bungie's tools ran this step once, when the bundle was built, and saved the results with the bundle.
4. Every `startup thread` starts.

### While it's running

The server runs on a fixed tick. Each tick, every paused thread that's ready to continue (its time is up, or its condition is true) carries on, one after another, until it pauses again. Between ticks, things that happen in the game (kills, triggers, pickups) update what the natives see.

A mission's phases (`.esp` files) all load at the start, but only one runs at a time. The next one starts when the current phase's `main` thread finishes.

The activity's root script declares each phase as a member, in the order they run: the mission's class as the type, the bundle's phase row as the name (`venus_strike_1_mission1 engineering_phase`). A mission's members are that phase's rows (`engineering_phase.utils`). A mission the root does not declare never runs.

The same goes for every other script a class uses: a member declared with a script class (`u_globals utils`, `c_pvp_controller pvp_controller`) is that class's instance inside this one, whether or not the bundle has a row for it.

### Things to watch for

- **Threads take turns.** Only one runs at a time, and nothing interrupts it. A thread that never pauses holds up every other thread.
- **An error stops only its own thread.** The rest of the activity carries on.
- **Numbers are 32-bit floats,** like C's `float`. Fractions and very large numbers are less precise than in Python.

## Compiling and editor support

To compile scripts or set up syntax highlighting, see the [README](README.md).

## How sure are we?

The compiled alpha scripts give away a lot: member names and types, every statement and the line it was on, the text of every `sleep_until` condition, and the order of every member. Some things leave no trace in the compiled output, like the exact spelling of `def`, `thread`, `startup`, `delegate`, `command_script` and `static`, and comments. Those are our best guess.
