# es\hiveship\mission_touchdown\unknown_9405a5b0.es
#
# Touchdown's shroud (bundle 9405A5B0, file name unknown; bubble 16, the
# activity's own). The Taken haze is up from the start. As the players come
# down into the shroud two Hive squads take their posts; the hall lure
# lights up at the spawn, and once a player heads into the hall the chasm
# lure takes over from it. The chasm lure goes out a few seconds after a
# player is through the hall fallback, which mission 2 opens.
#
# One retail 2.3.1 run. Retail lit the chasm lure a second after the player
# looked at the hall lure (its look trigger, which no native reads); here it
# lights as the player walks into the hall, five seconds later in that run.
# No placement is on the wire: the two squads with tasks are placed with
# them, the rest are left for a run that shows them.

@activity_bundle(0x9405A5B0)

objective infiltrate_objective
@objective(infiltrate_objective)
squad cave2_h1_squad
@objective(infiltrate_objective)
squad hall1_h1_squad
object hall_lure
object chasm_lure
taken_fx_controller taken_fx
player_trigger shroud_trigger
player_trigger hall_kickoff_trigger
player_trigger hall_fallback_trigger
player_trigger chasm_kickoff_trigger
encounter_handle unknown_5476e5b1

@startup()
script sc_shroud():
    taken_fx.create(0)
    sleep_until(shroud_trigger.is_triggered())
    cave2_h1_squad.set_task("0x88697CA4")
    cave2_h1_squad.place()
    hall1_h1_squad.set_task("0xC73B9F5D")
    hall1_h1_squad.place()

@startup()
# the lures that lead the players through the hall to the chasm
script sc_lures():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    hall_lure.create()
    hall_kickoff_trigger.reset()
    sleep_until(hall_kickoff_trigger.is_triggered())
    chasm_lure.create()
    chasm_kickoff_trigger.reset()
    unknown_5476e5b1.tch0020_ghost_dialogue.start()
    sleep(2)
    hall_lure.delete_object()
    sleep_until(hall_fallback_trigger.is_triggered())
    sleep(4)
    chasm_lure.delete_object()
