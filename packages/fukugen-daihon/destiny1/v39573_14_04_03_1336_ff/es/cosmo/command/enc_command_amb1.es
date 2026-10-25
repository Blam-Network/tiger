# es\cosmo\command\enc_command_amb1.es
#
# The command center's ambient layer: Fallen on the switchbacks from the
# load, the lunchroom, the T-junction and the lookout (with its
# mini-boss) as a player reaches each one's spawn volume.
#
# No capture has been in the command center (retail never sent this
# bundle). The rule is read off the rows: each pm_*_spawn monitor's
# volume wakes the squads named for it, the switchback squads take the
# switchback01 tasks. The other tasks of obj_fallen_command are left to
# the objective.
#
# A private bubble's world is built again each time a player comes in
# (retail's hangar: both squads back on their first tasks when the
# player came back 340 s after leaving), so these squads are placed
# once, at the load, with no respawn of their own.

@activity_bundle("enc_command_amb1")

object o_command_warsats01  # WARNING: unused - a story object, no capture
objective obj_fallen_command
squad sq_fallen_lunchroom01
squad sq_fallen_tjunc02a
squad sq_fallen_tjunc02b
squad sq_fallen_switchback01a
squad sq_fallen_switchback01b
squad sq_fallen_switchback02a
squad sq_fallen_lookout_mboss01
squad sq_fallen_lookout_mid01
squad sq_fallen_lookout_mid02
squad sq_fallen_lookout_left01
squad sq_fallen_lookout_right01
trigger_volume tv_lunchroom_spawn01
player_monitor pm_lunchroom_spawn01 bind(tv_lunchroom_spawn01)
trigger_volume tv_command_tjunc02_spawn
player_monitor pm_command_tjunc02_spawn bind(tv_command_tjunc02_spawn)
trigger_volume tv_command_main_spawn
player_monitor pm_command_main_spawn bind(tv_command_main_spawn)
squad_group sg_fallen_tjunc02
squad_group sg_fallen_switchback_high
squad_group sg_fallen_switchback_low
squad_group sg_fallen_lookout_core  # WARNING: unused - no squad of the bundle is named for it
squad_group sg_fallen_lookout_aux  # WARNING: unused - no squad of the bundle is named for it
squad_group sg_fallen_lookout_mid

@startup()
script sc_switchbacks():
    sg_fallen_switchback_low.add_child(sq_fallen_switchback01a)
    sg_fallen_switchback_low.add_child(sq_fallen_switchback01b)
    sg_fallen_switchback_high.add_child(sq_fallen_switchback02a)
    hold(sq_fallen_switchback01a, "switchback01_low")
    hold(sq_fallen_switchback01b, "switchback01_low")
    hold(sq_fallen_switchback02a, "switchback01_high")

@startup()
script sc_lunchroom():
    sleep_until(pm_lunchroom_spawn01.test_any_inside())
    sq_fallen_lunchroom01.set_objective(obj_fallen_command)
    sq_fallen_lunchroom01.place()

@startup()
script sc_tjunction():
    sg_fallen_tjunc02.add_child(sq_fallen_tjunc02a)
    sg_fallen_tjunc02.add_child(sq_fallen_tjunc02b)
    sleep_until(pm_command_tjunc02_spawn.test_any_inside())
    obj_fallen_command.add_squad(sg_fallen_tjunc02)
    sg_fallen_tjunc02.place()

@startup()
script sc_lookout():
    sg_fallen_lookout_mid.add_child(sq_fallen_lookout_mid01)
    sg_fallen_lookout_mid.add_child(sq_fallen_lookout_mid02)
    sleep_until(pm_command_main_spawn.test_any_inside())
    for sq in [sq_fallen_lookout_mboss01, sq_fallen_lookout_left01, sq_fallen_lookout_right01]:
        sq.set_objective(obj_fallen_command)
        sq.place()
    obj_fallen_command.add_squad(sg_fallen_lookout_mid)
    sg_fallen_lookout_mid.place()

def hold(sq, task):
    sq.set_objective(obj_fallen_command)
    sq.set_task(task)
    sq.place()
