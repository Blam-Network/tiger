# es\moon\lowercitadel\enc_lowercitadel_amb1.es
#
# The Lower Citadel's encounters (the Moon's private bubble 5, between the
# Hall of Wisdom and the strength chamber), loaded by the Moon's story
# missions and patrol: the dynamic props, the Hive on the deck and down both
# halls, the cutters that drop Knights on the deck as the player comes in,
# and the arena's ultra and its minions, whose ultra carries the key
# act_moon_m3_lowercitadel's mission 2 has the player take.
#
# Pooled over act_moon_m3_lowercitadel's two runs through the bubble
# (2026-10-25 18-12-35#1 and the 2026-10-03 World's Grave capture #1):
# - Up as the bubble loads: the wormway Knights and the strength side's
#   first wave. The strength side's second wave goes in as the first is
#   wiped (both runs).
# - pt_dropship_wisdom sends the wisdom cutter in 1.1-1.3 s later; it drops
#   its Knights about 9.5 s after it comes in and leaves. pt_dropship_strength
#   sends the strength cutter once the wisdom cutter's Knights are dead (0.7 s
#   after the trigger in one run, 0.7 s after the last Knight in the other).
#   pt_strength_bouncers puts the strength side's Thrall-room troopers in
#   0.8-1.1 s on, pt_strike_front the wisdom side's 0.8-1.3 s on (both runs).
# - pt_wisdom_wave and pt_wisdom_hall put the wisdom side's first wave and
#   hall troopers in 0.6-0.9 s on, the second wave a second after the first
#   is wiped, and pt_strength_hall the strength hall's troopers (one run,
#   the other never crossed those triggers).
# - The ultra and its three minions go in 4-5 s after the player walks into
#   mission 2's ultra trigger (both runs): here, once mission 2's loot
#   objective raises its flag (0x9737BF52, the ultra's identifier). The
#   second pair of minions goes in as the first three are dead (both runs).
# - Bodies are the ones the server placed. Tasks are the deck objective's,
#   by name; the wormway's (the ninth) is past the end of TU0's list.
# The cutters fly their entry and exit paths as the paths stand; their atoms
# were not copied.

@activity_bundle("enc_lowercitadel_amb1")

static_array<object, 10> dynamics
objective obj_lowercitadel_amb1
# mission 2's loot flag, raised as its objective begins
activity_flag af_ultra bind("0x9737BF52")
trigger_volume tv_dropship_wisdom
player_trigger pt_dropship_wisdom bind(tv_dropship_wisdom)
trigger_volume tv_dropship_strength
player_trigger pt_dropship_strength bind(tv_dropship_strength)
trigger_volume tv_strength_bouncers
player_trigger pt_strength_bouncers bind(tv_strength_bouncers)
trigger_volume tv_strike_front
player_trigger pt_strike_front bind(tv_strike_front)
trigger_volume tv_wisdom_wave
player_trigger pt_wisdom_wave bind(tv_wisdom_wave)
trigger_volume tv_wisdom_hall
player_trigger pt_wisdom_hall bind(tv_wisdom_hall)
trigger_volume tv_strength_hall
player_trigger pt_strength_hall bind(tv_strength_hall)
squad sq_wormway
@member_counts({knight: 1, trooper: 3})
squad sq_strength_wave1
@member_counts({thrall: 4})
squad sq_strength_wave2
@member_counts({troopers: 2})
squad sq_strength_trans
@member_counts({troopers: 3})
squad sq_hall_strength
@member_counts({wizard: 1, troopers: 3})
squad sq_wisdom_wave1
@member_counts({thrall: 2, troopers: 2})
squad sq_wisdom_wave2
@member_counts({troopers: 2})
squad sq_wisdom_trans
@member_counts({troopers: 3})
squad sq_hall_wisdom
squad sq_drop_wisdom_cutter
squad_member sq_drop_wisdom_cutter__pilot
control_point_set cps_drop_wisdom_entry_path
control_point_set cps_drop_wisdom_exit_path
@member_counts({knight: 1, 0x166DF0C1: 3})
squad sq_drop_wisdom
squad sq_drop_strength_cutter
squad_member sq_drop_strength_cutter__pilot
control_point_set cps_drop_strength_entry_path
control_point_set cps_drop_strength_exit_path
@member_counts({knight: 1, 0x166DF0C1: 3})
squad sq_drop_strength
squad sq_arena
squad_member sq_arena__boss
squad sq_arena_minions
squad_member sq_arena_minions__trooper1
squad_member sq_arena_minions__trooper2
squad_member sq_arena_minions__wizard
squad sq_arena_minions_2

@startup()
script sc_main_thread():
    for prop in dynamics:
        prop.create()
    sq_wormway.set_objective(obj_lowercitadel_amb1)
    sq_wormway.place()
    place_on_task(sq_strength_wave1, "0xE60B0F71")
    sleep_until(sq_strength_wave1.alive_count() == 0)
    place_on_task(sq_strength_wave2, "0xE60B0F71")

@startup()
script sc_dropship_wisdom():
    sleep_until(pt_dropship_wisdom.is_triggered())
    sleep(1)
    sq_drop_wisdom.set_objective(obj_lowercitadel_amb1)
    sq_drop_wisdom.set_task("0x288BE48A")
    cutter_drop(sq_drop_wisdom_cutter, sq_drop_wisdom_cutter__pilot, sq_drop_wisdom, cps_drop_wisdom_entry_path, cps_drop_wisdom_exit_path)

@startup()
script sc_dropship_strength():
    sleep_until(pt_dropship_strength.is_triggered())
    sleep_until(sq_drop_wisdom.alive_count() == 0)
    sleep(1)
    sq_drop_strength.set_objective(obj_lowercitadel_amb1)
    sq_drop_strength.set_task("deck")
    cutter_drop(sq_drop_strength_cutter, sq_drop_strength_cutter__pilot, sq_drop_strength, cps_drop_strength_entry_path, cps_drop_strength_exit_path)

@startup()
script sc_strength_bouncers():
    sleep_until(pt_strength_bouncers.is_triggered())
    sleep(1)
    place_on_task(sq_strength_trans, "0xF25CEA8D")

@startup()
script sc_strike_front():
    sleep_until(pt_strike_front.is_triggered())
    sleep(1)
    place_on_task(sq_wisdom_trans, "0x3C18FBCE")

@startup()
script sc_wisdom_wave():
    sleep_until(pt_wisdom_wave.is_triggered())
    sleep(1)
    place_on_task(sq_wisdom_wave1, "0xDE76F79F")
    sleep_until(sq_wisdom_wave1.alive_count() == 0)
    sleep(1)
    place_on_task(sq_wisdom_wave2, "0xDE76F79F")

@startup()
script sc_wisdom_hall():
    sleep_until(pt_wisdom_hall.is_triggered())
    sleep(1)
    place_on_task(sq_hall_wisdom, "0xDE76F79F")

@startup()
script sc_strength_hall():
    sleep_until(pt_strength_hall.is_triggered())
    sleep(1)
    place_on_task(sq_hall_strength, "0xE60B0F71")

@startup()
script sc_arena():
    sleep_until(af_ultra.is_active())
    place_on_task(sq_arena, "0x91D0E73E")
    place_on_task(sq_arena_minions, "0xF071D9A4")
    sleep_until(sq_arena_minions.alive_count() == 0)
    place_on_task(sq_arena_minions_2, "0xF071D9A4")

def place_on_task(sq, task):
    sq.set_objective(obj_lowercitadel_amb1)
    sq.set_task(task)
    sq.place()

def cutter_drop(cutter, pilot, troops, entry, exit):
    cutter.place()
    pilot.execute(entry); sleep_until(pilot.get_command_script_state() != e_command_script_state.executing)
    pilot.drop_squad(troops); sleep_until(not pilot.is_dropping())
    pilot.execute(exit); sleep_until(pilot.get_command_script_state() != e_command_script_state.executing)
    cutter.remove()
