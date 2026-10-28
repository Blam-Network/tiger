# es\venus\mission_pursuit\unknown_53a9d3d7.es
#
# The dock in mission_pursuit. From the dock's load Skolas stands in his
# performance behind the laser web, with the flat's dregs, the cliff's
# snipers and the summit's vandals and captain. Mission 2 wakes sc_skolas
# once a player has found him: the web's two pushers drop and Skolas is cued
# three seconds on; some ten seconds after that he flees in a second
# performance, and once he is gone mission 2 moves on. The cliff's exploder
# shanks come out at their trigger, and the cliff skiff comes in at its own,
# drops the cliff's dregs and servitors over twenty seconds and leaves. Once
# the summit's captain is dead the web opens: its light comes up and every
# block of it goes.
#
# From two retail 2.3.1 captures (2026-10-27 20-30-51, 2026-10-29 02-33-01;
# Skolas' cue and flee hold in both, the skiff's gaps are the first's). Rosters
# (@member_counts) are the wire's squad rosters; the skiff's command scripts
# are retail's atom for atom, its abilities and Skolas' performances
# uncracked.

@activity_bundle(0x53A9D3D7)

object laserweb_object
object laserweb_pusher_1_object
object laserweb_pusher_2_object
object laserweb_nutblock_1_object
object laserweb_nutblock_2_object
object laserweb_nutblock_3_object
object laserweb_nutblock_4_object
object laserweb_nutblock_5_object
object laserweb_nutblock_6_object
objective main_objective
squad skolas_squad
squad_member skolas_squad__skolas
@member_counts([{dreg: 3}, {dreg: 3}, {dreg: 3}])
static_array<squad, 3> flat_dreg_squads
@member_counts([{shank_exploder: 2}, {shank_exploder: 2}, {shank_exploder: 2}, {shank_exploder: 2}])
static_array<squad, 4> cliff_shank_exploder_squads
@member_counts([{shank_sniper: 3}, {shank_sniper: 3}])
static_array<squad, 2> cliff_shank_sniper_squads
squad cliff_skiff_squad
squad_member cliff_skiff_squad__pilot
@member_counts([{dreg: 3}, {dreg: 3}, {dreg: 3}])
static_array<squad, 3> cliff_dreg_squads
@member_counts([{servitor: 1}, {servitor: 1}])
static_array<squad, 2> cliff_servitor_squads
@member_counts([{vandal: 3}, {vandal: 3}])
static_array<squad, 2> summit_vandal_squads
@member_counts([{captain_major: 2}])
static_array<squad, 1> summit_captain_major_squads
performance skolas_flee_performance
player_trigger skolas_flee_player_trigger
player_trigger cliff_shank_exploder_player_trigger
player_trigger cliff_skiff_player_trigger
control_point_set cliff_skiff_enter_point_sequence
control_point_set cliff_skiff_exit_point_sequence
bool skolas_fled = false
bool summit_clear = false

@startup()
# the dock's load: every squad against the dock's objective, the web,
# Skolas and the Fallen already in place
script sc_dock():
    for sq in [skolas_squad, flat_dreg_squads[0], flat_dreg_squads[1], flat_dreg_squads[2], cliff_shank_exploder_squads[0], cliff_shank_exploder_squads[1], cliff_shank_exploder_squads[2], cliff_shank_exploder_squads[3]]:
        sq.set_objective(main_objective)
    for sq in [cliff_shank_sniper_squads[0], cliff_shank_sniper_squads[1], cliff_dreg_squads[0], cliff_dreg_squads[1], cliff_dreg_squads[2], cliff_servitor_squads[0], cliff_servitor_squads[1]]:
        sq.set_objective(main_objective)
    for sq in [summit_vandal_squads[0], summit_vandal_squads[1], summit_captain_major_squads[0]]:
        sq.set_objective(main_objective)
    laserweb_object.create()
    for block in laserweb_blocks():
        block.create()
    skolas_squad.place()
    skolas_flee_performance.start_performance("0xFBD6E11B")
    for sq in flat_dreg_squads:
        place_on_task(sq, "flat_dreg_task")
    for sq in cliff_shank_sniper_squads:
        place_on_task(sq, "cliff_shank_sniper_task")
    for sq in summit_vandal_squads:
        place_on_task(sq, "summit_vandal_task")
    place_on_task(summit_captain_major_squads[0], "summit_captain_major_task")
    # the web opens once the summit's captain is dead
    sleep_until(summit_captain_major_squads[0].alive_count() > 0)
    sleep_until(summit_captain_major_squads[0].alive_count() == 0)
    laserweb_object.set_device_position(1)
    for block in laserweb_blocks():
        block.delete_object()
    summit_clear = true

# mission 2: Skolas is found
script sc_skolas():
    laserweb_pusher_1_object.delete_object()
    laserweb_pusher_2_object.delete_object()
    sleep(3)
    skolas_flee_performance.cue_performance("0x62D7D596")
    # he flees 9.9 and 11.3 s after the cue in the two runs (10.5 and 10.4 s
    # after he is first hit, which the host is not told); not on his health
    # (61% and 32% left) nor on the flat's dregs (all three packs still up in
    # the second run)
    sleep(10.5)
    skolas_flee_performance.start_performance("0xD5B8056C")
    sleep_until(skolas_squad.alive_count() == 0)
    skolas_fled = true

@startup()
script sc_cliff_exploders():
    sleep_until(cliff_shank_exploder_player_trigger.is_triggered())
    for sq in cliff_shank_exploder_squads:
        place_on_task(sq, "cliff_shank_exploder_task")

@startup()
# the cliff skiff drops a squad every four or five seconds
script sc_cliff_skiff():
    sleep_until(cliff_skiff_player_trigger.is_triggered())
    ship = cliff_skiff_squad__pilot
    ship.place()
    ship.execute(cs_skiff_enter(cliff_skiff_enter_point_sequence, "0x4182C3AF"))
    sleep(4.2)
    drop_on_task(ship, cliff_dreg_squads[0], "cliff_dreg_task")
    sleep(5.2)
    drop_on_task(ship, cliff_servitor_squads[0], "cliff_servitor_task")
    drop_on_task(ship, cliff_servitor_squads[1], "cliff_servitor_task")
    sleep(3.8)
    drop_on_task(ship, cliff_dreg_squads[1], "cliff_dreg_task")
    sleep(5.2)
    drop_on_task(ship, cliff_dreg_squads[2], "cliff_dreg_task")
    sleep(5.3)
    ship.execute(cs_skiff_exit(cliff_skiff_exit_point_sequence, "0x820E5E4B"))

def laserweb_blocks():
    return [laserweb_pusher_1_object, laserweb_pusher_2_object, laserweb_nutblock_1_object, laserweb_nutblock_2_object, laserweb_nutblock_3_object, laserweb_nutblock_4_object, laserweb_nutblock_5_object, laserweb_nutblock_6_object]

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def drop_on_task(ship, sq, task):
    sq.set_task(task)
    ship.drop_squad(sq)

command_script cs_skiff_enter(path, entrance):
    snap_to(path, 0)
    set_flag(3, 3)
    ability("dropship", entrance)

command_script cs_skiff_exit(path, exit):
    move_to(path, 0, false)
    ability("dropship", exit)
