# es\moon\act_moon_m1_launchtubes\unknown_43f9e8c0.es
#
# The launch tubes in The Dark Beyond: the gate the Hive come through once
# the player is back from the cinematic, the court beyond it, and the Knight
# who guards the Ghost.
# From two 2.3.1 runs (2026-10-03 and 2026-10-24) and a wipe at the gate in
# the second: the gate's steps run from the moment the player is back in the
# tubes after the cinematic, to within a second each time. Never on
# the wire: the tubes, the end ramps and the hecate triggers, so none of
# those squads is scripted.

@activity_bundle(0x43F9E8C0)

object o_gate_lock01
object o_gate_lock02
object o_gate_lock03
player_trigger pt_spawn_court_turret
player_trigger pt_spawn_court_interior
trigger_volume_objective pf_trigger_ghost
cinematic_midmission pf_cine_110_mst
objective obj_launchtubes_ch01_m03_friendly
squad sq_gate_knights
squad sq_gate_thrall_intro
squad sq_gate_thrall_a
squad sq_gate_thrall_c
squad sq_gate_thrall_d
squad sq_court_low_a
squad sq_court_high_a
squad sq_court_high_a_b
squad sq_court_high_b
squad sq_court_high_b_melee
performance sq_court_high_b_major_spawn_performance

@startup()
script sc_launchtubes_main():
    sq_court_high_b.set_objective(obj_launchtubes_ch01_m03_friendly)
    sq_court_high_b_melee.set_objective(obj_launchtubes_ch01_m03_friendly)
    sc_gate.wake()
    sc_court_major.wake()

# The player is back at the gate after the Hive cinematic (the tubes' own
# state, which runs this bundle, comes back with him): the locks come off,
# the court's triggers arm, and the gate's Knights and the first Thrall come
# out, the other Thrall a second apart after them.
script sc_gate():
    sleep_until(pf_cine_110_mst._cinematic.is_done())
    o_gate_lock01.delete_object()
    o_gate_lock02.delete_object()
    o_gate_lock03.delete_object()
    sleep(1)
    pt_spawn_court_turret.reset()
    pt_spawn_court_interior.reset()
    sc_court_turret.wake()
    sc_court_interior.wake()
    sleep(1)
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
