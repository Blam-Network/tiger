# es\venus\fallen_dock\enc_fallen_dock_m06.es
#
# Scourge of Winter's dock, in front of the Winter ketch. The den's exit,
# the near dock, its anchor and every sniper stand from the load. A skiff
# comes in at its trigger and drops a squad on the near dock fourteen
# seconds later, leaving five seconds after that. Each dock trigger brings
# the next stretch on: the bridge and the bay's front squad, then the
# second bridge squad three seconds on; the far bridge; the bay's vandals
# and its captain a second apart. The dock is clear once everything placed
# is dead: the music and mission 2 wait on it.
#
# From one retail 2.3.1 capture: the squads' bodies (@member_counts) are the
# kill tallies, the skiff's paths are its command scripts atom for atom (its
# third script came in undecoded, so the skiff is left to leave by itself),
# and never placed in that run were sq_dock03 and sq_bay02. Two task names
# are uncracked (hashes).

@activity_bundle("enc_fallen_dock_m06")

objective obj_fallen_dock_m06
static_array<object, 15> candy_dynamic_objects
static_array<object, 5> candy_explosive_objects
@member_counts({dregs: 3, vandals: 2})
squad sq_den_entrance
@member_counts({dregs: 3, servitor: 1})
squad sq_dock01
@member_counts({dregs: 3, vandal: 1})
squad sq_dock02
squad sq_dock03
@member_counts({shanks: 4})
squad sq_dock04
@member_counts({captain: 1, vandal: 2})
squad sq_dock_anchor
squad sq_dock_sniper01
squad sq_dock_sniper02
@member_counts({shanks: 3})
squad sq_bridge01
@member_counts({dreg: 3, vandal: 1})
squad sq_bridge02
@member_counts({dreg: 3, vandals: 2})
squad sq_bridge03
squad sq_bridge_sniper01
squad sq_bridge_sniper02
@member_counts({dregs: 4})
squad sq_bay01
squad sq_bay02
squad sq_bay_captain
@member_counts({vandals: 2})
squad sq_bay_vandals
squad sq_bay_sniper01
squad sq_bay_sniper02
squad sq_skiff
squad_member sq_skiff__pilot
control_point_set cps_skiff_enter
control_point_set cps_skiff_exit
trigger_volume tv_skiff
player_trigger pt_skiff bind(tv_skiff)
trigger_volume tv_dock01
player_trigger pt_dock01 bind(tv_dock01)
trigger_volume tv_dock03
player_trigger pt_dock03 bind(tv_dock03)
trigger_volume tv_bay01
player_trigger pt_bay01 bind(tv_bay01)
bool dock_entered = false
bool bay_placed = false
bool dock_clear = false

@startup()
script sc_dock():
    dock_entered = true
    for candy in candy_dynamic_objects:
        candy.create()
    for candy in candy_explosive_objects:
        candy.create()
    for sq in dock_squads():
        sq.set_objective(obj_fallen_dock_m06)
    for sq in [sq_dock03, sq_bay02]:
        sq.set_objective(obj_fallen_dock_m06)
    place_on_task(sq_den_entrance, "den_entrance")
    place_on_task(sq_dock01, "0x4BDC9FAC")
    place_on_task(sq_dock04, "0x4BDC9FAC")
    place_on_task(sq_dock_anchor, "dock_anchor")
    place_on_task(sq_dock_sniper01, "dock_snipers")
    place_on_task(sq_dock_sniper02, "dock_snipers")
    place_on_task(sq_bridge_sniper01, "bridge_snipers")
    place_on_task(sq_bridge_sniper02, "bridge_snipers")
    place_on_task(sq_bay_sniper01, "bay_entrance")
    place_on_task(sq_bay_sniper02, "bay_entrance")
    sc_clear.wake()

@startup()
script sc_skiff():
    sleep_until(pt_skiff.is_triggered())
    sq_skiff__pilot.place()
    sq_skiff__pilot.execute(cs_skiff_enter(cps_skiff_enter))
    sleep(14)
    sq_dock02.set_task("0x4BDC9FAC")
    sq_skiff__pilot.drop_squad(sq_dock02)
    sleep(5)
    sq_skiff__pilot.execute(cs_skiff_exit(cps_skiff_exit))

@startup()
script sc_bridge():
    sleep_until(pt_dock01.is_triggered())
    place_on_task(sq_bridge01, "dock_bridge")
    place_on_task(sq_bay01, "vandals")
    sleep(3)
    place_on_task(sq_bridge02, "dock_bridge")

@startup()
script sc_far_bridge():
    sleep_until(pt_dock03.is_triggered())
    place_on_task(sq_bridge03, "0xF8C20A57")

@startup()
script sc_bay():
    sleep_until(pt_bay01.is_triggered())
    place_on_task(sq_bay_vandals, "captain")
    sleep(1)
    place_on_task(sq_bay_captain, "bay_anchor")
    bay_placed = true

# the dock is clear once the bay is out and everything placed is dead
script sc_clear():
    sleep_until(bay_placed)
    sleep_until(dock_alive() == 0)
    dock_clear = true

def dock_squads():
    return [sq_den_entrance, sq_dock01, sq_dock02, sq_dock04, sq_dock_anchor, sq_dock_sniper01, sq_dock_sniper02, sq_bridge01, sq_bridge02, sq_bridge03, sq_bridge_sniper01, sq_bridge_sniper02, sq_bay01, sq_bay_captain, sq_bay_vandals, sq_bay_sniper01, sq_bay_sniper02]

def dock_alive():
    alive = 0
    for sq in dock_squads():
        alive = alive + sq.alive_count()
    return alive

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

# the skiff comes in over the water to the near dock and opens up
command_script cs_skiff_enter(path):
    snap_to(path, 0)
    ability("dropship", "0x4A82B0FF")
    move_to(path, 1, false)
    face(path, 1)
    move_to(path, 2, false)
    face(path, 2)
    move_to(path, 3, true)
    face(path, 3)
    set_channel_scalar("doors", 1)

command_script cs_skiff_exit(path):
    move_to(path, 0, false)
    face(path, 0)
    set_channel_scalar("doors", 0)
    move_to(path, 1, false)
    face(path, 1)
    move_to(path, 2, false)
    face(path, 2)
    ability("dropship", "exit_25")
