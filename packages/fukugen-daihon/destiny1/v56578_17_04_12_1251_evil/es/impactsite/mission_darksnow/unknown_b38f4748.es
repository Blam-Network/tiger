# es\impactsite\mission_darksnow\unknown_b38f4748.es
#
# The stronghold at the impact site in mission_darksnow (bundle B38F4748,
# file name unknown; bubble 3, the activity's own). Two Cabal crawl out of
# the wreckage as the players come near, a ship takes off as the stronghold
# phase starts, a fighter buzzes the players, and the Cabal at the back fall
# back as a dropship flies over. On the bridge the door and the panels blow,
# then the roof as the players reach the middle, the ship lifts off and the
# Ghost talks; the explosions die down five seconds later.
#
# One retail 2.3.1 run: every hold is its gap. No placement is on the wire:
# the two squads with a task are placed with it, the rest are left for a
# run that shows them. The dropship, the panic and door-fall performances
# and the third crawler never moved.

@activity_bundle(0xB38F4748)

object takeoff_object
object stronghold_strobelight_object
object buzzby_object
objective mission_darksnow_impactsite_objective
@objective(mission_darksnow_impactsite_objective)
squad mid_squad
squad_member mid_squad__legionary_waving_arms
@objective(mission_darksnow_impactsite_objective)
squad mid_anchor_squad
@objective(mission_darksnow_impactsite_objective)
squad below_ledge_squad
@objective(mission_darksnow_impactsite_objective)
squad back_anchor_squad
@objective(mission_darksnow_impactsite_objective)
squad ledge_squad
@objective(mission_darksnow_impactsite_objective)
squad running_cabal_squad
@objective(mission_darksnow_impactsite_objective)
squad dropship_squad
squad cabal_crawler
squad_member cabal_crawler__crawler1
squad_member cabal_crawler__crawler2
squad_member cabal_crawler__crawler3
sequence door_explosion_fx_sequence
sequence panel_explosion_fx_sequence01
sequence panel_explosion_fx_sequence02
sequence roof_explosion_fx_sequence
sequence roof_smoke_fx_sequence
sequence damage_sequence
trigger_volume flee_spawn_volume
player_trigger flee_spawn_trigger bind(flee_spawn_volume)
trigger_volume buzzby_volume
player_trigger buzzby_trigger bind(buzzby_volume)
trigger_volume flyover_volume
player_trigger flyover_trigger bind(flyover_volume)
trigger_volume bridge_volume
player_trigger bridge_trigger bind(bridge_volume)
trigger_volume mid_anchor_volume
player_trigger mid_anchor_trigger bind(mid_anchor_volume)
trigger_volume tv_cabal_crawler1
player_trigger pt_cabal_crawler1 bind(tv_cabal_crawler1)
performance cabal_crawl_from_wreckage
trigger_volume tv_cabal_crawler2
player_trigger pt_cabal_crawler2 bind(tv_cabal_crawler2)
performance cabal_crawl_from_wreckage2
trigger_volume tv_cabal_crawler3
player_trigger pt_cabal_crawler3 bind(tv_cabal_crawler3)
encounter_handle unknown_1702136e

@startup()
script sc_stronghold():
    stronghold_strobelight_object.create()
    stronghold_strobelight_object.set_device_position(0)
    cabal_crawler__crawler1.place()
    cabal_crawl_from_wreckage.start_performance("0xC654F1BB")
    cabal_crawler__crawler2.place()
    cabal_crawl_from_wreckage2.start_performance("0xC654F1BB")

# the stronghold phase starts the take-off
def takeoff():
    sc_takeoff.wake()

script sc_takeoff():
    flee_spawn_trigger.reset()
    takeoff_object.create()
    takeoff_object.set_device_position(0)

@startup()
script sc_buzzby():
    sleep_until(buzzby_trigger.is_triggered())
    sleep(1.5)
    buzzby_object.create()
    sleep_until(pt_cabal_crawler3.is_triggered())
    sleep(1.4)
    buzzby_object.delete_object()

@startup()
# the dropship flies over and the Cabal at the back fall back
script sc_flyover():
    sleep_until(flyover_trigger.is_triggered())
    sleep(0.4)
    for sq in [back_anchor_squad, running_cabal_squad]:
        sq.set_task("fallback")
        sq.place()

@startup()
script sc_crawlers():
    sleep_until(pt_cabal_crawler2.is_triggered())
    sleep(1)
    cabal_crawl_from_wreckage2.cue_performance("0x2CA330DB")
    sleep_until(pt_cabal_crawler1.is_triggered())
    sleep(0.8)
    cabal_crawl_from_wreckage.cue_performance("0x2CA330DB")

@startup()
script sc_bridge():
    sleep_until(bridge_trigger.is_triggered())
    sleep(0.3)
    door_explosion_fx_sequence.start()
    damage_sequence.start()
    sleep(0.8)
    panel_explosion_fx_sequence01.start()
    sleep(0.5)
    panel_explosion_fx_sequence02.start()

@startup()
# the roof blows as the players reach the middle, and the ship lifts off
script sc_mid_anchor():
    sleep_until(mid_anchor_trigger.is_triggered())
    sleep(0.6)
    roof_explosion_fx_sequence.start()
    sleep(0.5)
    takeoff_object.set_device_position(1)
    sleep(0.5)
    unknown_1702136e.phm_dks_990_020_dialogue_sequence.start()
    roof_smoke_fx_sequence.start()
    stronghold_strobelight_object.set_device_position(1)
    sleep(5)
    for seq in [door_explosion_fx_sequence, panel_explosion_fx_sequence01, panel_explosion_fx_sequence02, roof_explosion_fx_sequence, damage_sequence]:
        seq.stop()
