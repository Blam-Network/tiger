# BungieScript natives

A native is a function the Destiny engine provides instead of one written in a script, like spawning a squad or reading a timer. This page lists every native that BungieScript scripts call, grouped by what they are called on: builtins first, then the calls every script class has, then one section for each kind of engine object, then libraries, lists and the sandbox classes. The names come from Bungie's compiled scripts and schemas; the explanations are ours, worked out from how the scripts use each call, and the ones inferred from the name alone start with "Likely".

A member's type is written short: `squad`, `object`, `trigger_volume`. Each section below gives that name and, beside it, the engine's class name for the type (`c_squad_sensor_host`); [Type names](#type-names) lists them all and says which of the class names are Bungie's and which are our guess. The rule is to drop the `c_` and the `_sensor_host`, `_slot_host` or `_host` ending. The evidence is Bungie's own scripts: the members of their utility scripts are named after the type they hold (`_squad`, `_trigger_volume`, `_player_objective`, `_device`, `_object_filter`, `_nav_point`, `_player_trigger`, `_incident_listener`, `_activity_flag`, `_interactable`, `_incoming_sequence`), and the Destiny 2 slides of their script editor write types short too (`bool`, `audio_event`, `music_section`). A class that compiled scripts import by name, like `c_player_script_iterator` and the `c_*_utilities` libraries, keeps its name, as do the sandbox classes and `c_command_script` (`command_script` is a keyword).

How to read the tables:

- **Called as** shows what a call looks like, with parameter names guessed from the scripts. A name on the left of the dot (`sq`, `po`) stands for any member of that type.
- **`import_only_bind`** and the other `import_only_` calls wire a member to its bundle row while the script loads. They are not for use during play.
- Time is in seconds. Hashes (`string_hash`) name incidents, audiences and activity options.

## Contents

- [Builtins](#builtins)
- [Waiting and threads](#waiting-and-threads)
- [Command script orders](#command-script-orders)
- [Every script class](#every-script-class)
- [Mission phases](#mission-phases)
- [Encounters](#encounters)
- [Encounter manager](#encounter-manager)
- [Squads](#squads)
- [Squad groups](#squad-groups)
- [Squad members](#squad-members)
- [Objects](#objects)
- [Object filters](#object-filters)
- [Devices](#devices)
- [Interactables](#interactables)
- [Capturables](#capturables)
- [Trigger groups](#trigger-groups)
- [Player triggers](#player-triggers)
- [Player monitors](#player-monitors)
- [Safe zones](#safe-zones)
- [Location sensors](#location-sensors)
- [Trigger volumes](#trigger-volumes)
- [Hop-ons](#hop-ons)
- [Player objectives](#player-objectives)
- [Objectives](#objectives)
- [Common references](#common-references)
- [Sequences](#sequences)
- [Timers](#timers)
- [Objective timers](#objective-timers)
- [Lifetime](#lifetime)
- [Cinematics](#cinematics)
- [Loot](#loot)
- [Fireteams](#fireteams)
- [Activity flags](#activity-flags)
- [Factions](#factions)
- [Encounter bindings](#encounter-bindings)
- [Health sensors](#health-sensors)
- [New mission notices](#new-mission-notices)
- [Performances](#performances)
- [Incident listeners](#incident-listeners)
- [Incident player iterators](#incident-player-iterators)
- [Player iterators](#player-iterators)
- [Player sensors](#player-sensors)
- [Scoreboard](#scoreboard)
- [Libraries](#libraries)
- [Lists and containers](#lists-and-containers)
- [Sandbox classes](#sandbox-classes)
- [Type names](#type-names)

## Builtins

These work anywhere in a script, with no member in front of them.

| Native | Called as | What it does |
|---|---|---|
| `print` | `print(message, ...)` | Writes the values to the activity's log. |
| `assert` | `assert(condition, message)` | Stops the running thread with the message if the condition is false. |
| `len` | `len(list)` | Returns how many items are in a list. |
| `range` | `range(count)` or `range(start, stop)` | Counts for a `for` loop, from `start` (or 0) up to one below `stop`. |
| `pick_random_count` | `pick_random_count(count, a, b, c)` | In a `for` loop, goes through `count` different values picked at random from the ones listed. |
| `format` | `"text %d".format(value, ...)` | Fills the `%d` and `%s` holes in a piece of text with the values and returns the result. |
| `schema` | `schema(instance)` | Returns the type an instance was made from. |
| `allocate` | `allocate(type)` | Makes a new, empty instance of a struct type. |
| `is_instance` | `is_instance(value, type)` | True if the value was made from that type. |
| `enum_to_int` | `enum_to_int(enum_value)` | Turns an enum value into its number. |
| `vector4` | `vector4(x, y, z, w)` | Makes a four-part vector. |
| `event_message` | `event_message(text)` | Writes a message to the game's event log. |
| `event_warning` | `event_warning(text, value, ...)` | Writes a warning to the event log; `%s` holes in the text are filled from the values. |
| `event_error` | `event_error(text)` | Writes an error to the event log. |

## Waiting and threads

`sleep`, `sleep_until` and `sleep_until_timeout` pause the thread that calls them. The others act on a thread member, either as `wake(thread)` or as `thread.wake()`. Time is in seconds.

| Native | Called as | What it does |
|---|---|---|
| `sleep` | `sleep(seconds)` | Pauses the thread for that long; anything under half a second is rounded up to half a second. |
| `sleep_until` | `sleep_until(condition, period)` | Pauses until the condition is true, checking it every `period` seconds (once a second if you leave `period` out). |
| `sleep_until_timeout` | `sleep_until_timeout(condition, timeout)` | Pauses until the condition is true or `timeout` seconds have passed, checking once a second; the thread carries on either way, so test the condition afterwards. |
| `sleep_forever` | `thread.sleep_forever()` | Puts a thread to sleep until something wakes it. |
| `wake` | `wake(thread)` or `thread.wake()` | Starts a thread that is waiting to be started. |
| `restart` | `restart(thread)` or `thread.restart()` | Starts a thread again from the top. |
| `kill` | `kill(thread)` or `thread.kill()` | Stops a thread. |
| `is_running` | `thread.is_running()` | True while the thread has been started and has not finished. |
| `is_finished` | `thread.is_finished()` | True once the thread has finished or been killed. |

## Command script orders

Inside a `command_script` each line is an order for an AI to carry out in turn. Nothing runs when the script is written; the orders are handed to an AI with `execute`. A point is given as a path and the number of a point along it.

| Native | Called as | What it does |
|---|---|---|
| `ability` | `ability(name, argument)` | Has the AI use a named ability, such as a dropship's entry or exit move. |
| `face` | `face(path, index)` | Turns the AI to face a point on a path. |
| `follow_path` | `follow_path(path)` | Walks the AI along every point of a path. |
| `move_to` | `move_to(path, index, stop)` | Moves the AI to a point on a path; `stop` says whether it comes to a halt there. |
| `point_targeted_ability` | `point_targeted_ability(name, argument, path, index)` | Uses a named ability aimed at a point on a path, such as a teleport. |
| `set_channel_scalar` | `set_channel_scalar(channel, value)` | Sets a named channel, such as a dropship's doors, to a value. |
| `set_flag` | `set_flag(which, value)` | Sets one of the order flags; dropship scripts set flag 3 to 3 around their moves, and what the flags do is not known. |
| `sleep` | `sleep(seconds)` | Makes the AI wait. |
| `snap_to` | `snap_to(path, index)` | Puts the AI straight onto a point of a path, with no movement. |
| `terminate_delay` | `terminate_delay(seconds)` | Ends the previous order after that long. |
| `terminate_immediate` | `terminate_immediate()` | Ends the previous order straight away. |

### Building orders in code (`c_command_script`)

A list of orders can also be built in ordinary code. Each call adds one order to the end of the list, and the finished builder is given to `execute` like a command script.

| Native | Called as | What it does |
|---|---|---|
| `ability` | `cs.ability(name, argument)` | Adds an order to use a named ability. |
| `clear` | `cs.clear()` | Throws away every order added so far. |
| `move_to` | `cs.move_to(path, index, stop)` | Adds a move to a point on a path. |
| `scripted_sequence` | `cs.scripted_sequence(sequence)` | Adds an order to play a scripted sequence. |
| `set_channel_scalar` | `cs.set_channel_scalar(channel, value)` | Adds an order to set a named channel to a value. |
| `snap_to` | `cs.snap_to(path, index)` | Adds an order to jump straight onto a point of a path. |

## Every script class

Every script class inherits these, whatever it is built on. The activity options are the settings an activity was started with, such as a time limit or a PvP game type; each one is named by a string hash.

| Native | Called as | What it does |
|---|---|---|
| `get_outer` | `get_outer()` | Returns the script that contains this one, such as the activity's main script from inside one of its parts. |
| `get_activity_option_bool` | `get_activity_option_bool(option)` | Reads a true or false setting the activity was started with. |
| `get_activity_option_integer` | `get_activity_option_integer(option)` | Reads a whole-number setting, such as the time limit, that the activity was started with. |
| `get_activity_option_string_hash` | `get_activity_option_string_hash(option)` | Reads a named setting, such as the PvP game type, that the activity was started with. |
| `get_activity_option_bool_array` | `get_activity_option_bool_array(option, index)` | Reads one entry of a list of true or false settings. |
| `get_activity_option_integer_array` | `get_activity_option_integer_array(option, index)` | Reads one entry of a list of whole-number settings. |
| `initialize` | `initialize()` | Called by the engine when the class is created; scripts do not normally call it. |
| `set_activity_complete` | `set_activity_complete()` | Marks the whole activity as finished. |
| `get_current_activity_time` | `get_current_activity_time()` | Returns how long the activity has been running. |

## Mission phases

A mission phase (`.esp`) also has everything in "Every script class".

| Native | Called as | What it does |
|---|---|---|
| `insertion_point` | `insertion_point()` | Likely marks a point in the mission where players who join late can be placed. |
| `is_complete` | `phase.is_complete()` | Likely true once the phase has finished. |

## Encounters

An encounter also has everything in "Every script class".

| Native | Called as | What it does |
|---|---|---|
| `import` | `import()` | Load-time setup, where the encounter's members are connected to the bundle's rows. Write `user_import` to add your own. |
| `initialize` | `initialize()` | Called by the engine when the encounter starts. |

## Encounter manager

`encounter_manager` (engine class `c_encounter_manager`) keeps ambient encounters running in the background without using up more AI than the level can take. The budget is set by assigning `encounters.actor_budget = 11`, which is a field and not a call. Each encounter has a cost counted against the budget.

| Native | Called as | What it does |
|---|---|---|
| `add_ambient_encounter` | `encounters.add_ambient_encounter(encounter, cost, a, b, cooldown, first_wait)` | Hands an encounter to the manager, which starts and stops it as the budget allows. The two numbers after the cost are not understood; the last two are likely a cooldown and a first delay. |
| `add_unmanaged_encounter` | `encounters.add_unmanaged_encounter(encounter, cost)` | Likely registers an encounter whose cost counts against the budget but that scripts start themselves. |
| `add_exclusion` | `encounters.add_exclusion(encounter, other)` | Stops the two encounters from running at the same time. |
| `suppress_encounter` | `encounters.suppress_encounter(encounter, suppressed)` | Turns a managed encounter off (`true`) or lets it run again (`false`). |

## Squads

`squad` (engine class `c_squad_sensor_host`) is one squad of AI. Placing it spawns its members.

| Native | Called as | What it does |
|---|---|---|
| `place` | `sq.place()` | Spawns the squad's members: the bodies its `@member_counts` give each (LANGUAGE.md), else one per member. |
| `respawn` | `sq.respawn()` | Brings the squad back up to the number that were placed, replacing members that died. |
| `remove` | `sq.remove()` | Takes the squad's members out of the game. |
| `kill` | `sq.kill()` | Kills the squad's members. |
| `alive_count` | `sq.alive_count()` | Returns how many of the squad's members are alive. |
| `count_at_firing_area` | `sq.count_at_firing_area()` | Likely returns how many members have reached their firing area, the spot they fight from. |
| `activate_temperament` | `sq.activate_temperament(name)` | Turns on a named temperament, a behavior mode for the AI such as `"temper_freeze"`. |
| `deactivate_temperament` | `sq.deactivate_temperament(name)` | Turns a named temperament off again. |
| `set_objective` | `sq.set_objective(objective)` | Gives the squad an AI objective to work towards. |
| `set_task` | `sq.set_task(task)` | Puts the squad under a named task of its objective, such as `"tank"`. |

## Squad groups

`squad_group` (engine class `c_squad_group_sensor_host`) is a set of squads that can be placed, counted and removed together.

| Native | Called as | What it does |
|---|---|---|
| `add_child` | `group.add_child(squad)` | Adds a squad to the group. |
| `place` | `group.place()` | Places every squad in the group. |
| `respawn` | `group.respawn()` | Respawns every squad in the group. |
| `remove` | `group.remove()` | Takes every squad in the group out of the game. |
| `kill` | `group.kill()` | Kills every member of every squad in the group. |
| `alive_count` | `group.alive_count()` | Returns how many members of the group are alive. |
| `max_count` | `group.max_count()` | Returns how many members the group has when it is at full strength. |
| `count_at_firing_area` | `group.count_at_firing_area()` | Likely returns how many members of the group have reached their firing areas. |
| `activate_temperament` | `group.activate_temperament(name)` | Turns on a named temperament for every squad in the group. |
| `deactivate_temperament` | `group.deactivate_temperament(name)` | Turns a named temperament off for every squad in the group. |

## Squad members

`squad_member` (engine class `c_squad_member_sensor_host`) is one named AI in a squad. A squad's members are declared as `<squad>__<member>`. Dropship pilots are members too.

| Native | Called as | What it does |
|---|---|---|
| `place` | `member.place()` | Spawns this member. |
| `remove` | `member.remove()` | Takes this member out of the game. |
| `is_alive` | `member.is_alive()` | True while the member is alive. |
| `is_bound` | `member.is_bound()` | Likely true once the member has an AI to control. |
| `execute` | `member.execute(command_script)` | Gives the member a command script to carry out. |
| `abort_command_script` | `member.abort_command_script()` | Stops the member's command script. |
| `get_command_script_state` | `member.get_command_script_state()` | Returns whether the command script is still executing; compare it with `e_command_script_state.executing`. |
| `drop_squad` | `pilot.drop_squad(squad)` | Has this member, a dropship pilot, deliver a squad to the ground. |
| `is_dropping` | `pilot.is_dropping()` | True while a drop is under way. |
| `activate_temperament` | `member.activate_temperament(name)` | Turns on a named temperament for the member. |
| `set_channel_scalar` | `member.set_channel_scalar(channel, value)` | Sets a named channel, such as a warp gate's `"activate"`, to a value. |
| `set_blind` | `member.set_blind(true)` | Stops the member seeing players until set back to `false`, as Sepiks Prime while his guards stand. |
| `set_deaf` | `member.set_deaf(true)` | Stops the member reacting to sounds and shots until set back to `false`. |

## Objects

`object` (engine class `c_object_sensor_host`) is a placed object, such as a console, a door or a capture zone.

| Native | Called as | What it does |
|---|---|---|
| `create` | `obj.create()` | Brings the object into the world. |
| `create_anew` | `obj.create_anew()` | Likely makes a fresh copy of the object even if one already exists. |
| `delete_object` | `obj.delete_object()` | Removes the object from the world. |
| `is_alive` | `obj.is_alive()` | True while the object exists and has not been destroyed. |
| `get_device_position` | `obj.get_device_position()` | Returns how far a moving object, such as a door, has opened. |
| `set_device_position` | `obj.set_device_position(position)` | Moves a moving object to a position from 0 to 1. |
| `import_identifier` | `obj.import_identifier()` | Returns the name the object's row was authored with. |
| `import_only_bind` | `obj.import_only_bind(identifier)` | Connects the member to the row with that identifier. This is load-time wiring and not something to call during play. |
| `set_enabled_player_filter` | `obj.set_enabled_player_filter(filter)` | Lets only the players who pass the filter use the object. |

## Object filters

`object_filter` (engine class `c_object_filter_sensor_host`) is a set of objects or players that triggers, zones and interactables use to decide who counts.

| Native | Called as | What it does |
|---|---|---|
| `add` | `filter.add(object)` | Adds an object, or every member of a squad, to the filter. |
| `remove` | `filter.remove(object)` | Takes an object out of the filter. |
| `clear` | `filter.clear()` | Empties the filter. |
| `add_combatant_type` | `filter.add_combatant_type(type)` | Adds every combatant of a type, such as a Vex warpgate. |
| `add_players_on_team` | `filter.add_players_on_team(team)` | Adds the players on a PvP team. |
| `add_players_with_activity_flag` | `filter.add_players_with_activity_flag(flag)` | Adds the players who have an activity flag set. |

## Devices

`device` (engine class `c_device_host`) is a moving object, like a door or a gate.

| Native | Called as | What it does |
|---|---|---|
| `get_device_position` | `device.get_device_position()` | Returns how far the device has moved, from 0 to 1. |
| `set_device_position` | `device.set_device_position(position)` | Moves the device to a position from 0 to 1. |
| `import_only_bind` | `device.import_only_bind(object)` | Connects the device to its object. This is load-time wiring. |

## Interactables

`interactable` (engine class `c_interactable_host`) is an object players can use. By default nobody can until you enable it.

| Native | Called as | What it does |
|---|---|---|
| `enable_all_players` | `interactable.enable_all_players()` | Lets every player use it. |
| `set_enabled_player_filter` | `interactable.set_enabled_player_filter(filter)` | Lets only the players who pass the filter use it. |
| `set_disabled_player_filter` | `interactable.set_disabled_player_filter(filter)` | Lets everyone except the players who pass the filter use it. |
| `is_active` | `interactable.is_active()` | True once a player has used it since it was last cleared. |
| `get_active` | `interactable.get_active()` | The same as `is_active`. |
| `clear` | `interactable.clear()` | Forgets that it was used and turns it off until it is enabled again. |
| `import_only_bind` | `interactable.import_only_bind(object)` | Connects the interactable to its object. This is load-time wiring. |

## Capturables

`capturable` (engine class `c_capturable_host`) is a capture zone, such as a PvP Dominion point.

| Native | Called as | What it does |
|---|---|---|
| `get_capture_progress` | `zone.get_capture_progress()` | Returns how far the zone has been captured. |
| `get_owner_team_index` | `zone.get_owner_team_index()` | Returns the team that holds the zone, or -1 for nobody. |
| `is_captured` | `zone.is_captured()` | True once a team has captured it. |
| `lock` | `zone.lock()` | Stops the zone from being captured. |
| `unlock` | `zone.unlock()` | Lets the zone be captured again. |
| `reset` | `zone.reset()` | Clears the zone's owner and progress. |
| `set_filter` | `zone.set_filter(filter)` | Only players who pass the filter count as being inside the zone. |
| `set_icon_index` | `zone.set_icon_index(index)` | Picks which icon the zone shows. |
| `import_only_bind` | `zone.import_only_bind(object)` | Connects the capturable to its object. This is load-time wiring. |

## Trigger groups

`trigger_group` (engine class `c_trigger_group_host`) switches a set of triggers on and off together.

| Native | Called as | What it does |
|---|---|---|
| `activate` | `group.activate()` | Turns the group's triggers on. |
| `deactivate` | `group.deactivate()` | Turns the group's triggers off. |

## Player triggers

`player_trigger` (engine class `c_player_trigger_sensor_host`) fires when a player walks into a trigger volume. It fires once each time it is armed.

| Native | Called as | What it does |
|---|---|---|
| `is_triggered` | `trigger.is_triggered()` | True if a player has entered since the trigger was last armed. |
| `reset` | `trigger.reset()` | Arms the trigger again so it can fire. |
| `enable` | `trigger.enable()` | Arms the trigger. |
| `disable` | `trigger.disable()` | Disarms the trigger so it cannot fire. |
| `set_handler` | `trigger.set_handler(handler)` | Runs the given method each time the trigger fires. |
| `import_only_bind` | `trigger.import_only_bind(volume)` | Connects the trigger to its volume. This is load-time wiring. |

## Player monitors

`player_monitor` (engine class `c_player_monitor_sensor_host`) counts the players inside a volume.

| Native | Called as | What it does |
|---|---|---|
| `get_count` | `monitor.get_count()` | Returns how many players are inside. |
| `test_any_inside` | `monitor.test_any_inside()` | True if at least one player is inside. |
| `set_filter` | `monitor.set_filter(filter)` | Only players who pass the filter are counted. |

## Safe zones

`safe_zone` (engine class `c_safe_zone_sensor_host`) watches for objects, such as the ball in the City Tower, inside a volume.

| Native | Called as | What it does |
|---|---|---|
| `any_objects_are_inside` | `zone.any_objects_are_inside()` | True if any object that passes the filter is inside. |
| `set_filter` | `zone.set_filter(filter)` | Chooses which objects the zone looks for. |

## Location sensors

`location` (engine class `c_location_sensor_host`) is a named area of the level, such as `engineering` or `lobby`.

| Native | Called as | What it does |
|---|---|---|
| `is_triggered` | `location.is_triggered()` | True while a player is inside the area. |

## Trigger volumes

`trigger_volume` (engine class `c_trigger_volume_slot_host`) is a volume a trigger or sensor can be bound to.

| Native | Called as | What it does |
|---|---|---|
| `import_only_clear_slice_set_assignment` | `volume.import_only_clear_slice_set_assignment()` | Load-time call that likely clears which slice set the volume belongs to. |

## Hop-ons

Likely an effect attached to an object. The scripts use them for an overshield and for a Vex death effect.


### Hop-on sensors (`hop_on`, engine class `c_hop_on_sensor_host`)

| Native | Called as | What it does |
|---|---|---|
| `set_filter` | `hop_on.set_filter(filter)` | Limits the hop-on to the objects that pass the filter. |
| `clear_filter` | `hop_on.clear_filter()` | Removes the limit, so the hop-on applies to everything. |

### Hop-on patterns (`c_hop_on_pattern`)

| Native | Called as | What it does |
|---|---|---|
| `create_hop_on_on_target` | `pattern.create_hop_on_on_target(target)` | Likely creates the hop-on on the target object. |
| `delete_hop_on` | `pattern.delete_hop_on()` | Removes the hop-on. |

## Player objectives

`player_objective` (engine class `c_player_objective_sensor_host`) is a line in the player's objective list, with an optional progress bar, countdown and waypoint. It moves through stages: incoming, active, then complete or failed. Nav points (`nav_point`, engine class `c_nav_point_host`) have no natives of their own and are only handed to the calls below.

| Native | Called as | What it does |
|---|---|---|
| `activate` | `po.activate()` | Shows the objective; which stage it starts in is not certain. |
| `set_incoming` | `po.set_incoming()` | Shows the objective as incoming, announced but not yet active. |
| `set_active` | `po.set_active()` | Makes the objective active. |
| `set_complete` | `po.set_complete()` | Marks the objective complete. |
| `set_failed` | `po.set_failed()` | Marks the objective failed. |
| `clear` | `po.clear()` | Hides the objective, with its progress bar, countdown and waypoint. |
| `is_active` | `po.is_active()` | True while the objective is active. |
| `set_public_event_tier` | `po.set_public_event_tier(tier)` | Likely sets the medal tier a public event is worth: 0 ribbon, 1 bronze, 2 silver, 3 gold. |
| `nav_point_activate` | `po.nav_point_activate(nav_point)` | Shows a waypoint at a nav point. |
| `nav_point_activate_with_fallback` | `po.nav_point_activate_with_fallback(squad, nav_point)` | Shows a waypoint at a nav point, falling back to the squad's position if that is not usable. |
| `nav_point_clear` | `po.nav_point_clear()` | Removes the waypoint. |
| `progress_activate` | `po.progress_activate(current, max)` | Shows a progress bar with a starting value and a goal. |
| `progress_bind` | `po.progress_bind(object)` | Makes the bar count a squad's, member's or object's live total instead. |
| `progress_update` | `po.progress_update(current)` | Sets how far along the bar is. |
| `progress_get_current` | `po.progress_get_current()` | Returns how far along the bar is. |
| `progress_is_complete` | `po.progress_is_complete()` | True once the bar has reached its goal. |
| `progress_clear` | `po.progress_clear()` | Hides the bar and forgets its values. |
| `timer_activate` | `po.timer_activate(seconds)` | Loads a countdown without starting it. |
| `timer_start` | `po.timer_start()` | Starts or resumes the countdown. |
| `timer_pause` | `po.timer_pause()` | Pauses the countdown. |
| `timer_clear` | `po.timer_clear()` | Removes the countdown. |
| `timer_get_current` | `po.timer_get_current()` | Returns how much time the countdown has left. |
| `timer_is_complete` | `po.timer_is_complete()` | True once the countdown has started and run out. |

## Objectives

`objective` (engine class `c_objective_sensor_host`) is an AI objective: a place or goal squads are sent to. It is not the same as a player objective.

| Native | Called as | What it does |
|---|---|---|
| `add_squad` | `objective.add_squad(squad_group)` | Gives the objective a squad group to work on it. |
| `reset` | `objective.reset()` | Makes the AI treat the objective as new. |

## Common references

`common_reference` (engine class `c_common_reference`) holds any script or row, so a list of them can mix kinds. The calls below are not engine natives: they go on to the script the reference points at, which defines them (the objective scripts define `objective_begin` and friends, a squad reference answers `respawn`).

| Native | Called as | What it does |
|---|---|---|
| `add_squad` | `ref.add_squad(squad_group)` | Forwarded to the objective the reference points at. |
| `is_complete` | `ref.is_complete()` | Forwarded to an objective: true once it is complete. |
| `objective_begin` | `ref.objective_begin()` | Forwarded to an objective script: starts the objective and announces it. |
| `objective_begin_immediate` | `ref.objective_begin_immediate()` | Forwarded to an objective script: starts it without the usual incoming step. |
| `objective_end` | `ref.objective_end()` | Forwarded to an objective script: ends the objective and announces it. |
| `objective_end_silent` | `ref.objective_end_silent()` | Forwarded to an objective script: ends it without announcing. |
| `respawn` | `ref.respawn()` | Forwarded to a squad the reference points at: respawns it. |

## Sequences

`sequence` (engine class `c_sequence_host`) is a piece of audio, dialogue or music that can be started and stopped.

| Native | Called as | What it does |
|---|---|---|
| `start` | `sequence.start()` | Starts playing the sequence. |
| `stop` | `sequence.stop()` | Stops it. |
| `is_done` | `sequence.is_done()` | True once it has finished playing. |
| `set_state` | `sequence.set_state(switch, value)` | Sets a named state of the sequence's audio, such as a music switch. |
| `set_switch_mask` | `sequence.set_switch_mask(mask)` | Sets which of the sequence's audio options are switched on. |
| `import_only_bind` | `sequence.import_only_bind(player_objective, suppression_behavior)` | Connects a dialogue sequence to the objective it belongs to. This is load-time wiring. |

## Timers

`timer` (engine class `c_timer_sensor_host`) is a countdown timer. The lifetime timer of an activity is one of these.

| Native | Called as | What it does |
|---|---|---|
| `reset` | `timer.reset(seconds)` | Sets the time the timer counts down from. |
| `start` | `timer.start()` | Starts the timer. |
| `stop` | `timer.stop()` | Stops the timer. |
| `is_expired` | `timer.is_expired()` | True once the timer has run out. |
| `show_progress_bar` | `timer.show_progress_bar()` | Shows the timer on screen as a progress bar. |
| `hide_progress_bar` | `timer.hide_progress_bar()` | Hides the progress bar. |

## Objective timers

`objective_timer` (engine class `c_objective_timer_host`) is a timer attached to an object, such as a capture pillar.

| Native | Called as | What it does |
|---|---|---|
| `activate` | `timer.activate(seconds)` | Sets the time and turns the timer on. |
| `start` | `timer.start()` | Starts the timer. |
| `stop` | `timer.stop()` | Stops the timer. |
| `is_expired` | `timer.is_expired()` | True once the timer has run out. |
| `get_remaining_time_in_seconds` | `timer.get_remaining_time_in_seconds()` | Returns how much time is left. |
| `set_rate_multiplier` | `timer.set_rate_multiplier(rate)` | Changes how fast the timer runs; `-1` runs it backwards. |
| `import_only_bind` | `timer.import_only_bind(object)` | Connects the timer to its object. This is load-time wiring. |

## Lifetime

`lifetime` (engine class `c_lifetime_sensor_host`) is the activity's own lifecycle: countdown, play, results. Get it with `c_lifetime_script_utilities.get_lifetime_sensor()`.

| Native | Called as | What it does |
|---|---|---|
| `set_state` | `lifetime.set_state(state)` | Moves the activity to a lifetime state from `e_activity_lifetime_state`, such as `countdown`. |
| `allow_join_in_progress` | `lifetime.allow_join_in_progress(allowed)` | Says whether players may join while the activity is already running. |
| `end_game` | `lifetime.end_game(delay)` | Ends the game: shows the results, then sends everyone back after a short wait. The delay is optional. |
| `set_time_of_day` | `lifetime.set_time_of_day(fraction)` | Locks the time of day for everyone, from 0 to 1 through the day. |
| `import_only_bind` | `lifetime.import_only_bind(timer)` | Connects the lifetime to its timer. This is load-time wiring. |

## Cinematics

`cinematic` (engine class `c_cinematic_sensor_host`) is a cutscene.

| Native | Called as | What it does |
|---|---|---|
| `start` | `cinematic.start()` | Plays the cutscene for everyone. |
| `is_done` | `cinematic.is_done()` | True once every player has finished watching it. |

## Loot

`loot` (engine class `c_loot_host`) counts the loot players pick up.

| Native | Called as | What it does |
|---|---|---|
| `get_count` | `loot.get_count()` | Returns how many items have been gathered. |
| `reset` | `loot.reset()` | Sets the count back to zero. |
| `enable` | `loot.enable()` | Starts counting pickups. |
| `disable` | `loot.disable()` | Stops counting pickups. |
| `import_only_bind` | `loot.import_only_bind(identifier)` | Connects the loot to its row. This is load-time wiring. |

## Fireteams

`fireteam` (engine class `c_fireteam_sensor_host`) stands for the players' fireteam.

| Native | Called as | What it does |
|---|---|---|
| `nav_point_clear_all` | `fireteam.nav_point_clear_all()` | Removes every waypoint shown to the fireteam. |
| `t30_hack_bind_host` | `fireteam.t30_hack_bind_host()` | A leftover hack, by its name; it returns true once a player has joined. |

## Activity flags

`activity_flag` (engine class `c_activity_flag`) is a named flag set on players, which filters can then test.

| Native | Called as | What it does |
|---|---|---|
| `activate` | `flag.activate()` | Sets the flag. |
| `clear` | `flag.clear()` | Clears the flag. |
| `is_active` | `flag.is_active()` | True while the flag is set. |
| `import_only_bind` | `flag.import_only_bind(identifier)` | Names the flag. This is load-time wiring. |

## Factions

`faction` (engine class `c_faction_host`) says which side an object is on.

| Native | Called as | What it does |
|---|---|---|
| `set_faction` | `faction.set_faction(faction)` | Puts the object in a faction; 1 makes it hostile to the players. |
| `get_team_index` | `faction.get_team_index()` | Returns the object's PvP team. |
| `set_team_index` | `faction.set_team_index(team)` | Gives the object to a PvP team. |
| `import_only_bind` | `faction.import_only_bind(object)` | Connects the faction to its object. This is load-time wiring. |

## Encounter bindings

`encounter_binding` (engine class `c_encounter_binding_host`) connects a member to a row of the encounter's bundle.

| Native | Called as | What it does |
|---|---|---|
| `get_active` | `binding.get_active()` | Likely true while the bound row is active. |
| `import_identifier` | `binding.import_identifier()` | Returns the name the bound row was authored with. |
| `import_only_bind_object` | `binding.import_only_bind_object(identifier)` | Connects the member to the object row with that identifier. This is load-time wiring. |

## Health sensors

`health` (engine class `c_health_sensor_host`) follows the health of one combatant, such as a boss.

| Native | Called as | What it does |
|---|---|---|
| `bind_combatant` | `health.bind_combatant(member)` | Chooses the combatant to watch. |
| `get_health_fraction` | `health.get_health_fraction()` | Returns the combatant's health as a fraction from 0 to 1. |
| `is_ready` | `health.is_ready()` | True once the combatant exists and can be read. |

## New mission notices

`new_mission` (engine class `c_new_mission_sensor_host`) is the notice that a new mission is available.

| Native | Called as | What it does |
|---|---|---|
| `display` | `notice.display(mission)` | Likely shows the new-mission notice for the given mission. |

## Performances

`performance` (engine class `c_performance_host`) runs a scripted performance on an actor, such as the Ghost's scan.

| Native | Called as | What it does |
|---|---|---|
| `start_performance` | `actor.start_performance(name)` | Has the actor start a named performance. |
| `cue_performance` | `actor.cue_performance(name)` | Sends a named cue to the performance that is running. |

## Incident listeners

An incident is a named event, such as a kill or a capture. A listener counts matching incidents or runs a handler when one happens. Incidents and audiences are named by string hash; see [INCIDENTS.md](INCIDENTS.md). Call `reset` before binding a listener again.


### Generic listeners (`incident_listener`, engine class `c_incident_listener`)

| Native | Called as | What it does |
|---|---|---|
| `bind_hash` | `listener.bind_hash(incident, audience)` | Listens for the named incident, for the players in the named audience. |
| `bind_incident_name_hash` | `listener.bind_incident_name_hash(incident)` | Listens for the named incident. |
| `get_count` | `listener.get_count()` | Returns how many matching incidents have happened. |
| `reset` | `listener.reset()` | Sets the count back to zero. |
| `set_handler` | `listener.set_handler(handler)` | Runs the given method each time a matching incident happens. |

### Kill listeners (`kill_incident_listener`, engine class `c_kill_incident_listener`)

A kill listener counts kills. Each `bind_` call narrows what it counts; anything left unbound matches every kill.

| Native | Called as | What it does |
|---|---|---|
| `bind_incident_name_hash` | `listener.bind_incident_name_hash(incident)` | Only counts the named kind of kill, such as `any_kill` or `destructible_kill`. |
| `bind_audience_hash` | `listener.bind_audience_hash(audience)` | Only counts kills that involve the audience, such as the killer's fireteam. |
| `bind_audience` | `listener.bind_audience(name)` | The same with the audience given as plain text. Bungie marked the text forms as deprecated. |
| `bind_bubble_name_hash` | `listener.bind_bubble_name_hash(bubble)` | Only counts kills inside the named bubble (a part of the level). |
| `bind_bubble_name` | `listener.bind_bubble_name(bubble)` | The same with the bubble given as plain text. |
| `bind_dead_combatant_name_hash` | `listener.bind_dead_combatant_name_hash(name)` | Only counts kills of the named kind of combatant. |
| `bind_dead_combatant_name` | `listener.bind_dead_combatant_name(name)` | The same with the name given as plain text. |
| `bind_object_identifier` | `listener.bind_object_identifier(identifier)` | Only counts kills of the object with that identifier. |
| `bind_squad` | `listener.bind_squad(squad)` | Only counts kills of the squad's members. |
| `bind_squad_identifier` | `listener.bind_squad_identifier(identifier)` | Only counts kills of the squad or squads with that identifier. |
| `get_count` | `listener.get_count()` | Returns how many matching kills have happened. |
| `reset` | `listener.reset()` | Sets the count back to zero. |
| `set_handler` | `listener.set_handler(handler)` | Runs the given method for each matching kill. |

### Engagement listeners (`engagement_incident_listener`, engine class `c_engagement_incident_listener`)

Used by public events to notice when a player starts fighting the event's enemies.

| Native | Called as | What it does |
|---|---|---|
| `bind_squad_identifier` | `listener.bind_squad_identifier(identifier)` | Watches the squad or squads with that identifier. |
| `set_handler` | `listener.set_handler(handler)` | Runs the given method when someone engages. Public events pass their `d_handle_engagement_incident`. |

### Interactable listeners (`interactable_incident_listener`, engine class `c_interactable_incident_listener`)

| Native | Called as | What it does |
|---|---|---|
| `get_count` | `listener.get_count()` | Returns how many times the interactable has been used. |
| `reset` | `listener.reset()` | Sets the count back to zero. |
| `import_only_bind` | `listener.import_only_bind(identifier)` | Connects the listener to an interactable. This is load-time wiring. |

### Capturable listeners (`capturable_incident_listener`, engine class `c_capturable_incident_listener`)

| Native | Called as | What it does |
|---|---|---|
| `get_count` | `listener.get_count()` | Returns how many matching capture incidents have happened. |
| `reset` | `listener.reset()` | Sets the count back to zero. |
| `import_only_bind` | `listener.import_only_bind(identifier)` | Connects the listener to a capturable. This is load-time wiring. |

## Incident player iterators

An `incident_player_iterator` (engine class `c_incident_player_iterator`) walks the players an incident involves. Call `begin`, then loop while `is_valid` is true, and call `next` at the end of every pass. Forgetting `next` makes the loop run forever.

| Native | Called as | What it does |
|---|---|---|
| `begin` | `iterator.begin(incident, audience, metadata)` | Starts a walk over the players the incident's audience names. |
| `is_valid` | `iterator.is_valid()` | True while the iterator is pointing at a player. |
| `get_character_id` | `iterator.get_character_id()` | Returns the current player's character id. |
| `next` | `iterator.next()` | Moves on to the next player. |

## Player iterators

| Native | Called as | What it does |
|---|---|---|
| `begin` | `iterator.begin()` | Starts a walk over the players in the activity. |
| `get_sensor` | `iterator.get_sensor()` | Returns the player sensor for the current player. |

## Player sensors

A player sensor is what `get_player_sensor(character_id)` and a player iterator's `get_sensor()` give you for one player.

| Native | Called as | What it does |
|---|---|---|
| `get_team_index` | `player.get_team_index()` | Returns the player's PvP team. |
| `get_power_level` | `player.get_power_level()` | Returns the player's power level. |
| `is_dead` | `player.is_dead()` | True while the player is dead. |

## Scoreboard

`scoreboard` (engine class `c_scoreboard_host`) holds the scores of a PvP match. Get it with `c_scoreboard_script_utilities.get_scoreboard()`. Most scoring happens through scoreboard rules in the bundle, which turn incidents into points without any script.

| Native | Called as | What it does |
|---|---|---|
| `add_player_score` | `scoreboard.add_player_score(character_id, score, add_to_team)` | Adds to a player's score; with the last argument `true` it counts for the player's team too. |
| `get_leading_team_index` | `scoreboard.get_leading_team_index()` | Returns the team in front, or -1 if no team is. |
| `get_leading_team_score` | `scoreboard.get_leading_team_score()` | Returns the leading team's score. |
| `get_team_stat` | `scoreboard.get_team_stat(stat, team)` | Returns one of a team's stats, such as its dominion zones. |
| `is_tied` | `scoreboard.is_tied()` | True if the top two teams have the same score. |
| `activate_notification_for_team` | `scoreboard.activate_notification_for_team(notification, team)` | Shows a score notification, such as domination, for a team. |
| `clear_notifications` | `scoreboard.clear_notifications()` | Removes every score notification. |

## Libraries

A library is a class with no instances: call its methods on the class name, such as `c_lifetime_script_utilities.get_lifetime_sensor()`.


### `c_lifetime_script_utilities`

| Native | Called as | What it does |
|---|---|---|
| `get_lifetime_sensor` | `c_lifetime_script_utilities.get_lifetime_sensor()` | Returns the activity's lifetime sensor, which controls its countdown, results and ending. |
| `get_lifetime_timer` | `c_lifetime_script_utilities.get_lifetime_timer()` | Returns the timer that counts the activity's lifetime. |

### `c_player_script_utilities`

| Native | Called as | What it does |
|---|---|---|
| `all_players_are_ready` | `c_player_script_utilities.all_players_are_ready()` | True once every player in the activity is ready. |
| `get_player_count` | `c_player_script_utilities.get_player_count()` | Returns how many players are in the activity. |
| `get_ready_player_count` | `c_player_script_utilities.get_ready_player_count()` | Returns how many players are ready. |
| `get_player_sensor` | `c_player_script_utilities.get_player_sensor(character_id)` | Returns the player sensor for one player. |

### `c_scoreboard_script_utilities`

| Native | Called as | What it does |
|---|---|---|
| `get_scoreboard` | `c_scoreboard_script_utilities.get_scoreboard()` | Returns the PvP scoreboard. |

### `c_incident_utilities`

These announce an incident to the rest of the game, which listeners and the scoreboard rules then react to. The incident is always a string hash.

| Native | Called as | What it does |
|---|---|---|
| `submit_incident_hash` | `c_incident_utilities.submit_incident_hash(incident)` | Announces an incident to everyone. |
| `submit_incident_with_team` | `c_incident_utilities.submit_incident_with_team(incident, team)` | Announces an incident that belongs to a team. |
| `submit_incident_with_player` | `c_incident_utilities.submit_incident_with_player(incident, character_id)` | Announces an incident that belongs to a player. |
| `submit_incident_with_metadata` | `c_incident_utilities.submit_incident_with_metadata(incident, metadata)` | Announces an incident again with the details of an earlier one, such as a kill counted as a domination kill. |
| `submit_score_incident` | `c_incident_utilities.submit_score_incident(incident, character_id, score)` | Announces that a player scored, with the amount. |

### `mathlib` and `nativemathlib`

`nativemathlib` is the engine's maths library. `mathlib` is a script class built on it, so everything below works as `mathlib.sqrt(x)`, and it adds its own helpers. The library also provides constants: `full_circle`, `half_circle`, `quarter_circle`, `eighth_circle`, `real_max`, `real_min`, `degrees_to_radians`, `radians_to_degrees` and `log2`. Angles are in radians.

| Native | Called as | What it does |
|---|---|---|
| `pin` | `mathlib.pin(value, min, max)` | Clamps a value so it is not below `min` or above `max`. |
| `import` | `import()` | Runs when the library loads and likely sets up its constants. |
| `abs` | `mathlib.abs(x)` | Returns the size of a number, ignoring its sign. |
| `sqrt` | `mathlib.sqrt(x)` | Returns the square root. |
| `sine` | `mathlib.sine(angle)` | Returns the sine of an angle. |
| `cosine` | `mathlib.cosine(angle)` | Returns the cosine of an angle. |
| `sincos` | `mathlib.sincos(angle)` | Returns the sine and cosine of an angle together. |
| `tangent` | `mathlib.tangent(angle)` | Returns the tangent of an angle. |
| `acos` | `mathlib.acos(x)` | Returns the angle whose cosine is `x`. |
| `asin` | `mathlib.asin(x)` | Returns the angle whose sine is `x`. |
| `atan2` | `mathlib.atan2(y, x)` | Returns the angle of the point `(x, y)`. |
| `log` | `mathlib.log(x)` | Returns the natural logarithm. |
| `log10` | `mathlib.log10(x)` | Returns the base-10 logarithm. |
| `floor` | `mathlib.floor(x)` | Rounds down to a whole number. |
| `ceil` | `mathlib.ceil(x)` | Rounds up to a whole number. |
| `fmod` | `mathlib.fmod(x, y)` | Returns the remainder after dividing `x` by `y`. |
| `frexp` | `mathlib.frexp(x)` | Splits a number into a fraction and a power of two. |
| `ldexp` | `mathlib.ldexp(fraction, exponent)` | Builds a number from a fraction and a power of two. |
| `modf` | `mathlib.modf(x)` | Splits a number into its whole and fractional parts. |
| `angle_within_full_circle` | `mathlib.angle_within_full_circle(angle)` | Wraps an angle into one turn from zero. |
| `signed_angle_within_full_circle` | `mathlib.signed_angle_within_full_circle(angle)` | Wraps an angle into half a turn either side of zero. |
| `random_int` | `mathlib.random_int(limit)` | Returns a random whole number from 0 up to one below `limit`. |
| `nondeterministic_random_int` | `mathlib.nondeterministic_random_int(limit)` | Likely the same, from a random source that is not kept in step between machines. |
| `random_real` | `mathlib.random_real(limit)` | Returns a random number from 0 up to `limit`. |
| `nondeterministic_random_real` | `mathlib.nondeterministic_random_real(limit)` | Likely the same, from a random source that is not kept in step between machines. |
| `random_vector2d` | `mathlib.random_vector2d()` | Returns a random flat vector. |
| `random_vector2d_in_circle` | `mathlib.random_vector2d_in_circle(radius)` | Returns a random point inside a circle. |
| `random_vector3d_in_sphere` | `mathlib.random_vector3d_in_sphere(radius)` | Returns a random point inside a sphere. |
| `random_vector3d_in_cone` | `mathlib.random_vector3d_in_cone(direction, angle)` | Returns a random direction inside a cone. |
| `random_vector3d_direction` | `mathlib.random_vector3d_direction()` | Returns a random direction. |
| `eval_piecewise_linear` | `mathlib.eval_piecewise_linear(curve, x)` | Reads a value off a curve made of straight segments. |
| `yaw_pitch_to_vector3d` | `mathlib.yaw_pitch_to_vector3d(yaw, pitch)` | Turns a yaw and pitch into a direction. |
| `vector3d_to_yaw_pitch` | `mathlib.vector3d_to_yaw_pitch(vector)` | Turns a direction into a yaw and pitch. |
| `normalize3` | `mathlib.normalize3(vector)` | Scales a 3D vector to length 1. |
| `mag3` | `mathlib.mag3(vector)` | Returns the length of a 3D vector. |
| `dot3` | `mathlib.dot3(a, b)` | Returns the dot product of two 3D vectors. |
| `cross3` | `mathlib.cross3(a, b)` | Returns the cross product of two 3D vectors. |
| `unit_cross3` | `mathlib.unit_cross3(a, b)` | Returns the cross product scaled to length 1. |
| `normalize2` | `mathlib.normalize2(vector)` | Scales a 2D vector to length 1. |
| `mag2` | `mathlib.mag2(vector)` | Returns the length of a 2D vector. |
| `dot2` | `mathlib.dot2(a, b)` | Returns the dot product of two 2D vectors. |
| `nonzero` | `mathlib.nonzero(x)` | Likely true if the number is not zero. |
| `nonzero_elements2` | `mathlib.nonzero_elements2(vector)` | Likely true if either part of a 2D vector is not zero. |
| `nonzero_mag2` | `mathlib.nonzero_mag2(vector)` | Likely true if a 2D vector has a length. |
| `nonzero_mag3` | `mathlib.nonzero_mag3(vector)` | Likely true if a 3D vector has a length. |
| `nonzero_elements3` | `mathlib.nonzero_elements3(vector)` | Likely true if any part of a 3D vector is not zero. |
| `vector2_to_yaw` | `mathlib.vector2_to_yaw(vector)` | Returns the yaw a flat vector points along. |
| `yaw_to_vector2` | `mathlib.yaw_to_vector2(yaw)` | Returns the flat vector for a yaw. |
| `vector_from_euler_angles` | `mathlib.vector_from_euler_angles(angles)` | Turns a set of Euler angles into a direction. |
| `vector_to_euler_angles` | `mathlib.vector_to_euler_angles(vector)` | Turns a direction into a set of Euler angles. |
| `quaternion_from_forward_up` | `mathlib.quaternion_from_forward_up(forward, up)` | Builds a rotation from a facing and an up direction. |
| `quaternion_from_euler_angles` | `mathlib.quaternion_from_euler_angles(angles)` | Builds a rotation from Euler angles. |
| `quaternion_to_euler_angles` | `mathlib.quaternion_to_euler_angles(rotation)` | Turns a rotation into Euler angles. |
| `quaternion_inverse` | `mathlib.quaternion_inverse(rotation)` | Returns the opposite rotation. |
| `quaternions_multiply` | `mathlib.quaternions_multiply(a, b)` | Combines two rotations. |
| `quaternion_to_axis_and_angle` | `mathlib.quaternion_to_axis_and_angle(rotation)` | Turns a rotation into an axis and an angle. |
| `rotate_vector_about_axis` | `mathlib.rotate_vector_about_axis(vector, axis, angle)` | Turns a vector around an axis by an angle. |
| `safe_facing_angles3` | `mathlib.safe_facing_angles3(vector)` | Likely returns facing angles for a direction, handling a direction with no length safely. |
| `angle_between_vectors` | `mathlib.angle_between_vectors(a, b)` | Returns the angle between two vectors. |
| `angle_difference` | `mathlib.angle_difference(a, b)` | Returns how far apart two angles are. |
| `signed_angle_difference` | `mathlib.signed_angle_difference(a, b)` | Returns how far apart two angles are, negative if `b` is behind `a`. |
| `local_to_world_space_position3` | `mathlib.local_to_world_space_position3(position, origin, rotation)` | Converts a position from an object's own space to world space. |
| `world_to_local_space_position3` | `mathlib.world_to_local_space_position3(position, origin, rotation)` | Converts a position from world space to an object's own space. |
| `accelerate_to_position1d` | `mathlib.accelerate_to_position1d(...)` | Likely moves a single number towards a target with acceleration. |
| `generate_up3` | `mathlib.generate_up3(forward)` | Likely picks an up direction for a facing. |
| `orthonormalize_forward_up` | `mathlib.orthonormalize_forward_up(forward, up)` | Likely corrects a facing and up direction so they are at right angles. |
| `xy0_from_vector2d` | `mathlib.xy0_from_vector2d(vector)` | Turns a flat vector into a 3D one with a height of zero. |

#### Helpers that `mathlib` adds

These are written in script on top of the natives above, not provided by the engine.

| Native | Called as | What it does |
|---|---|---|
| `random_int_inclusive` | `mathlib.random_int_inclusive(low, high)` | Returns a random whole number from `low` to `high`, both included. |
| `random_int_never_highest_value` | `mathlib.random_int_never_highest_value(low, high)` | Returns a random whole number from `low` up to one below `high`, which suits picking from a list. |

### `bundlelib`

`bundlelib` is the library `sleep`, `sleep_until` and `sleep_until_timeout` are compiled into. Call those directly, as described in "Waiting and threads".


## Lists and containers

`len(list)` is a builtin. Lists and tables declared with `static_array`, `dynamic_array`, `static_stack` and `table` also have these calls.

| Native | Called as | What it does |
|---|---|---|
| `append` | `list.append(item)` | Adds an item to the end. |
| `new` | `stack.new()` | Adds a blank entry to the end and returns it so it can be filled in. |
| `maximum_count` | `stack.maximum_count()` | Returns how many items a stack can hold. |
| `resize` | `array.resize(count)` | Changes how many items the array holds; `resize(0)` empties it. |
| `reserve` | `array.reserve(count)` | Makes room for that many items in advance. |
| `clear` | `list.clear()` | Empties the list. |
| `fit` | `table.fit()` | Likely shrinks the table to the entries it uses. |

## Sandbox classes

The sandbox describes weapons, abilities, perks, stats and damage, and Bungie wrote it in BungieScript too. Its classes are built on engine bases that bring the calls below. Most of them are called by the engine, not by scripts; the explanations come from the names.


### Components (`c_component`)

Anything that sits on a game object has these: weapons, damage components, stat translators and others.

| Native | Called as | What it does |
|---|---|---|
| `get_object` | `get_object()` | Returns the object the component belongs to. |
| `find_interface` | `find_interface(interface)` | Finds an interface, such as `i_inventory` or `i_weapon_input`, on the object. It also works on the object `get_object()` returns, and on inventory items. |
| `find_interface_this_component_block` | `find_interface_this_component_block(interface)` | Likely finds an interface within this component's own data. |
| `new_message_to_object` | `new_message_to_object(...)` | Likely starts a network message to the object. |
| `find_query` | `find_query(...)` | Likely searches the object for something that matches a query. |
| `object_get_parent_object` | `object_get_parent_object()` | Returns the object this one is attached to. |
| `get_ultimate_parent_object` | `get_ultimate_parent_object()` | Returns the object at the top of the chain of parents. |
| `get_position` | `get_position()` | Returns where the object is. |
| `get_bounding_sphere` | `get_bounding_sphere()` | Returns the sphere that surrounds the object. |
| `get_forward_up` | `get_forward_up()` | Returns the direction the object faces and its up direction. |
| `get_orientation` | `get_orientation()` | Returns the object's orientation. |
| `get_attachment_position` | `get_attachment_position(attachment)` | Returns the position of one of the object's attachment points. |
| `get_attachment_bounding_sphere` | `get_attachment_bounding_sphere(attachment)` | Returns the sphere that surrounds an attachment point. |
| `get_attachment_forward_up` | `get_attachment_forward_up(attachment)` | Returns the facing and up direction of an attachment point. |
| `get_attachment_orientation` | `get_attachment_orientation(attachment)` | Returns the orientation of an attachment point. |
| `activate_update_interface` | `activate_update_interface(interface)` | Likely turns on the per-frame update for one of the component's interfaces. |
| `activate_channel` | `activate_channel(channel)` | Likely turns on one of the component's channels. |
| `network_set_dirty` | `network_set_dirty()` | Marks the component's state as changed so it is sent to other players. |
| `get_component_handle` | `get_component_handle()` | Returns a handle that refers to this component. |

### Weapons (`c_weapon`)

Weapons are components too, so they also have everything in "Components".

| Native | Called as | What it does |
|---|---|---|
| `set_initial_stat_value` | `set_initial_stat_value(stat, value)` | Sets the starting value of a stat, such as `e_damageable_stat.shield_vitality`. |
| `get_component_instance` | `get_component_instance(type)` | Likely returns the instance of one of the other components on the object. |
| `get_component_instance_const` | `get_component_instance_const(type)` | The same, for reading only. |
| `get_stat` | `get_stat(stat)` | Returns one of the component's stats, to read or change. |
| `get_stat_const` | `get_stat_const(stat)` | The same, for reading only. |
| `get_stat_value` | `get_stat_value(stat)` | Returns the current value of a stat. |
| `import` | `import()` | Loads the component's authored settings; scripts override it to add their own setup. |
| `initialize` | `initialize()` | Called by the engine when the component is created. |
| `finalize` | `finalize()` | Called by the engine when the component is shut down. |
| `dispose` | `dispose()` | Called by the engine to release what the component holds. |
| `get_weapon_hud_state` | `get_weapon_hud_state()` | Returns what the HUD should show for the weapon. |
| `build_hud_flag_list` | `build_hud_flag_list()` | Likely builds the list of HUD flags that describe the weapon's state. |
| `get_crosshair_opacity` | `get_crosshair_opacity()` | Returns how visible the crosshair should be. |
| `investment_stats_changed` | `investment_stats_changed()` | Called when the weapon's investment stats change, so it can refresh. |
| `ready` | `ready()` | Brings the weapon up so it can be used. |
| `reset` | `reset()` | Puts the weapon back in its starting state. |
| `put_away` | `put_away()` | Lowers the weapon. |
| `get_render_fov` | `get_render_fov()` | Returns the field of view the weapon is drawn with. |
| `stop_reload` | `stop_reload()` | Interrupts a reload. |
| `get_reticle_depth` | `get_reticle_depth()` | Returns how far in front of the camera the reticle is drawn. |
| `compute_animated_direction_angle` | `compute_animated_direction_angle()` | Likely works out the angle of the weapon's animated aim direction. |
| `get_aim_down_sights_dolly_zoom_distance` | `get_aim_down_sights_dolly_zoom_distance()` | Returns how far the camera moves in when aiming down the sights. |
| `get_aim_down_sights_depth_of_field` | `get_aim_down_sights_depth_of_field()` | Returns the depth-of-field setting used when aiming down the sights. |
| `get_aim_down_sights_timeline` | `get_aim_down_sights_timeline()` | Returns the timeline of the aim-down-sights transition. |
| `get_weapon_definition` | `get_weapon_definition()` | Returns the weapon's definition data. |
| `get_magazine_interface` | `get_magazine_interface()` | Returns the weapon's magazine interface. |
| `get_heat_interface` | `get_heat_interface()` | Returns the weapon's heat interface. |
| `get_reload_interface` | `get_reload_interface()` | Returns the weapon's reload interface. |
| `get_battery_interface` | `get_battery_interface()` | Returns the weapon's battery interface. |
| `get_barrel_interface` | `get_barrel_interface(index)` | Returns the interface of one of the weapon's barrels. |
| `get_trigger_interface` | `get_trigger_interface(index)` | Returns the interface of one of the weapon's triggers. |
| `get_barrel` | `get_barrel(index)` | Returns one of the weapon's barrels. |
| `get_trigger` | `get_trigger(index)` | Returns one of the weapon's triggers. |
| `get_input` | `get_input()` | Returns the weapon's input. |
| `get_barrel_count` | `get_barrel_count()` | Returns how many barrels the weapon has. |
| `get_trigger_count` | `get_trigger_count()` | Returns how many triggers the weapon has. |
| `get_magazine_status` | `get_magazine_status()` | Returns the state of the magazine, such as the rounds in it. |
| `get_iron_sight_marker` | `get_iron_sight_marker()` | Returns the marker the iron sights are lined up on. |
| `get_aim_down_sights_focus_marker` | `get_aim_down_sights_focus_marker()` | Returns the marker the camera focuses on when aiming down the sights. |
| `can_be_fired` | `can_be_fired()` | True if the weapon can fire now. |
| `is_depleted` | `is_depleted()` | True if the weapon is out of ammo. |
| `is_overheated` | `is_overheated()` | True if the weapon is overheated. |
| `is_reloading` | `is_reloading()` | True while the weapon is reloading. |
| `start_vent` | `start_vent()` | Starts venting heat. |
| `stop_vent` | `stop_vent()` | Stops venting heat. |
| `accuracy_ding` | `accuracy_ding()` | Likely gives the weapon a brief accuracy penalty. |
| `recover` | `recover()` | Likely returns the weapon to a usable state after it was interrupted. |
| `has_bottomless_clip` | `has_bottomless_clip()` | True if the magazine never runs out. |
| `has_infinite_ammo` | `has_infinite_ammo()` | True if the weapon never runs out of ammo. |
| `unzoom` | `unzoom()` | Leaves zoom. |
| `play_local_zoom_effects` | `play_local_zoom_effects()` | Plays the zoom effects for the local player. |
| `get_zoom_level_count` | `get_zoom_level_count()` | Returns how many zoom levels the weapon has. |
| `rotate_zoom_level` | `rotate_zoom_level()` | Steps to the next zoom level. |
| `can_currently_zoom` | `can_currently_zoom()` | True if the weapon can zoom now. |
| `is_zoomable` | `is_zoomable()` | True if the weapon has a zoom at all. |
| `get_state` | `get_state()` | Returns the weapon's state, such as readying or idle. |
| `has_been_readied` | `has_been_readied()` | True once the weapon has finished readying. |
| `should_center_reticle` | `should_center_reticle()` | True if the reticle belongs in the middle of the screen. |
| `interrupt_for_action` | `interrupt_for_action()` | Likely interrupts the weapon so the player can do something else, such as melee. |
| `notify_inventory_ownership_changed` | `notify_inventory_ownership_changed()` | Tells the weapon its inventory owner has changed. |
| `set_current_ammo_and_battery_percentage` | `set_current_ammo_and_battery_percentage(ammo, battery)` | Sets how full the magazine and battery are, as fractions. |
| `get_ammo_percentage` | `get_ammo_percentage()` | Returns how full the magazine is. |
| `get_battery_amount` | `get_battery_amount()` | Returns how much charge the battery has. |
| `delay_predicted_state` | `delay_predicted_state(...)` | Part of network prediction: holds back the state a client has predicted. |
| `predicted_state_apply` | `predicted_state_apply(...)` | Part of network prediction: applies a predicted state. |
| `get_predicted_delay_timer` | `get_predicted_delay_timer()` | Part of network prediction: returns the timer holding back a predicted state. |
| `set_predicted_battery` | `set_predicted_battery(amount)` | Part of network prediction: sets the predicted battery charge. |
| `get_put_away_duration` | `get_put_away_duration()` | Returns how long putting the weapon away takes. |
| `get_ready_duration` | `get_ready_duration()` | Returns how long readying the weapon takes. |
| `get_aim_down_sights_time` | `get_aim_down_sights_time()` | Returns how long aiming down the sights takes. |
| `simulation_fire_empty_click` | `simulation_fire_empty_click()` | Plays the empty click when firing with no ammo. |
| `activate_update` | `activate_update()` | Turns on the weapon's per-frame update. |
| `activate_barrel_update` | `activate_barrel_update(index)` | Turns on the per-frame update of a barrel. |
| `assign_to_content_group` | `assign_to_content_group(group)` | Likely assigns the weapon to a content group, the set of data it loads with. |
| `render_debug` | `render_debug()` | Draws debug information for the component. |
| `get_target_tracking_system` | `get_target_tracking_system()` | Returns the weapon's target tracking. |
| `get_sustained_targeting_system` | `get_sustained_targeting_system()` | Returns the weapon's sustained targeting. |
| `set_override_owner` | `set_override_owner(owner)` | Sets an owner to use in place of the real one. |
| `set_override_owner_inventory_index` | `set_override_owner_inventory_index(index)` | Sets the inventory slot of the override owner. |
| `get_override_owner` | `get_override_owner()` | Returns the override owner. |
| `get_override_owner_inventory_index` | `get_override_owner_inventory_index()` | Returns the inventory slot of the override owner. |
| `get_first_person_render_fov` | `get_first_person_render_fov()` | Returns the field of view the weapon is drawn with in first person. |
| `get_iron_sights_render_fov` | `get_iron_sights_render_fov()` | Returns the field of view the weapon is drawn with while aiming down the sights. |
| `set_first_person_render_fov` | `set_first_person_render_fov(value)` | Sets the first-person drawing field of view. |
| `set_iron_sights_render_fov` | `set_iron_sights_render_fov(value)` | Sets the aiming-down-the-sights drawing field of view. |
| `evaluate_autoaim_parameters` | `evaluate_autoaim_parameters()` | Works out the aim-assist settings for the weapon's current state. |
| `is_targeting_enabled` | `is_targeting_enabled()` | True if target tracking is on. |
| `set_targeting_enabled` | `set_targeting_enabled(enabled)` | Turns target tracking on or off. |
| `register_scope_gear_component` | `register_scope_gear_component(component)` | Registers a scope attachment with the weapon. |
| `unregister_scope_gear_component` | `unregister_scope_gear_component(component)` | Removes a scope attachment. |
| `get_equipable_interface` | `get_equipable_interface()` | Returns the interface that lets the weapon be equipped. |
| `get_weapon_content_interface` | `get_weapon_content_interface()` | Returns the interface that holds the weapon's content. |
| `handle_weapon_recover_message` | `handle_weapon_recover_message(message)` | Handles the network message telling the weapon to recover. |
| `network_manual_update` | `network_manual_update()` | Sends the component's state to other players when it is asked to update by hand. |
| `get_targeting_state_channel` | `get_targeting_state_channel()` | Returns the channel that carries the weapon's targeting state. |
| `handle_damage_owner_propagation` | `handle_damage_owner_propagation(message)` | Likely handles the message that passes on who owns the damage, so kills are credited. |

### Weapon interfaces (`c_interface_reference`)

`c_interface_reference` is what `find_interface(i_weapon)` and its relatives give back. Which calls work depends on the interface: `i_weapon` has the stats and the zoom field of view, `i_inventory` the items, `i_weapon_trigger` the trigger behaviors, `i_weapon_input` the input.

| Native | Called as | What it does |
|---|---|---|
| `get_stat` | `weapon_interface.get_stat(stat)` | Returns one of the weapon's stats, to read or change. |
| `get_iron_sights_render_fov` | `weapon_interface.get_iron_sights_render_fov()` | Returns the field of view used while aiming down the sights. |
| `set_iron_sights_render_fov` | `weapon_interface.set_iron_sights_render_fov(value)` | Sets that field of view. |
| `get_item` | `inventory.get_item(slot)` | Returns the item in an inventory slot. |
| `get_normal_trigger_behavior` | `trigger_interface.get_normal_trigger_behavior()` | Returns how the trigger behaves when not zoomed. |
| `set_normal_trigger_behavior` | `trigger_interface.set_normal_trigger_behavior(behavior)` | Sets how the trigger behaves when not zoomed. |
| `get_zoomed_trigger_behavior` | `trigger_interface.get_zoomed_trigger_behavior()` | Returns how the trigger behaves when zoomed. |
| `set_zoomed_trigger_behavior` | `trigger_interface.set_zoomed_trigger_behavior(behavior)` | Sets how the trigger behaves when zoomed. |
| `get_weapon_input` | `input_interface.get_weapon_input()` | Returns the weapon's input, which has the trigger thresholds. |

### Weapon input

What `get_weapon_input()` gives back. The thresholds are how far the trigger must be pulled for the weapon to react.

| Native | Called as | What it does |
|---|---|---|
| `set_primary_trigger_initial_threshold` | `input.set_primary_trigger_initial_threshold(value)` | Likely sets the pull at which the primary trigger first registers. |
| `set_primary_trigger_press_threshold` | `input.set_primary_trigger_press_threshold(value)` | Likely sets the pull at which the primary trigger counts as pressed. |
| `set_primary_trigger_release_threshold` | `input.set_primary_trigger_release_threshold(value)` | Likely sets the pull below which the primary trigger counts as released. |

### Stats

A stat is a number on a weapon or character that perks and upgrades can change. Get one with `interface.get_stat(stat)`.

| Native | Called as | What it does |
|---|---|---|
| `get_base_value` | `stat.get_base_value()` | Returns the stat's value before any changes. |
| `set_base_value` | `stat.set_base_value(value)` | Sets the stat's value before any changes. |
| `get_modified_value` | `stat.get_modified_value()` | Returns the stat's value after perks and upgrades. |

### Weapon stat translators (`c_weapon_stat_translator`)

A translator turns a player's stat levels into the weapon values the game uses. It is a component too, and it shares the table and translation calls in "Stat translators (shared)".

| Native | Called as | What it does |
|---|---|---|
| `add_group` | `add_group(name, normal_behavior, zoomed_behavior)` | Adds a named weapon group, such as `"auto"`, with the trigger behaviors it uses. |
| `get_group_index` | `get_group_index(weapon_sheet)` | Returns which group a weapon belongs to. |
| `set_translation_channel` | `set_translation_channel(...)` | Likely routes a translated value to a channel. |
| `translate_stats` | `translate_stats(...)` | Runs the translation for a weapon's stats. |
| `script_translate_stats` | `script_translate_stats(...)` | The same, for translations written in script. |
| `get_translation_stat` | `get_translation_stat(stat)` | Returns a translated stat. |
| `get_component_instance` | `get_component_instance(type)` | Likely returns the instance of one of the other components on the object. |
| `get_component_instance_const` | `get_component_instance_const(type)` | The same, for reading only. |
| `import` | `import()` | Loads the component's authored settings; scripts override it to add their own setup. |

### Biped stat translators (`c_biped_stat_translator`)

The same job for a player's character stats, such as armor and agility. It also uses "Stat translators (shared)".

| Native | Called as | What it does |
|---|---|---|
| `get_biped_sheet` | `get_biped_sheet()` | Returns the character's stat sheet. |
| `translate_stats` | `translate_stats(...)` | Runs the translation for the character's stats. |
| `translate_power_levels` | `translate_power_levels(...)` | Runs the translation for the character's power levels. |
| `script_translate_stats` | `script_translate_stats(...)` | The same as `translate_stats`, for translations written in script. |
| `script_translate_power_levels` | `script_translate_power_levels(...)` | The same as `translate_power_levels`, for translations written in script. |
| `get_translation_stat` | `get_translation_stat(stat)` | Returns a translated stat. |
| `get_component_instance` | `get_component_instance(type)` | Likely returns the instance of one of the other components on the object. |
| `get_component_instance_const` | `get_component_instance_const(type)` | The same, for reading only. |
| `dispose` | `dispose()` | Called by the engine to release what the component holds. |
| `finalize` | `finalize()` | Called by the engine when the component is shut down. |

### Stat translators (shared)

Both translators build their tables with these. A table has one row for each level of a stat, and a column for each engine value it sets. `import()` fills them in. A group is one family of weapons, and biped translators use group `0`.

| Native | Called as | What it does |
|---|---|---|
| `add_character_stats_table` | `add_character_stats_table(stat, min_level, max_level)` | Starts a table for a character stat, such as armor, covering those levels, and returns it. |
| `add_resistance_stats_table` | `add_resistance_stats_table(min_level, max_level)` | Starts a table for the resistance stats, covering those levels, and returns it. |
| `add_weapon_stats_table` | `add_weapon_stats_table(stat, min_level, max_level)` | Starts a table for a weapon stat, such as rate of fire, covering those levels, and returns it. |
| `add_column_to_table` | `add_column_to_table(table, engine_stat)` | Adds a column for an engine value the table sets, and returns the column. |
| `set_translation_row` | `set_translation_row(table, level, values)` | Fills in one row: the values of each column at that level. |
| `set_translation_column` | `set_translation_column(column, function, inputs)` | Fills a column by running a script function over the values of other columns. |
| `set_group_count` | `set_group_count(count)` | Sets how many groups of weapons the translator has. |
| `get_group_count` | `get_group_count()` | Returns how many groups there are. |
| `get_table_identifier` | `get_table_identifier(column, type)` | Returns the identifier of a column for one weapon type, for the calls below. |
| `set_translation_copy` | `set_translation_copy(group, to_stat, from_stat)` | Makes a stat a copy of another value. |
| `set_translation_add` | `set_translation_add(group, to_stat, a, b)` | Sets a stat to `a` plus `b`. |
| `set_translation_subtract` | `set_translation_subtract(group, to_stat, a, b)` | Sets a stat to `a` minus `b`. |
| `set_translation_multiply` | `set_translation_multiply(group, to_stat, a, b)` | Sets a stat to `a` times `b`. |
| `set_translation_divide` | `set_translation_divide(group, to_stat, a, b)` | Sets a stat to `a` divided by `b`. |
| `set_translation_ceiling` | `set_translation_ceiling(group, to_stat, from_stat)` | Sets a stat to another value rounded up. |
| `set_translation_floor` | `set_translation_floor(group, to_stat, from_stat)` | Sets a stat to another value rounded down. |
| `set_translation_round` | `set_translation_round(group, to_stat, from_stat)` | Sets a stat to another value rounded to the nearest whole number. |
| `set_translation_pin` | `set_translation_pin(...)` | Likely sets a stat to another value held between a minimum and a maximum. |
| `set_translation_math` | `set_translation_math(...)` | Likely a general maths step; no script uses it. |

### Damage components (`c_damage_component_base`)

A damage component gives an object health, shields and the way it reacts to being hit. Its `import()` calls `set_import_defaults`, `expand_script_behaviors` and `import_sections` in turn.

| Native | Called as | What it does |
|---|---|---|
| `set_initial_stat_value` | `set_initial_stat_value(stat, value)` | Sets the starting value of a stat, such as `e_damageable_stat.shield_vitality`. |
| `get_stat` | `get_stat(stat)` | Returns one of the component's stats, to read or change. |
| `get_stat_const` | `get_stat_const(stat)` | The same, for reading only. |
| `get_stat_value` | `get_stat_value(stat)` | Returns the current value of a stat. |
| `get_component_instance` | `get_component_instance(type)` | Likely returns the instance of one of the other components on the object. |
| `get_component_instance_const` | `get_component_instance_const(type)` | The same, for reading only. |
| `set_import_defaults` | `set_import_defaults()` | Fills in the component's default settings while it loads. |
| `expand_script_behaviors` | `expand_script_behaviors()` | Turns the behaviors listed in script into the engine's form, and returns whether that worked. |
| `import_sections` | `import_sections()` | Loads the component's damage sections, such as health and shield, from its data. |
| `submit_parts` | `submit_parts()` | Hands the component's parts to the engine once they are built. |
| `initialize` | `initialize()` | Called by the engine when the component is created. |
| `finalize` | `finalize()` | Called by the engine when the component is shut down. |
| `dispose` | `dispose()` | Called by the engine to release what the component holds. |
| `update_prephysics` | `update_prephysics()` | Runs every tick before physics. |
| `update_postmove` | `update_postmove()` | Runs every tick after the object has moved. |
| `process_impulse_event` | `process_impulse_event(event)` | Handles a damage impulse landing on the object. |
| `process_impact_event` | `process_impact_event(event)` | Handles a physical impact on the object. |
| `process_named_event` | `process_named_event(event)` | Handles a damage event that has a name. |
| `process_fraction_event` | `process_fraction_event(event)` | Handles a damage event that works on a fraction of the object. |
| `process_transfer_event` | `process_transfer_event(event)` | Handles damage passed on from another object. |
| `set_is_invulnerable` | `set_is_invulnerable(invulnerable)` | Makes the object immune to damage, or vulnerable again. |
| `get_is_dead` | `get_is_dead()` | True if the object is dead. |
| `get_is_garbage` | `get_is_garbage()` | True if the object has been cleaned up as garbage. |
| `get_damageable_status` | `get_damageable_status()` | Returns whether the object can be damaged. |
| `add_damage_multiplier` | `add_damage_multiplier(multiplier)` | Adds a multiplier to the damage the object takes. |
| `remove_damage_multiplier` | `remove_damage_multiplier(multiplier)` | Takes a damage multiplier away again. |
| `notify_changed_vitality_stats` | `notify_changed_vitality_stats()` | Tells the component its health or shield stats changed. |
| `trigger_shield_recharge` | `trigger_shield_recharge()` | Starts the shield recharging. |
| `get_section` | `get_section(index)` | Returns one of the component's damage sections. |
| `enumerate_area_gather_points` | `enumerate_area_gather_points()` | Likely lists the points area damage is gathered around. |
| `get_damage_impulse_modifier` | `get_damage_impulse_modifier()` | Returns how much the object scales incoming damage impulses. |
| `set_section_enabled` | `set_section_enabled(section, enabled)` | Turns a damage section on or off. |
| `get_indirect_material` | `get_indirect_material()` | Returns the material used for damage that does not hit directly. |
| `get_hard_ping_suppression_duration` | `get_hard_ping_suppression_duration()` | Returns how long a hard ping, likely the strong hit reaction, stays suppressed. |
| `set_hard_ping_suppressed` | `set_hard_ping_suppressed(suppressed)` | Suppresses the hard ping, or allows it again. |
| `is_hard_ping_suppressed` | `is_hard_ping_suppressed()` | True if the hard ping is suppressed. |
| `is_hard_pinging` | `is_hard_pinging()` | True while the hard ping is playing. |
| `set_hard_pinging` | `set_hard_pinging(pinging)` | Starts or stops the hard ping. |
| `render_debug` | `render_debug()` | Draws debug information for the component. |
| `set_initial_selection` | `set_initial_selection(...)` | Likely sets which parts of the object are chosen at the start. |
| `enumerate_selections` | `enumerate_selections()` | Likely lists the chosen parts. |
| `get_blueprint_selections` | `get_blueprint_selections()` | Likely returns the parts the object's blueprint chose. |
| `notify_parts_changed` | `notify_parts_changed()` | Tells the component its parts changed. |
| `handle_damage_transfer_to_different_authority_message` | `handle_damage_transfer_to_different_authority_message(message)` | Handles the network message that moves damage to the machine in charge of the object. |
| `network_manual_update` | `network_manual_update()` | Sends the component's state to other players when it is asked to update by hand. |

### Damage scalar values (`s_damage_scalar_values`)

A table of damage multipliers, one for each kind of damage.

| Native | Called as | What it does |
|---|---|---|
| `fill` | `scalars.fill(value)` | Sets every multiplier to the same value. |
| `set_value` | `scalars.set_value(scalar, value)` | Sets one multiplier, such as `e_damage_scalar.base`. |

### Damage meter channels

Channel providers send an object's health to the HUD; the channel manager (`i_channel_manager`) holds the channels they write to.

| Native | Called as | What it does |
|---|---|---|
| `configure` | `provider.configure(index, channel_name, a, b)` | Sets up a channel provider to write to a named channel; the two true or false options are not understood. |
| `find_import_channel` | `channel_manager.find_import_channel(channel_name)` | Finds an input channel by name. |
| `set_import_value` | `channel_manager.set_import_value(channel_index, value)` | Sets an input channel's value, usually a `vector4`. |

### Damage globals (`c_damage_globals`)

| Native | Called as | What it does |
|---|---|---|
| `import` | `import()` | Runs when the damage globals load. |

### Ability managers (`c_script_ability_manager`)

The component that runs a player's abilities: activating them, charging them, and spending the resources they cost.

| Native | Called as | What it does |
|---|---|---|
| `set_initial_stat_value` | `set_initial_stat_value(stat, value)` | Sets the starting value of a stat, such as `e_damageable_stat.shield_vitality`. |
| `get_max_ability_count` | `get_max_ability_count()` | Returns how many abilities a player can have. |
| `get_component_instance` | `get_component_instance(type)` | Likely returns the instance of one of the other components on the object. |
| `get_component_instance_const` | `get_component_instance_const(type)` | The same, for reading only. |
| `get_stat` | `get_stat(stat)` | Returns one of the component's stats, to read or change. |
| `get_stat_const` | `get_stat_const(stat)` | The same, for reading only. |
| `get_stat_value` | `get_stat_value(stat)` | Returns the current value of a stat. |
| `import` | `import()` | Loads the component's authored settings; scripts override it to add their own setup. |
| `bind_base_abilities` | `bind_base_abilities()` | Attaches the player's base abilities. |
| `bind_active_ability` | `bind_active_ability(ability)` | Attaches an ability so the player can use it. |
| `unbind_active_ability` | `unbind_active_ability(ability)` | Removes an ability again. |
| `handle_new_controlling_player_notify_message` | `handle_new_controlling_player_notify_message(message)` | Handles the network message that a new player now controls this. |
| `handle_controller_player_detach_notify_message` | `handle_controller_player_detach_notify_message(message)` | Handles the network message that the controlling player has left. |
| `spend_resources` | `spend_resources(amount)` | Spends an ability resource, such as mana. |
| `spend_up_to` | `spend_up_to(amount)` | Spends as much of a resource as there is, up to the amount. |
| `has_resources` | `has_resources(amount)` | True if there is enough of the resource. |
| `get_max_active_ability_count` | `get_max_active_ability_count()` | Returns how many abilities can be active at once. |
| `add_ability_activation_disabled_counter` | `add_ability_activation_disabled_counter()` | Adds a reason why abilities cannot be activated; they stay off until every reason is removed. |
| `remove_ability_activation_disabled_counter` | `remove_ability_activation_disabled_counter()` | Takes one of those reasons away. |
| `is_ability_activation_disabled` | `is_ability_activation_disabled()` | True if abilities cannot be activated. |
| `add_ability_recharge_disabled_counter` | `add_ability_recharge_disabled_counter()` | Adds a reason why abilities cannot recharge. |
| `remove_ability_recharge_disabled_counter` | `remove_ability_recharge_disabled_counter()` | Takes one of those reasons away. |
| `is_ability_recharge_disabled` | `is_ability_recharge_disabled()` | True if abilities cannot recharge. |
| `suppress_actions` | `suppress_actions()` | Likely stops the player's other actions while an ability runs. |
| `update_actions` | `update_actions()` | Likely updates the actions an ability is running. |
| `get_mana` | `get_mana()` | Returns how much of the ability resource the player has. |
| `can_use_ability` | `can_use_ability(ability)` | True if the player can use the ability now. |
| `in_warning_state` | `in_warning_state()` | Likely true while the ability meter is showing a warning. |
| `inverted_spending` | `inverted_spending()` | Likely true if spending works the opposite way round, filling a meter instead of draining it. |
| `get_pip_size` | `get_pip_size()` | Returns how much of the resource one pip of the meter stands for. |
| `get_ability_interface` | `get_ability_interface(ability)` | Returns the interface of one ability. |
| `get_ability_interfaces` | `get_ability_interfaces()` | Returns the interfaces of all the abilities. |
| `get_ability_tags` | `get_ability_tags()` | Returns the tags of the abilities. |
| `get_base_ability_interfaces` | `get_base_ability_interfaces()` | Returns the interfaces of the base abilities. |
| `any_ability_consumes_ability_cancel_input` | `any_ability_consumes_ability_cancel_input()` | True if an ability is using the cancel button. |
| `update` | `update()` | Runs every tick. |
| `render_debug` | `render_debug()` | Draws debug information for the component. |
| `network_manual_update` | `network_manual_update()` | Sends the component's state to other players when it is asked to update by hand. |
| `handle_death_message` | `handle_death_message(message)` | Handles the message that the player died. |
| `handle_damage_owner_propagation` | `handle_damage_owner_propagation(message)` | Likely handles the message that passes on who owns the damage, so kills are credited. |
| `initialize` | `initialize()` | Called by the engine when the component is created. |
| `finalize` | `finalize()` | Called by the engine when the component is shut down. |
| `dispose` | `dispose()` | Called by the engine to release what the component holds. |

### Network components (`c_network_component_tag`)

| Native | Called as | What it does |
|---|---|---|
| `initialize` | `initialize()` | Called by the engine when the component is created. |
| `dispose` | `dispose()` | Called by the engine to release what the component holds. |
| `finalize` | `finalize()` | Called by the engine when the component is shut down. |
| `move_physics` | `move_physics()` | Likely moves the component's physics along with the object. |
| `render_debug` | `render_debug()` | Draws debug information for the component. |
| `network_manual_update` | `network_manual_update()` | Sends the component's state to other players when it is asked to update by hand. |
| `handle_authority_change` | `handle_authority_change()` | Called when another machine takes charge of the object. |

### Player data (`c_player_datum_base`)

The sandbox's list of abilities, perks and weapons, built when the game loads. Look things up by name; the name comes back as a handle for the other sandbox calls.

| Native | Called as | What it does |
|---|---|---|
| `find_ability_by_name` | `find_ability_by_name(name)` | Returns the ability with that name. |
| `find_character_perk_by_name` | `find_character_perk_by_name(name)` | Returns the character perk with that name. |
| `find_weapon_perk_by_name` | `find_weapon_perk_by_name(name)` | Returns the weapon perk with that name. |
| `add_weapon` | `add_weapon(name, a, b, c, d, e)` | Adds a weapon to the sandbox's list from six names, which pick its definition, trigger group and stat tables. |
| `import_native` | `import_native()` | Runs the engine's own loading of the player data. |

### Character settings (`s_character_settings`)

One saved loadout: the abilities and perks a player has chosen. The sandbox builds its debug presets with these.

| Native | Called as | What it does |
|---|---|---|
| `set_ability_mod_with_configuration` | `settings.set_ability_mod_with_configuration(configuration, slot, mod, ...)` | Puts an ability modifier, such as `"faster_recharge"`, on an ability slot using the ability's configuration. |
| `clear_all_ability_mods` | `settings.clear_all_ability_mods()` | Removes every ability modifier. |
| `clear_all_character_perks` | `settings.clear_all_character_perks()` | Removes every character perk. |

## Type names

The types whose script spelling differs from the engine's class name. Every other type is written as the engine names it.

| Script writes | Engine class | Engine class name |
|---|---|---|
| `action_point` | `c_action_point_host` | our guess |
| `activity_flag` | `c_activity_flag` | our guess |
| `activity_player` | `c_activity_player_sensor_host` | Bungie's |
| `capturable` | `c_capturable_host` | Bungie's |
| `capturable_incident_listener` | `c_capturable_incident_listener` | our guess |
| `cinematic` | `c_cinematic_sensor_host` | Bungie's |
| `common_reference` | `c_common_reference` | Bungie's |
| `control_point` | `c_control_point_sensor_host` | our guess |
| `control_point_set` | `c_control_point_set_sensor_host` | our guess |
| `device` | `c_device_host` | Bungie's |
| `encounter_binding` | `c_encounter_binding_host` | our guess |
| `encounter_handle` | `c_encounter_handle` | our guess |
| `encounter_manager` | `c_encounter_manager` | our guess |
| `engagement_incident_listener` | `c_engagement_incident_listener` | our guess |
| `faction` | `c_faction_host` | our guess |
| `fireteam` | `c_fireteam_sensor_host` | Bungie's |
| `hard_wipe_globals` | `c_hard_wipe_globals_host` | our guess |
| `health` | `c_health_sensor_host` | our guess |
| `hop_on` | `c_hop_on_sensor_host` | our guess |
| `incident_listener` | `c_incident_listener` | Bungie's |
| `incident_player_iterator` | `c_incident_player_iterator` | our guess |
| `interactable` | `c_interactable_host` | our guess |
| `interactable_incident_listener` | `c_interactable_incident_listener` | our guess |
| `kill_incident_listener` | `c_kill_incident_listener` | our guess |
| `lifetime` | `c_lifetime_sensor_host` | our guess |
| `location` | `c_location_sensor_host` | our guess |
| `loot` | `c_loot_host` | our guess |
| `nav_point` | `c_nav_point_host` | our guess |
| `new_mission` | `c_new_mission_sensor_host` | our guess |
| `object` | `c_object_sensor_host` | Bungie's |
| `object_filter` | `c_object_filter_sensor_host` | Bungie's |
| `objective` | `c_objective_sensor_host` | our guess |
| `objective_timer` | `c_objective_timer_host` | our guess |
| `passenger` | `c_passenger_sensor_host` | our guess |
| `performance` | `c_performance_host` | our guess |
| `player_monitor` | `c_player_monitor_sensor_host` | our guess |
| `player_objective` | `c_player_objective_sensor_host` | Bungie's |
| `player_trigger` | `c_player_trigger_sensor_host` | our guess |
| `safe_zone` | `c_safe_zone_sensor_host` | our guess |
| `scoreboard` | `c_scoreboard_host` | our guess |
| `sequence` | `c_sequence_host` | our guess |
| `squad` | `c_squad_sensor_host` | Bungie's |
| `squad_group` | `c_squad_group_sensor_host` | our guess |
| `squad_member` | `c_squad_member_sensor_host` | our guess |
| `team_picker` | `c_team_picker_host` | our guess |
| `timer` | `c_timer_sensor_host` | our guess |
| `trigger_group` | `c_trigger_group_host` | our guess |
| `trigger_volume` | `c_trigger_volume_slot_host` | Bungie's |
