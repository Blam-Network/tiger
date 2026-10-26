# es\moon\wisdom\enc_wisdom_amb1.es
#
# The Hall of Wisdom's encounters (the Moon's private bubble 13, between the
# accelerator and the Lower Citadel), loaded by the Moon's story missions and
# patrol: the Hive at the landing, the hub and the bridge, and the cutter
# that brings the bridge's Thrall.
#
# Pooled over act_moon_m3_lowercitadel's two runs through the hall
# (2026-10-25 18-12-35#1 and the 2026-10-03 World's Grave capture #1):
# - Up as the bubble loads (both runs): the landing's troopers and Wizard,
#   the hub's troopers and Wizard, the bridge troopers and the Nightmask.
# - pt_spawn_thrall sends the cutter in 0.9-1.3 s later with the two bridge
#   Thrall squads, three each; as they die they are brought back, four or so
#   more each (four to six), and the bridge Wizards go in 8 s after the
#   cutter. The cutter left 22 s after it came in (both runs).
# - pt_dont_spawn_thrall came after pt_spawn_thrall in both runs; read here
#   as the way past the bridge that skips the cutter when a player gets there
#   first.
# - Bodies are the ones the server placed; tasks are the hall objective's,
#   by name (the Nightmask had none).
# Left out: the reactor squads, the landing and hub Thrall, the reactor
# despawn and pt_spawn_landing, which placed nothing new in either run. The
# cutter flies its entry and exit paths as the paths stand; its atoms were
# not copied.

@activity_bundle("enc_wisdom_amb1")

objective obj_wisdom_amb1
trigger_volume tv_spawn_thrall
player_trigger pt_spawn_thrall bind(tv_spawn_thrall)
trigger_volume tv_dont_spawn_thrall
player_trigger pt_dont_spawn_thrall bind(tv_dont_spawn_thrall)
@member_counts({trooper: 3})
squad sq_landing_trooper
@member_counts({boomer: 1, trooper: 3})
squad sq_landing_wizard
@member_counts({trooper: 3})
squad sq_hub_trooper
squad sq_hub_wizard
@member_counts({trooper: 3, knight: 1})
squad sq_bridge_trooper
squad sq_bridge_nightmask
squad sq_cutter
squad_member sq_cutter__pilot
control_point_set cps_cutter_1_entry
control_point_set cps_cutter_1_exit
@member_counts({thrall: 3})
squad sq_bridge_thrall
@member_counts({thrall: 3})
squad sq_bridge_thrall_b
@member_counts({wizard: 1, wizard_1: 2})
squad sq_bridge_wizard

@startup()
script sc_main_thread():
    place_on_task(sq_landing_trooper, "landing")
    place_on_task(sq_landing_wizard, "landing")
    place_on_task(sq_hub_trooper, "hub")
    place_on_task(sq_hub_wizard, "0xCEA4A494")
    place_on_task(sq_bridge_trooper, "bridge")
    sq_bridge_nightmask.set_objective(obj_wisdom_amb1)
    sq_bridge_nightmask.place()

@startup()
script sc_bridge_thrall():
    sleep_until(pt_spawn_thrall.is_triggered() or pt_dont_spawn_thrall.is_triggered())
    if not pt_spawn_thrall.is_triggered():
        return
    sleep(1)
    sc_bridge_wizard.wake()
    for sq in [sq_bridge_thrall, sq_bridge_thrall_b]:
        sq.set_objective(obj_wisdom_amb1)
        sq.set_task("bridge_thrall")
    sq_cutter.place()
    sq_cutter__pilot.execute(cps_cutter_1_entry); sleep_until(sq_cutter__pilot.get_command_script_state() != e_command_script_state.executing)
    sq_cutter__pilot.drop_squad(sq_bridge_thrall)
    sq_cutter__pilot.drop_squad(sq_bridge_thrall_b); sleep_until(not sq_cutter__pilot.is_dropping())
    sc_thrall_a_reinforce.wake()
    sc_thrall_b_reinforce.wake()
    sq_cutter__pilot.execute(cps_cutter_1_exit); sleep_until(sq_cutter__pilot.get_command_script_state() != e_command_script_state.executing)
    sq_cutter.remove()

script sc_bridge_wizard():
    sleep(8)
    place_on_task(sq_bridge_wizard, "bridge")

script sc_thrall_a_reinforce():
    reinforce(sq_bridge_thrall)

script sc_thrall_b_reinforce():
    reinforce(sq_bridge_thrall_b)

def reinforce(sq):
    for i in range(2):
        sleep_until(sq.alive_count() <= 1)
        sq.respawn()

def place_on_task(sq, task):
    sq.set_objective(obj_wisdom_amb1)
    sq.set_task(task)
    sq.place()
