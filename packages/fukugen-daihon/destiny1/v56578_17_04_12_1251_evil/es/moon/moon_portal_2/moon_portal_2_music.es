# es\moon\moon_portal_2\moon_portal_2_music.es
#
# The Summoning Pits' music and Ghost lines. The lines are dialog triggers
# the script arms as the strike goes on; the hack and boss cues step through
# their sections on the encounters' events. One capture run: the cue2 step
# in the middle of the fight is on the run's clock, its real cue is unknown
# (likely the ogre's health).

@activity_bundle("moon_portal_2_music")

c_sequence_host cue_intro
c_sequence_host cue1
c_sequence_host cue2
c_sequence_host seq_music_ascent
dialog_trigger mns01_010_020_trigger
dialog_trigger mns01_010_030_trigger
dialog_trigger mns01_020_010_trigger
dialog_trigger mns01_020_020_trigger
dialog_trigger mns01_020_030_trigger
dialog_trigger mns01_020_040_trigger
dialog_trigger mns01_020_050_trigger
dialog_trigger mns01_020_060_trigger
dialog_trigger mns01_030_010_trigger
dialog_trigger mns01_040_010_trigger
dialog_trigger mns01_040_020_trigger
dialog_trigger mns01_040_030_trigger
c_player_trigger_sensor_host pt_objective_entrance01
c_object_sensor_host o_scan_sphere_1
c_object_sensor_host o_gate_lock01
c_object_sensor_host o_gate_lock02
c_object_sensor_host o_gate_lock03
c_player_trigger_sensor_host pt_ogreroar01
trigger_volume_objective pf_tv_wormway_entrance
c_player_trigger_sensor_host pt_ogreroar03
c_squad_sensor_host sq_bossbattle_boss01
c_incident_listener il_loot_pickup

startup thread sc_music_main:
    sleep_until(c_player_script_utilities.all_players_are_ready())
    cue_intro.start()
    sleep(7)
    mns01_010_020_trigger.enable()
    sleep(1)
    mns01_010_030_trigger.enable()

startup thread sc_uppercitadel:
    sleep_until(pt_objective_entrance01.is_triggered())
    cue1.start()
    sleep(1)
    mns01_020_010_trigger.enable()
    # the Ghost starts on the door
    sleep_until(o_scan_sphere_1.is_alive())
    mns01_020_020_trigger.enable()
    sleep(3)
    cue1.set_switch_mask(2)
    sleep(5)
    mns01_020_030_trigger.enable()
    sleep_until(not o_gate_lock01.is_alive())
    cue1.set_switch_mask(6)
    mns01_020_040_trigger.enable()
    sleep_until(not o_gate_lock02.is_alive())
    cue1.set_switch_mask(14)
    mns01_020_050_trigger.enable()
    sleep_until(not o_gate_lock03.is_alive())
    cue1.stop()
    mns01_020_060_trigger.enable()

startup thread sc_lowercitadel:
    sleep_until(pt_ogreroar01.is_triggered())
    sleep(2)
    mns01_030_010_trigger.enable()

startup thread sc_wormway:
    il_loot_pickup.bind_incident_name_hash("inventory_item_added")
    sleep_until(pf_tv_wormway_entrance._player_trigger.is_triggered())
    cue2.start()
    sleep_until(pt_ogreroar03.is_triggered())
    sleep(1)
    mns01_040_010_trigger.enable()
    sleep_until(mns01_040_010_trigger.is_triggered())
    cue2.set_switch_mask(2)
    sleep(172)
    cue2.set_switch_mask(6)
    sleep_until(sq_bossbattle_boss01.alive_count() == 0)
    sleep(3)
    cue2.set_switch_mask(14)
    sleep(1)
    cue2.stop()
    sleep_until_timeout(il_loot_pickup.get_count() > 0, 10)
    mns01_040_020_trigger.enable()
    sleep_until(mns01_040_020_trigger.is_triggered())
    sleep(3)
    mns01_040_030_trigger.enable()
    sleep_until(mns01_040_030_trigger.is_triggered())
    seq_music_ascent.start()
