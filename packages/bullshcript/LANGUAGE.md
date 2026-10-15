# BungieScript

Destiny's missions, strikes and public spaces are driven by scripts that run on Bungie's servers. Bungie wrote them in their own language, which the engine calls `bs`. This document describes that language as best we can reconstruct it.

There are two names for it:

- **BungieScript** (`.bs` files) is used for libraries and shared classes.
- **EncounterScript** (`.es`, `.esp`, `.esu` files) is the same language, used for encounters and missions.

Bungie's original source code is lost. What survives is the compiled output in an early alpha build of Destiny. From that we've rebuilt the language, and we check our work by compiling our version of the alpha's scripts and comparing the result with Bungie's. They match.

## A few terms

- **Activity:** a mission, strike, patrol or other playable space.
- **Bundle:** the data for one part of an activity: its squads, objectives, triggers, loot and so on. Each bundle has a script.
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
- **Lists:** `static_array<T, N>` and `T[N]` hold a fixed number of items, `dynamic_array<T>` a variable number, and `table<K, V>` maps keys to values.
- **Starting values:** numbers, `true`/`false`, `"text"`, vectors as `(x, y, z)`, and enum values like `e_state.idle`. Without one, numbers start at `0` and bools at `false`.

Two optional extras:

- **`static`** in front of a member shares it between every copy of the class, like a static in C++.
- **`bind(...)`** after a member connects it to another one when the script loads: `pt_x bind(tv_x)`. A string binds an identifier by its authored name, which the host hashes with FNV-1: an objective and the placement it unlocks share one (`bind("vex_block")`). A name never cracked is written as its hash, `bind("0x8C8D186C")`.

**Rows are declared by hand.** Every squad, objective or trigger a script uses has its own member line. The bundle's rows were made to match the script, not the other way round, so some declared rows are never used by the code. A squad's individual actors are declared as `<squad>__<actor>`.

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

## How scripts run

### When an activity starts

1. The server loads the script for every bundle in the activity.
2. Each class gets a fresh copy, with every member at its starting value.
3. Members are connected to their bundle rows, then `user_import()` runs if there is one.
4. Every `startup thread` starts.

### While it's running

The server runs on a fixed tick. Each tick, every paused thread that's ready to continue (its time is up, or its condition is true) carries on, one after another, until it pauses again. Between ticks, things that happen in the game (kills, triggers, pickups) update what the natives see.

A mission's phases (`.esp` files) all load at the start, but only one runs at a time. The next one starts when the current phase's `main` thread finishes.

The activity's root script names each phase with a member: the mission's class as the type, the bundle's phase row as the name (`venus_strike_1_mission1 engineering_phase`). A mission's members are that phase's rows (`engineering_phase.utils`). A mission the root does not name is `phaseNN` by its number (`mission1` is `phase00`).

### Things to watch for

- **Threads take turns.** Only one runs at a time, and nothing interrupts it. A thread that never pauses holds up every other thread.
- **An error stops only its own thread.** The rest of the activity carries on.
- **Numbers are 32-bit floats,** like C's `float`. Fractions and very large numbers are less precise than in Python.

## Compiling and editor support

To compile scripts or set up syntax highlighting, see the [README](README.md).

## How sure are we?

The compiled alpha scripts give away a lot: member names and types, every statement and the line it was on, the text of every `sleep_until` condition, and the order of every member. Some things leave no trace in the compiled output, like the exact spelling of `def`, `thread`, `startup`, `delegate`, `command_script` and `static`, and comments. Those are our best guess.
