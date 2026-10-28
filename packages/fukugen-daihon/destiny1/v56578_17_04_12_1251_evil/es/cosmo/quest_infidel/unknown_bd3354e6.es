# es\cosmo\quest_infidel\unknown_bd3354e6.es
#
# The highway's Fallen in Fang of Ir Yut. The intro squads are fighting as the
# highway loads (retail placed them with no player monitor report, so they go
# in as a simple encounter, not an ambush), and the skiff volume sends the
# three skiffs over. Then the dropships come in one after another, each when
# the one before has been worn down: the first once the intro's two lead
# squads are dead, the bounce ship (the captain's) a few seconds after the
# first has dropped, the second once the first ship's last squad is dead, the
# third once three of the second's squads are. The captain is the first of
# the bounce ship's squad to die; the last wave is the third ship's squads.
# Each ship's squads take their tasks in squad order as they are dropped.
# Names that were never cracked are written as "0x" literals. From one retail
# capture, so every wait here is that run's. A second run disagrees with the
# second and third ships' waits and the captain: it fits counting each ship's
# kills (seven of the first, three of the second, seven of the third) and
# ending the captain's objective as the second ship drops, which the replay
# cannot check until it feeds the ships' command script progress.

@activity_bundle(0xBD3354E6)

objective main_objective
squad captain_squad
static_array<squad, 2> dreg_squads
squad sq_skiffs
squad_member sq_skiffs__pilot_a
squad_member sq_skiffs__pilot_b
squad_member sq_skiffs__pilot_c
trigger_volume tv_skiff_place
player_monitor pm_skiff_place bind(tv_skiff_place)
simple_encounter enc_fa_intro_a
dropship_encounter enc_fa_drop_a
dropship_encounter enc_fa_drop_bounce
dropship_encounter enc_fa_drop_b
dropship_encounter enc_fa_drop_c
kill_incident_listener kil_captain
bool captain_dead = false
bool final_wave_dead = false

@startup()
script sc_highway_main():
    captain_squad.set_objective(main_objective)
    dreg_squads[0].set_objective(main_objective)
    dreg_squads[1].set_objective(main_objective)
    for s in enc_fa_intro_a._squad:
        s.set_objective(enc_fa_intro_a._objective)
    enc_fa_intro_a._squad[0].set_task("task_1")
    enc_fa_intro_a._squad[1].set_task("task_3")
    enc_fa_intro_a._squad[2].set_task("task_4")
    enc_fa_intro_a._squad[3].set_task("task_5")
    enc_fa_intro_a.activate()
    sc_skiffs.wake()
    sc_dropships.wake()

script sc_skiffs():
    sleep_until(pm_skiff_place.test_any_inside())
    sq_skiffs.place()

script sc_dropships():
    sleep_until(enc_fa_intro_a._squad[0].alive_count() + enc_fa_intro_a._squad[1].alive_count() > 0)
    sleep_until(enc_fa_intro_a._squad[0].alive_count() + enc_fa_intro_a._squad[1].alive_count() == 0)
    sleep(2)
    enc_fa_drop_a.activate()
    drop_tasks(enc_fa_drop_a, ["task_1", "task_2", "task_3", "task_4"])
    sleep(4)
    sc_bounce.wake()
    sleep_until(enc_fa_drop_a._squad[3].alive_count() == 0)
    sleep(1)
    enc_fa_drop_b.activate()
    drop_tasks(enc_fa_drop_b, ["task", "task_1", "task_4", "task_5", "task_6"])
    sleep_until(drop_b_lead_count() == 0)
    sleep(1)
    enc_fa_drop_c.activate()
    drop_tasks(enc_fa_drop_c, ["task", "task_1", "task_3"])
    sleep_until(drop_c_count() == 0)
    final_wave_dead = true

script sc_bounce():
    enc_fa_drop_bounce.activate()
    sc_captain.wake()
    drop_tasks(enc_fa_drop_bounce, ["task", "task_1"])

script sc_captain():
    kil_captain.reset()
    kil_captain.bind_squad(enc_fa_drop_bounce._squad[0])
    kil_captain.bind_incident_name_hash("any_kill")
    sleep_until(kil_captain.get_count() > 0)
    captain_dead = true

# A ship's squads are put against its objective as it comes in, and take
# their tasks, in squad order, as it drops them.
def drop_tasks(enc, tasks):
    for s in enc._squad:
        s.set_objective(enc._objective)
    sleep_until(enc._dropship_squad__pilot.is_dropping())
    for i, s in enc._squad:
        s.set_task(tasks[i])

def drop_b_lead_count():
    return enc_fa_drop_b._squad[1].alive_count() + enc_fa_drop_b._squad[2].alive_count() + enc_fa_drop_b._squad[3].alive_count()

def captain_is_dead():
    return captain_dead

def drop_c_count():
    return enc_fa_drop_c._squad[0].alive_count() + enc_fa_drop_c._squad[1].alive_count() + enc_fa_drop_c._squad[2].alive_count()

def final_wave_is_dead():
    return final_wave_dead
