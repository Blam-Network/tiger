# es\cosmo\mission_elevator\unknown_4a0f2dd9.es
#
# The blast in the elevator mission: Fallen and Taken already fight there as
# the bubble loads, a skiff hovering. The skiff drops a Fallen squad and
# leaves. The blights trigger opens three blights, the Taken come through
# them and the blights close again a few seconds on. The skiff flies the
# command scripts retail sent, atom for atom. Names that were never cracked
# are written as "0x" literals. From one retail capture: every wait is that
# run's, and the blast's squads were never sensed by the client, so no death
# shows. The two initial blights had opened and closed before the player
# came (their objects were on their second incarnation at the first
# snapshot); that happens out of sight, so it is not written.

@activity_bundle(0x4A0F2DD9)

objective mission_elevator_blast_objective
@objective(mission_elevator_blast_objective)
squad initial_fallen_squad01
@objective(mission_elevator_blast_objective)
squad initial_fallen_squad02
@objective(mission_elevator_blast_objective)
squad initial_taken_squad01
@objective(mission_elevator_blast_objective)
squad initial_taken_squad02
@objective(mission_elevator_blast_objective)
squad taken_left_squad01
@objective(mission_elevator_blast_objective)
squad taken_right_squad01
@objective(mission_elevator_blast_objective)
squad center_anchor_squad
@objective(mission_elevator_blast_objective)
squad taken_sniper_mid_squad01
@objective(mission_elevator_blast_objective)
squad taken_sniper_mid_squad02
@objective(mission_elevator_blast_objective)
squad taken_sniper_left_squad
@objective(mission_elevator_blast_objective)
squad taken_sniper_right_squad
@objective(mission_elevator_blast_objective)
squad dropship_fallen_squad
@objective(mission_elevator_blast_objective)
squad skiff_squad
squad_member skiff_squad__pilot
control_point_set dropship_entry_path
control_point_set dropship_exit_path
taken_blight initial_blight01
taken_blight initial_blight02
taken_blight left_blight
taken_blight right_blight
taken_blight center_blight
taken_fx_controller taken_fx_controller_blast
object mega_schism_loop
object mega_schism_loop_1
object mega_schism_loop_2
trigger_volume blights_volume
player_trigger blights_trigger bind(blights_volume)

@startup()
script sc_blast_main():
    for o in [mega_schism_loop, mega_schism_loop_1, mega_schism_loop_2]:
        o.create()
    taken_fx_controller_blast.create(0.9)
    initial_fallen_squad01.set_task("initial_fallen")
    initial_fallen_squad02.set_task("initial_fallen")
    initial_taken_squad01.set_task("initial_taken")
    initial_taken_squad02.set_task("initial_taken")
    taken_sniper_mid_squad01.set_task("sniper_mid01")
    taken_sniper_mid_squad02.set_task("sniper_mid02")
    for sq in [initial_fallen_squad01, initial_fallen_squad02, initial_taken_squad01, initial_taken_squad02, taken_sniper_mid_squad01, taken_sniper_mid_squad02]:
        sq.place()
    sc_skiff.wake()
    sc_blights.wake()

script sc_skiff():
    skiff_squad__pilot.place()
    skiff_squad__pilot.execute(cs_skiff_enter(dropship_entry_path))
    # the drop came 12.7 s after the bubble loaded
    sleep(12.5)
    dropship_fallen_squad.set_task("dropship_fallen")
    skiff_squad__pilot.drop_squad(dropship_fallen_squad)
    sleep(4)
    skiff_squad__pilot.execute(cs_skiff_exit(dropship_exit_path))

script sc_blights():
    sleep_until(blights_trigger.is_triggered())
    sleep(1)
    left_blight.open()
    right_blight.open()
    sleep(2)
    taken_sniper_left_squad.set_task("sniper_left")
    taken_sniper_right_squad.set_task("sniper_right")
    taken_sniper_left_squad.place()
    taken_sniper_right_squad.place()
    center_blight.open()
    sleep(1.5)
    taken_left_squad01.set_task("taken_left")
    taken_right_squad01.set_task("taken_right")
    taken_left_squad01.place()
    taken_right_squad01.place()
    sleep(2)
    center_anchor_squad.set_task("taken_anchor")
    center_anchor_squad.place()
    sleep(1)
    left_blight.close()
    right_blight.close()
    sleep(2)
    center_blight.close()

# the skiff comes in along its path, stops at the last point facing it and
# opens up
command_script cs_skiff_enter(path):
    move_to(path, 0, false)
    ability("dropship", "0x4A82B0FF")
    move_to(path, 1, false)
    face(path, 1)
    move_to(path, 2, true)
    face(path, 2)
    set_channel_scalar("doors", 1)

# and closes up and leaves along the other
command_script cs_skiff_exit(path):
    move_to(path, 0, false)
    face(path, 0)
    set_channel_scalar("doors", 0)
    move_to(path, 1, false)
    move_to(path, 2, false)
    ability("dropship", "0x7B0D3643")
