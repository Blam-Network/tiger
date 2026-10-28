# es\impactsite\mission_darksnow\unknown_15823806.es
#
# The airfield in mission_darksnow (bundle 15823806, file name unknown;
# bubble 0, the activity's own), with the Taken-held carrier on it. The
# Cabal there fight the Taken from the start. A player reaching the
# airfield brings a harvester down on the tower and the first schisms open
# (mission 5 calls harvester_crash). In the exfil (mission 6) the Taken
# come through blights along the carrier: each blight opens, its squads
# come through four seconds later, and it closes seven seconds after it
# opened. When the ship is in, every squad still standing is wiped and the
# Taken's hold lifts.
#
# One retail 2.3.1 run: every hold is its gap. No placement is on the wire:
# the squads with a task are placed with it. The elevator's squads came as
# a player reached the interior too; the blight's timing is the rule here.
# The interior phalanxes, the lower bridge psions, the looping schisms and
# the bridge explosion never moved.

@activity_bundle(0x15823806)

object taken_airfield_area_fx
objective mission_darksnow_airfield_objective
@objective(mission_darksnow_airfield_objective)
squad cabal_playfight_squad
@objective(mission_darksnow_airfield_objective)
squad taken_playfight_squad
@objective(mission_darksnow_airfield_objective)
squad upper_phalanx_squad
@objective(mission_darksnow_airfield_objective)
squad elevator_psion_squad01
@objective(mission_darksnow_airfield_objective)
squad elevator_psion_squad02
@objective(mission_darksnow_airfield_objective)
squad elevator_psion_squad03
@objective(mission_darksnow_airfield_objective)
squad elevator_phalanx_squad01
@objective(mission_darksnow_airfield_objective)
squad elevator_phalanx_squad02
@objective(mission_darksnow_airfield_objective)
squad interior_phalanx_squad01
@objective(mission_darksnow_airfield_objective)
squad interior_phalanx_squad02
@objective(mission_darksnow_airfield_objective)
squad upper_bridge_psion_squad01
@objective(mission_darksnow_airfield_objective)
squad upper_bridge_psion_squad02
@objective(mission_darksnow_airfield_objective)
squad lower_bridge_psion_squad01
@objective(mission_darksnow_airfield_objective)
squad lower_bridge_psion_squad02
@objective(mission_darksnow_airfield_objective)
squad upper_bridge_phalanx_squad01
@objective(mission_darksnow_airfield_objective)
squad upper_bridge_phalanx_squad02
@objective(mission_darksnow_airfield_objective)
squad lower_bridge_phalanx_squad01
@objective(mission_darksnow_airfield_objective)
squad lower_bridge_phalanx_squad02
@objective(mission_darksnow_airfield_objective)
squad bridge_anchor_squad
taken_fx_controller taken_fx_controller_airfield
taken_blight upper_blight
taken_blight lower_blight
taken_blight upper_bridge_blight
taken_blight lower_bridge_blight
taken_blight anchor_bridge_blight
specops_carrier specops_airfield_carrier
device blackout_device
device airfield_door_device
trigger_volume upper_blight_volume
player_trigger upper_blight_trigger bind(upper_blight_volume)
trigger_volume elevator_blight_volume
player_trigger elevator_blight_trigger bind(elevator_blight_volume)
trigger_volume bridge_blight_volume
player_trigger bridge_blight_trigger bind(bridge_blight_volume)
trigger_volume phalanx_exfil_spawn_volume
player_trigger phalanx_exfil_spawn_trigger bind(phalanx_exfil_spawn_volume)

@startup()
script sc_airfield():
    taken_fx_controller_airfield.create(0)
    for o in [specops_airfield_carrier.panel_bridge_a_object, specops_airfield_carrier.panel_bridge_b_object, specops_airfield_carrier.tower_object]:
        o.create()
        o.set_device_position(0)
    cabal_playfight_squad.set_task("cabal_playfight")
    cabal_playfight_squad.place()

# mission 5: a player has reached the airfield
def harvester_crash():
    sc_harvester_crash.wake()

script sc_harvester_crash():
    specops_airfield_carrier.tower_object.set_device_position(1)
    specops_airfield_carrier.harvester_crash_object.create()
    sleep(0.7)
    specops_airfield_carrier.schism_a_object.create()
    specops_airfield_carrier.schism_e_object.create()
    sleep(1.2)
    specops_airfield_carrier.schism_b_object.create()
    sleep(23.2)
    specops_airfield_carrier.harvester_crash_object.delete_object()

# mission 6: the exfil starts
def exfil():
    taken_playfight_squad.set_task("taken_playfight")
    taken_playfight_squad.place()
    airfield_door_device.set_device_position(0)
    sc_upper_blight.wake()
    sc_explosion.wake()
    sc_schism_loop.wake()
    sc_elevator_blight.wake()
    sc_panel_bridge.wake()
    sc_bridge_blights.wake()
    sc_phalanx_exfil.wake()

# mission 6: the ship is in
def ship_arrived():
    sc_ship_arrived.wake()

script sc_upper_blight():
    sleep_until(upper_blight_trigger.is_triggered())
    sleep(0.4)
    taken_fx_controller_airfield.set_intensity(0.9)
    sleep(0.4)
    upper_blight.open()
    sleep(4.2)
    upper_phalanx_squad.set_task("upper_phalanx")
    upper_phalanx_squad.place()
    sleep(2.9)
    upper_blight.close()
    sleep(0.7)
    specops_airfield_carrier.schism_f_object.create()

script sc_explosion():
    sleep_until(specops_airfield_carrier.explosion_trigger.is_triggered())
    sleep(0.5)
    specops_airfield_carrier.schism_c_object.create()
    sleep(4.9)
    specops_airfield_carrier.schism_d_object.create()

script sc_schism_loop():
    sleep_until(specops_airfield_carrier.schism_loop_trigger.is_triggered())
    sleep(0.5)
    specops_airfield_carrier.schism_a_object.delete_object()

script sc_elevator_blight():
    sleep_until(elevator_blight_trigger.is_triggered())
    sleep(0.2)
    specops_airfield_carrier.schism_g_object.create()

script sc_panel_bridge():
    sleep_until(specops_airfield_carrier.panel_bridge_trigger.is_triggered())
    sleep(0.5)
    lower_blight.open()
    specops_airfield_carrier.schism_h_object.create()
    sleep(4.1)
    for sq in [elevator_psion_squad01, elevator_psion_squad02, elevator_psion_squad03]:
        sq.set_task("elevator_psion")
        sq.place()
    for sq in [elevator_phalanx_squad01, elevator_phalanx_squad02]:
        sq.set_task("elevator_phalanx")
        sq.place()
    specops_airfield_carrier.schism_i_object.create()
    sleep(2.9)
    lower_blight.close()

script sc_bridge_blights():
    sleep_until(bridge_blight_trigger.is_triggered())
    sleep(1)
    upper_bridge_blight.open()
    lower_bridge_blight.open()
    anchor_bridge_blight.open()
    sleep(3.9)
    upper_bridge_psion_squad01.set_task("upper_bridge_psion")
    upper_bridge_psion_squad01.place()
    for sq in [lower_bridge_phalanx_squad01, lower_bridge_phalanx_squad02]:
        sq.set_task("lower_bridge_phalanx")
        sq.place()
    bridge_anchor_squad.set_task("bridge_anchor")
    bridge_anchor_squad.place()
    sleep(3.2)
    upper_bridge_blight.close()
    lower_bridge_blight.close()
    anchor_bridge_blight.close()

script sc_phalanx_exfil():
    sleep_until(phalanx_exfil_spawn_trigger.is_triggered())
    sleep(0.6)
    for sq in [upper_bridge_phalanx_squad01, upper_bridge_phalanx_squad02]:
        sq.set_task("upper_bridge_phalanx")
        sq.place()

script sc_ship_arrived():
    sleep(0.1)
    for sq in [cabal_playfight_squad, taken_playfight_squad, upper_phalanx_squad, elevator_psion_squad01, elevator_psion_squad02, elevator_psion_squad03, elevator_phalanx_squad01, elevator_phalanx_squad02, upper_bridge_psion_squad01, upper_bridge_phalanx_squad01, upper_bridge_phalanx_squad02, lower_bridge_phalanx_squad01, lower_bridge_phalanx_squad02, bridge_anchor_squad]:
        sq.kill()
    sleep(0.5)
    taken_fx_controller_airfield.set_intensity(0)
