# es\cosmo\mission_elevator\unknown_73410941.es
#
# The ship's hangar in the elevator mission, taken over by the Taken: their
# snipers and anchors hold it as the bubble loads, and the psion trigger
# brings in the two psion squads. From one retail capture. The psions came
# back once, 4 s after both squads were wiped; one run is not enough to say
# how often, so that is left out.

@activity_bundle(0x73410941)

objective mission_elevator_ship_objective
@objective(mission_elevator_ship_objective)
squad sniper_left_squad
@objective(mission_elevator_ship_objective)
squad sniper_back_squad
@objective(mission_elevator_ship_objective)
squad psion_right_squad
@objective(mission_elevator_ship_objective)
squad psion_left_squad
@objective(mission_elevator_ship_objective)
squad anchor_left_squad
@objective(mission_elevator_ship_objective)
squad anchor_right_squad
taken_fx_controller taken_fx_controller_ship
trigger_volume psion_spawn_volume
player_trigger psion_spawn_trigger bind(psion_spawn_volume)

@startup()
script sc_ship_main():
    taken_fx_controller_ship.create(0.9)
    sniper_left_squad.set_task("sniper")
    sniper_back_squad.set_task("sniper_back")
    anchor_left_squad.set_task("anchor_left")
    anchor_right_squad.set_task("anchor_right")
    for sq in [sniper_left_squad, sniper_back_squad, anchor_left_squad, anchor_right_squad]:
        sq.place()
    sc_psions.wake()

script sc_psions():
    sleep_until(psion_spawn_trigger.is_triggered())
    sleep(1)
    psion_right_squad.set_task("psion_right")
    psion_left_squad.set_task("psion_left")
    psion_right_squad.place()
    psion_left_squad.place()
