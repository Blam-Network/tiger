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
encounter_manager encounters
ambush_encounter dig_site_ambush_encounter01
simple_encounter dig_site_simple_encounter01
loot_dig_site loot_venus_dig_site_1

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 11
    encounters.add_ambient_encounter(dig_site_ambush_encounter01, 9, 100, 20, 120, 0)
    encounters.add_ambient_encounter(dig_site_simple_encounter01, 2, 120, 20, 120, 0)
```

The file is one class. The first four lines declare its members, type first, then name. Most of them are rows in the encounter's bundle. The script, marked `@startup()`, runs as soon as the encounter starts, and tells the encounter manager to keep two smaller encounters going in the background.

Inside the script, the code is ordinary Python 2. Members are used by name alone (`encounters`, not `self.encounters`).

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
    lifetime lifetime
    timer lifetime_timer
```

The game finds an encounter's class by its file name, so the compiler warns about an encounter class with any other name. It also warns about a class that has the `c_encounter__` prefix but is not built on `c_encounter`. `@activity_bundle` on anything but an encounter is an error.

Bungie's own data kept this link on the bundle's side (the bundle's host named its script), and their compiler left the bundle name out. The decorator is our way of writing it down, since we have the scripts but not the bundles' sources.

### How many bodies a squad spawns

A squad's definition lists its members (one per roster cell), each with a name such as `dreg`, `vandal` or `thrall_1`. How many bodies each member spawns was Bungie's host-only data (the squad host's cells), so a script writes those cells with `@member_counts` on the squad's declaration, keyed by member name:

```python
@member_counts({dreg: 3, vandal: 1})
squad sq_fallen_landing01
```

- A member left out keeps the default: one body, or none for a member a named actor fills (`sq_x__captain`). A squad with no decorator is all defaults.
- Two members with the same name take a list, in member order: `{dreg: [2, 1]}`. A name that never cracked is written as its hash: `{0xD1F11E74: 1}`.
- Named actors' members are written too, as the host had them. A named member's count is the anonymous bodies beside its actor, and it goes out as is: nearly always 0 (192 of the pre-alpha's 206 named cells, and every one retail served), 1 for the pre-alpha Tower talkers.
- An array of squads takes a list by index, `{}` for one left at its defaults: `@member_counts([{thrall: 2, thrall_1: 2}, {}])`.
- An archetype instance takes a map of its own members: `@member_counts({_squad: [{dreg: 2}, {vandal: 2}]})` on `simple_encounter amb_x`.
- The decorator goes on its own line above the member. It can share the member's line (`@member_counts({dreg: 2}) squad sq_x`), but then the line is the member's and counts as a line of the script (see Line numbers).

The compiler checks the shape against the member's type. The host checks the names against the squad's definition when the script loads: an unknown name or the wrong number of counts for a name stops the script loading, with a note saying why. On `place()` the squad gets the authored bodies, and its roster goes out per cell.

### Squads that start placed

Bungie's squad host for a warp gate carries a flag (`unknown54`, true name unknown) that made the gate's named member stand from the first apply, with no script placing it (`vex_warp_gate` only ever asks `_squad.alive_count()`). A script writes the flag as `@placed()` on the squad's declaration:

```python
@placed()
squad _squad
```

- The decorator goes on its own line above the member, with the comment that explains it, or shares the member's line. It can go with `@member_counts` on the same member, in either order.
- It decorates a `squad` only. A class that declares the squad (an archetype) marks every instance of it: each Encounter row running the class has its own squad stand.
- The squad's named members are placed when the host starts, and its default body count (the named members, each one body) holds until a script places or removes it: `alive_count()` reads it and the actors stay placed. A squad whose script places it itself is left to the script.

### Which Objective a squad is against

A squad's host named the Objective the squad is authored against, and the client reads it as the squad's first ref; release dropped it from the host, so a script writes it as `@objective(<member>)` on the squad's declaration:

```python
@objective(obj_plaza_amb1)
squad sq_plaza_sniper
```

- The target is a `objective` member of the script, or of a script it holds: `phase02.obj_x`, `waves[1].obj_y`. A target that is not an Objective member, or not there at all, is an error.
- On an array of squads it applies to every element: `@objective(obj_x) static_array<squad, 4> sq_wave`.
- On an archetype instance it takes the path form, like `@member_counts`: `@objective({_squad: obj_plaza_amb1}) simple_encounter fallen_simple_encounter01` puts every squad of the instance's `_squad` array against `obj_plaza_amb1`. The target is read in the declaring script, not the archetype: the archetype's squads point at the outer script's Objective, not at its own. An array of instances, and an instance inside one, take the same map (`{_squad: obj_x, inner: {_squad: obj_y}}`).
- The decorator goes on its own line above the member, like `@member_counts`, and can sit with the other member decorators in any order.
- The squad has the Objective from the world entry on. A script that calls `set_objective()` on the squad overrides it.
- It also decides which squads the Objective's tasks walk: the AI assigns each squad its task's influencer from the first task that admits it.

### What an Objective's tasks admit

An Objective's task tree (names, influencers, priority, capacity, children) is in the packages. What release dropped is which squads a task admits and what gates it, so a script writes both with a `@task` per task, on the Objective's declaration:

```python
@task("gating", squad: sq_fallen_gating, condition: gating_open)
@task("idle")
objective obj_hangar
```

- The first argument is the task's name, or its `0x<hash>` where the name never cracked. Each task is written once.
- `squad:` takes a `squad` or a `squad_group` member of the script (a path as `@objective` takes): the task admits that squad, or the squads in that group. Left out, it admits any squad.
- `condition:` takes a `bool` member of the script: the task is closed while it is false. Left out, the task is always open.
- On an archetype instance (`simple_encounter simple_north`), `objective:` names the Objective inside it the task is of: `@task("0xA422EB12", objective: _objective, squad: simple_north._squad[0])`. `squad:` and `condition:` still read in the declaring script.
- A task nothing decorates admits any squad and is always open. Its `@task` is only needed to say otherwise.

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

### Hard wipe

When every player of an activity is dead at once, a phase can wipe the activity: the players see the wipe screen, the phase resets and everyone respawns together at the phase's start. Whether a phase may do that is host-only data too (the alpha's phase schemas hold nothing of the sort, and no alpha script calls anything about a wipe), so a phase writes `@hard_wipe()` at the head of its file:

```python
@hard_wipe()
script init():
    pass
```

- It goes on a phase, an `.esp` file; any other file is an error. It is written once, takes no arguments, and sits above the file's first member (and its decorators) with the other head decorators.
- It sets the schema's `hardWipe` flag, which the host reads of the running phase: `hardWipeArmed` is true while an armed phase is the current one, and the host starts the wipe handshake once `allPlayersDead` is true too. A phase without the decorator is never wiped. The activity's `hard_wipe_globals` row (type 34) is sent enabled as an armed phase starts, and disabled as the next one (or the end of the activity) comes.
- `resetCurrentPhase()` is the reset. The phase's threads, its archetypes' and the incident handlers they armed stop, and the phase is built again from its chunk, so its fields begin as they did. Every row the phase and its archetypes wrote since the phase started goes back to what it was when the phase started (a row that was untouched then goes back to untouched); a row's counters only go up (a squad's wave, an object's incarnation and stamps, an objective's reset counter), as the clients take a lower one for stale. An encounter that wrote any row since the phase started is built again and starts from its start, as its threads and bindings would otherwise go on from a world that is gone, so its world goes back to its start too: every row it owns (each row its instances bind, the ones it placed in its `@startup` threads before the phase began and the ones the phase never touched included, and a row the phase wrote as well) goes back to how the host started it, with its counters past what was sent (a seat goes back to state 0, a guess at its idle). Nothing the host holds of those rows outlives the reset (the squads' state, the objects' shared state, what the handles remember of placements, temperaments and drops), and what the clients said of them is forgotten, so the restarted `@startup` threads place, seat and create them afresh. Rows with no state of their own to put back (a timer, a sequence) are left to the sink's idle. Every player trigger the phase or a restarted encounter binds goes out armed afresh (enabled as the reset left it, armed now) and its fire is forgotten: the client fires a trigger once per arming, so one a script only polls would otherwise read as fired from the restart and never fire again. The restarted threads and the phase's `init` and `main` start on the next ticks, after all of it has been sent. Then the phase starts from `init`, as it did the first time.
- What it leaves: the lifetime and the scoreboard, a script's own fields outside the phase and the encounters it restarts, and what the clients report of where their players stand.
- Like the other decorators its line is not a line of the script (see Line numbers): a chunk is the same with or without it.

## Members

A member is declared on its own line: its type, its name, and optionally a starting value.

```python
int waves_left = 3
bool boss_spawned = false
string_hash music = "boss_theme"
squad sq_boss
```

- **Basic types:** `int`, `short`, `real` (a number with a fraction), `bool`, `string`, `string_hash`, `vector2d`, `vector3d`, `vector4`.
- **Engine types:** most members are game objects, like `squad` or `simple_encounter`. Their type decides which natives you can call on them. A native type is written short, without the engine class name's `c_` and `_sensor_host`, `_slot_host` or `_host` ending: `squad` for the engine's `c_squad_sensor_host` (NATIVES.md lists them all). Every type a member names, inside a list too, has to be a basic type, a native type or a class, struct or enum of the project. Any other name is a compile error, `unknown type 'c_squad_sensor_host'`, and for an engine class name it says the spelling to write.
- **Lists:** `static_array<T, N>` and `T[N]` hold a fixed number of items, and `table<K, V>` maps keys to values. `dynamic_array<T>` holds a variable number, which the bundle decides for each copy of the class: one `simple_encounter` gets one squad, another gets three.
- **Starting values:** numbers, `true`/`false`, `"text"`, vectors as `(x, y, z)`, and enum values like `e_state.idle`. Without one, numbers start at `0` and bools at `false`.

Two optional extras:

- **`static`** in front of a member shares it between every copy of the class, like a static in C++.
- **`bind(...)`** after a member connects it to another one when the script loads: `pt_x bind(tv_x)`. A string binds an identifier by its authored name, which the host hashes with FNV-1: an objective and the placement it unlocks share one (`bind("vex_block")`). A name never cracked is written as its hash, `bind("0x8C8D186C")`.

**Rows are declared by hand.** Every squad, objective or trigger a script uses has its own member line. The bundle's rows were made to match the script, not the other way round, so some declared rows are never used by the code. A squad's individual actors are declared as `<squad>__<actor>`.

Not every row in a bundle belongs to its script, and not every member becomes a row:

- **Rows that belong to the world:** firing areas, spawn points, landing points, kill volumes, factions and spawn influencers. The level's tools make them, and scripts never declare them.
- **Members that are not rows:** devices, incident listeners, activity flags, capturables, interactables, player iterators and objective timers. These are engine objects the script owns outright.

**Other encounters.** An `encounter_handle` member reaches the encounter of another bundle in the activity. Name the member after the encounter, because the game fills it in by that name:

```python
encounter_handle enc_engineering_strike1

script main():
    enc_engineering_strike1.sc_engineering_trash.wake()
```

## Scripts

Most of a file's work happens in its scripts: the `script` declarations, each a function that can pause and pick up where it left off. The engine runs each one as a thread, which is the word its natives use for them.

```python
@startup()
script main():
    sq_boss.place()                         # spawn the boss squad
    sleep_until(sq_boss.alive_count() == 0) # wait until it's dead
    wake(reward)                            # start the reward thread

script reward():
    sleep(2)                                # wait two seconds
    objective.set_complete()
```

- A script with `@startup()` above it starts as soon as the class does.
- Any other `script` waits until something calls `wake` on it.
- `@startup()` is a decorator on its own line directly above the `script` (a comment may sit between). It takes no arguments, goes on a script only and is written once. It sets the schema's `autostart` flag. Bungie's thread definition carries this flag in a field named `m_startup`, which the decorator is named after. Like the other decorators, its line is not a line of the script (see Line numbers), and a comment directly above the decorator goes with it, so a comment that describes the script goes under the decorator.
- A script takes no arguments, but its parentheses are always written. A short one fits on a line: `script init(): pass`.

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

Method and script bodies are Python 2, with four differences:

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
4. Every `@startup()` script starts.

### While it's running

The server runs on a fixed tick. Each tick, every paused thread that's ready to continue (its time is up, or its condition is true) carries on, one after another, until it pauses again. Between ticks, things that happen in the game (kills, triggers, pickups) update what the natives see.

A mission's phases (`.esp` files) all load at the start, but only one runs at a time. The next one starts when the current phase's `main` script finishes.

The activity's root script declares each phase as a member, in the order they run: the mission's class as the type, the bundle's phase row as the name (`venus_strike_1_mission1 engineering_phase`). A mission's members are that phase's rows (`engineering_phase.utils`). A mission the root does not declare never runs.

The same goes for every other script a class uses: a member declared with a script class (`u_globals utils`, `c_pvp_controller pvp_controller`) is that class's instance inside this one, whether or not the bundle has a row for it.

### Things to watch for

- **Scripts take turns.** Only one runs at a time, and nothing interrupts it. A script that never pauses holds up every other script.
- **An error stops only its own script.** The rest of the activity carries on.
- **Numbers are 32-bit floats,** like C's `float`. Fractions and very large numbers are less precise than in Python.

## Compiling and editor support

To compile scripts or set up syntax highlighting, see the [README](README.md).

## What Bungie's source looks like

Everything above is rebuilt from compiled chunks. The only source Bungie wrote that we have seen is three code images in a Destiny 2 talk, "Destiny 2: Weaving Music between Activities and the Open World" (GDC 2024, Kugler and Konner). It is a decade newer than the alpha and it is D2's flavour of the language, but it is the same language, and it is where `script name():` comes from.

Page 15 of the slides is Bungie's script editor, open on `phase_crd_892_vib_cinematic.es`, a cutscene phase. The whole file, indented with tabs (the editor draws them as `»`):

```python
# Script generated from content\common\grognok\scripts\phase_template.txt
# These two lines make the script inherit from the bs defined phase script so that you can use the
# utility functions it provides. They're required. Don't change them.
using "bs/activities/common/phase_script.bs"
extends phase_script

bool b_proceed = false

audio_event cine_892_music = "cin_892_vib_music_800"

# The main script thread is started when the phase starts. The phase will end when the thread exits.
script main():
	print("phase cine_crd_892_vib_cinematic_phase started.")
	cin_891_crd.play()
	sleep_until(cin_891_crd.is_playing() == false)
	sleep(1)
	cin_892_vib.play()
	music_emitter = ae_audio_player.post_event(cine_892_music)
	music_emitter.set_switch("scary_ambience_switch", "on")
	sleep(0.5)

	cinematic_watcher.run()

	#sleep_until(cin_892_vib.is_playing() == false)
	sleep_until(b_proceed == true)
	music_emitter.stop()

	print("phase cine_crd_892_vib_cinematic_phase ended.")

script cinematic_watcher():
	while (b_proceed != true):
		if (cin_892_vib.is_playing()):
			sleep(0.1)
		else:
			b_proceed = true
```

Beside the code, the editor's Code Snippets panel lists `ACTIVITY.OPTION` (`bool`, `integer`, `real`), `INCIDENT.SUBMIT` (`none`, `player`), `COMMENTS` (`Section Header`) and a `CONTENT STYLE GUIDE` (`Add Spaces Around All Operators`, `Avoid Magic Numbers`, `Comments - General`, `Comments - No Block Comments`). Below it is an Errors and Warnings panel. The option snippets line up with the alpha's `get_activity_option_bool` and `get_activity_option_integer` natives; `real` is new.

Pages 23 to 26 build up another phase, `phase_alpha_02`. This is its top and first stretch of `main`, as far as the second music cue:

```python
# music_section is an aliased string, representing the section in the score to activate/deactivate
music_section encounter_01_clear
music_section catwalk_traversal

# The main script thread is started when the phase starts. The phase will end when the thread exits.
script main():
	print("phase phase_alpha_02 started.")
	pflg_phase_alpha_02_started.set_flag()

	# Music section activated with player filter volume
	# mu_music_bossroom_exit is a variable that represents the music player managed by the filter
	mu_music_bossroom_exit.activate_section(catwalk_traversal)

	pd_encounter_1_fight.clear_all_waypoints()
	sleep_until(eflg_end_encounter.is_flag_set())

	darkness.force_lightness()
	pd_goto_skatepark.activate()
	pd_goto_skatepark.activate_waypoint(p_exit_warehouse)

	# Music section activated for everyone
	# mu_music is a variable that represents the global music player for the phase
	mu_music.activate_section(encounter_01_clear)
```

Pages 48 to 50 have a third snippet, with `main():` and no `script` in front. That is slide pseudo-code, so it is not evidence of the syntax.

### What already matched

- `#` comments.
- Typed member lines with starting values: `bool b_proceed = false`, `audio_event cine_892_music = "cin_892_vib_music_800"`.
- Members used by name alone, with no `self`.
- Locals assigned without a type: `music_emitter = ae_audio_player.post_event(cine_892_music)`.
- `print`, `sleep` and `sleep_until`.
- `while`, `if` and `else` with colons and indentation, and optional parentheses around the condition.
- Natives called as methods: `cin_891_crd.play()`, `eflg_end_encounter.is_flag_set()`.

What the slides changed is the declaration. We used to write `thread main:`; Bungie writes `script main():`, so that is the only form we accept. A startup script is that same declaration with `@startup()` above it. The parentheses are always written, even though a script takes nothing. There is no `thread` spelling left.

The type names went the same way. Sources used to write the engine's class names (`c_squad_sensor_host sq_x`); they now write the short names Bungie's source evidently used, which drop the `c_` and the `_sensor_host`, `_slot_host` or `_host` ending (`squad sq_x`). The slides write `bool`, `audio_event` and `music_section`, and Bungie's own utility scripts name members after the type they hold (`_squad`, `_trigger_volume`, `_player_objective`). The engine's class name stays on record in NATIVES.md and in the compiler's native type table. A name compiled scripts import (`c_player_script_iterator`, `c_player_datum`, the `c_*_utilities` libraries) keeps its `c_`, and so do the base classes and `c_command_script`, since `command_script` is a keyword.

### How Destiny 2 differs from the alpha

- **Startup is data, and `@startup()` is our spelling of it.** The alpha's schemas flag each script as startup or not (our compiler writes the flag as `autostart`), so startup scripts are Bungie's, not a convenience of ours. 44 alpha files have them: 36 `.es`, 6 `.esu` and 2 `.esp`, 8 of those with two and 3 with three. A phase's `main` is not one: the phase starts it, as the D2 comment says. But two phases also have a startup script beside `main` (`venus_chapter_2_mission3.esp`'s `startup` and `venus_chapter_2_mission4.esp`'s `startup_phase04`), running alongside `init` and `main`, so `main` cannot stand in for them. The slides do not show how Bungie wrote one, so the spelling is our guess. We write it as a decorator named after the flag's field: the alpha's tag strings include `sc_main_thread.m_startup`, and the flag is the byte after the name hash in the thread definition default (type `0x80800472`). It is not a keyword, and there is no `startup script` spelling.
- **D1 has `wake`, D2 shows `run`.** The alpha starts a script with `t.wake()` and nothing else, in `.bs`, `.es`, `.esp` and `.esu` alike, and controls one with `restart`, `kill`, `is_running`, `is_finished` and `sleep_forever`. The only `run()` in the alpha is `pvp_controller.run()`, a method `c_pvp_controller.bs` writes itself (`def run(): game_thread.wake(); sleep(0.5)`). D2's `cinematic_watcher.run()` is a script in the same file, so by D2 a script has `run` of its own: either a rename of `wake` or an addition, perhaps grown out of that pattern. No D1 build calls `run` on a script, so we do not have one.
- **Inheritance is explicit in D2.** An alpha phase or encounter is built on a native class without saying so: every `.es` class in the alpha has `c_encounter` as its parent, every `.esp` has `c_mission_phase` and every `.esu` has `c_activity_script`. None extends a `.bs` class. D2 moved the phase base into a `.bs` class, `phase_script`, so its files open with `using "bs/activities/common/phase_script.bs"` and `extends phase_script`. Our grammar has neither line for `.es` files, and nothing in the alpha uses either. The engine resolves inheritance from the schemas, which keep a class's parent link beside a list of every member it inherits, so `extends X` corresponds to the schema's parent and `using` to the import that makes `X` known. `using` leaves no trace we can tell from an automatic import: a chunk's imports are fully explained by the names its code uses, plus our import registry.
- **Shared utilities.** The alpha reaches them by composition, with a member: `u_globals utils` in 17 classes. D2 reaches them by inheritance, through the "utility functions" `phase_script` provides.

### Style

The CONTENT STYLE GUIDE snippets name two rules our sources follow: spaces around every operator (`b_proceed == true`, `cin_892_vib.is_playing() == false`) and no block comments, only `#` lines (the language has no other kind). A third, "Avoid Magic Numbers", asks for a named member in place of a bare number; we do not enforce it.

## How sure are we?

The compiled alpha scripts give away a lot: member names and types, every statement and the line it was on, the text of every `sleep_until` condition, and the order of every member. Some things leave no trace in the compiled output, like the exact spelling of `def`, `delegate`, `command_script` and `static`, how a startup script is marked, the short names of the native types, and comments. Those are our best guess. `script` is the one keyword a Bungie slide confirms, from Destiny 2, in the section above.
