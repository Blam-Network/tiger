# es\mars\lowergarden\enc_lowergarden_portal3.es
#
# The lower garden in the Hypogeum strike: five Vex ambushes that go in as
# players walk into their volumes, and the hold at the gate. Mission 1 wakes
# the hold as a player reaches the gate: the garden's door comes up behind
# them and opens, then the Vex come in three waves of clouds, the third with
# the hydra's clouds and the two snipers, and two last harpy clouds. The
# garden is clear once every wave is dead.
#
# One 2.3.1 run, seen by both players (the second held the garden's AI, so
# only its capture has the waves' squads). Its waves came 48, 108 and 151 s
# after the gate, the snipers 10 s and the harpies 15 s after the third. Each
# wave also came a few seconds after the one before was dead (wave 2 3.3 s,
# wave 3 5.4 s, the harpies 0.4 s after the hydra's clouds); the clock from
# the gate fits all four to within a second, so the hold runs on it.

@activity_bundle("enc_lowergarden_portal3")

object o_lowergarden_door
player_trigger pt_gate
objective obj_lowergarden_portal3
squad sq_sniper_right
squad sq_sniper_left
ambush_encounter smp_lower1
ambush_encounter smp_lower2
ambush_encounter smp_lower3
ambush_encounter smp_lower4
ambush_encounter smp_lower5
dropship_encounter wave_1_back
dropship_encounter wave_1_front
dropship_encounter wave_1_front_1
dropship_encounter wave_boss
dropship_encounter wave_2_front
dropship_encounter wave_2_top
dropship_encounter wave_2_top_1
dropship_encounter wave_2_harpy1
dropship_encounter wave_2_harpy2
dropship_encounter vexcloud_lowgarden
dropship_encounter wave_3_back
dropship_encounter cloud_hydra_left
dropship_encounter cloud_hydra_right
dropship_encounter cloud_hydra_front
dropship_encounter wave_3_harpy1
dropship_encounter wave_3_harpy2
bool b_waves_cleared = false

@startup()
script sc_lowergarden():
    for sq in [sq_sniper_right, sq_sniper_left]:
        sq.set_objective(obj_lowergarden_portal3)

# the hold, from a player at the gate (mission 1)
script sc_gate():
    sleep(1)
    o_lowergarden_door.create()
    sleep(1.5)
    o_lowergarden_door.set_device_position(1)
    sleep(46)
    for wave in [wave_1_back, wave_1_front, wave_1_front_1, wave_boss]:
        wave.activate()
    sleep(59.5)
    for wave in [wave_2_front, wave_2_top, wave_2_top_1, wave_2_harpy1, wave_2_harpy2]:
        wave.activate()
    sleep(43)
    for wave in [vexcloud_lowgarden, wave_3_back, cloud_hydra_left, cloud_hydra_right, cloud_hydra_front]:
        wave.activate()
    sleep(10)
    for sq in [sq_sniper_right, sq_sniper_left]:
        sq.set_task("snipers")
        sq.place()
    sleep(5.5)
    for wave in [wave_3_harpy1, wave_3_harpy2]:
        wave.activate()
    sleep(1)
    sleep_until(waves_alive_count() == 0)
    b_waves_cleared = true

def waves_alive_count():
    count = 0
    for wave in [wave_1_back, wave_1_front, wave_1_front_1, wave_boss, wave_2_front, wave_2_top, wave_2_top_1, wave_2_harpy1, wave_2_harpy2, vexcloud_lowgarden, wave_3_back, cloud_hydra_left, cloud_hydra_right, cloud_hydra_front, wave_3_harpy1, wave_3_harpy2]:
        count = count + wave._squad_group.alive_count()
    return count
