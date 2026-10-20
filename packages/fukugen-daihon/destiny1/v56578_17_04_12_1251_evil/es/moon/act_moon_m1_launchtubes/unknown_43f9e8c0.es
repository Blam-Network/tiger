# es\moon\act_moon_m1_launchtubes\unknown_43f9e8c0.es
#
# The launch tubes in The Dark Beyond: the gate the Hive come through once
# the player is back from the cinematic, the court beyond it, and the Knight
# who guards the Ghost. True name unknown.
# One capture: every ordering below is a single-run fact, nothing is
# confirmed. Never on the wire: the tubes, the end ramps and the hecate
# triggers, so none of those squads is scripted.

@activity_bundle(0x43F9E8C0)

object o_gate_lock01
object o_gate_lock02
object o_gate_lock03
player_trigger pt_spawn_court_turret
player_trigger pt_spawn_court_interior
trigger_volume_objective pf_trigger_ghost
cinematic_midmission pf_cine_110_mst
sequence seq_music_launchtubes
sequence seq_d_o2_s093
objective obj_launchtubes_ch01_m03_friendly
squad sq_gate_knights
squad sq_gate_thrall_intro
@member_counts({thrall: 1})
squad sq_gate_thrall_a
@member_counts({thrall: 1})
squad sq_gate_thrall_c
@member_counts({troopers: 1})
squad sq_gate_thrall_d
@member_counts({troopers: 1, 0x628B7A51: 1})
squad sq_court_low_a
@member_counts({troopers: 1, 0x628B7A51: 1, 0x628B7A52: 1})
squad sq_court_high_a
@member_counts({sq_court_high_a: 1})
squad sq_court_high_a_b
squad sq_court_high_b
performance sq_court_high_b_major_spawn_performance

@startup()
script sc_launchtubes_main():
    sq_court_high_b.set_objective(obj_launchtubes_ch01_m03_friendly)
    sc_gate.wake()
    sc_court_turret.wake()
    sc_court_interior.wake()
    sc_court_major.wake()

# The player is back at the gate after the Hive cinematic: the locks come off
# and the gate's Knights and the first Thrall come out.
script sc_gate():
    sleep_until(pf_cine_110_mst._cinematic.is_done())
    o_gate_lock01.delete_object()
    o_gate_lock02.delete_object()
    o_gate_lock03.delete_object()
    seq_music_launchtubes.set_switch_mask(15)
    seq_d_o2_s093.start()
    sleep(2)
    pt_spawn_court_turret.reset()
    pt_spawn_court_interior.reset()
    sq_gate_knights.set_objective(obj_launchtubes_ch01_m03_friendly)
    sq_gate_thrall_intro.set_objective(obj_launchtubes_ch01_m03_friendly)
    sq_gate_knights.set_task("0x08537110")
    sq_gate_knights.place()
    sq_gate_thrall_intro.set_task("0xEC99A71D")
    sq_gate_thrall_intro.place()
    sleep(2)
    sq_gate_thrall_c.set_objective(obj_launchtubes_ch01_m03_friendly)
    sq_gate_thrall_intro.set_task("0xA422EB12")
    sleep(1)
    sq_gate_thrall_d.set_objective(obj_launchtubes_ch01_m03_friendly)
    sleep(1)
    sq_gate_thrall_a.set_objective(obj_launchtubes_ch01_m03_friendly)

script sc_court_turret():
    sleep_until(pt_spawn_court_turret.is_triggered())
    sq_court_low_a.set_objective(obj_launchtubes_ch01_m03_friendly)
    sq_court_low_a.set_task("0x229BBEA8")

script sc_court_interior():
    sleep_until(pt_spawn_court_interior.is_triggered())
    sq_court_high_a.set_objective(obj_launchtubes_ch01_m03_friendly)
    sq_court_high_a_b.set_objective(obj_launchtubes_ch01_m03_friendly)
    sq_court_high_a.set_task("0x9F6DB313")
    sq_court_high_a_b.set_task("0x9F6DB313")

# The Knight comes in when the player reaches the Ghost.
script sc_court_major():
    sleep_until(pf_trigger_ghost._player_trigger.is_triggered())
    sq_court_high_b.set_task("0x5DC1A5B7")
    sq_court_high_b.place()
    sq_court_high_b_major_spawn_performance.start_performance("0x567ACCC7")
