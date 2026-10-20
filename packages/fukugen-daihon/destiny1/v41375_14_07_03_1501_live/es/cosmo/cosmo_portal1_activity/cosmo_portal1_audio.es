# es\cosmo\cosmo_portal1_activity\cosmo_portal1_audio.es
#
# The Devils' Lair's music and Ghost lines. Each line plays off a point
# trigger or a mission event; the music cues step through their sections as the
# strike goes on.

@activity_bundle("cosmo_portal1_audio")

sequence music_intro01
player_trigger pt_wake_trash01
sequence s01_xx40
trigger_volume_objective obj_s1_phase01_m1
sequence s01_xx45
encounter_handle enc_refinery_portal1
sequence cue1
sequence s01_xx50
squad sq_objective_fallen01d
sequence s01_xx60
sequence m02_alarm
sequence s01_xx70
object o_laserweb02
sequence s01_xx80
sequence s01_xx90
object o_laserweb03
player_trigger pt_play_s01_x100_s01_x110
sequence s01_x100
squad sq_tank
incident_listener il_loot_pickup
player_trigger pt_play_s01_x120
sequence s01_x120
trigger_volume_objective obj_s1_phase05_m1
sequence cue2
sequence cue3
squad sq_bossbattle_boss01
sequence seq_music_ascent
sequence s01_x125
sequence s01_x130
squad sq_playfight_hive01
squad sq_playfight_hive02
squad sq_playfight_fallen01
squad sq_playfight_fallen02
squad sq_bossbattle_fallen01
squad sq_bossbattle_fallen02
squad sq_bossbattle_fallen03
squad sq_bossbattle_fallen04

@startup()
script sc_audio_main():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    music_intro01.start()

@startup()
script sc_wake_trash():
    sleep_until(pt_wake_trash01.is_triggered())
    s01_xx40.start()
    sleep_until(obj_s1_phase01_m1._player_trigger.is_triggered())
    s01_xx40.stop()

@startup()
script sc_playfight_line():
    sleep_until(playfight_alive_count() > 0)
    sleep_until(playfight_alive_count() == 0)
    s01_xx45.start()

@startup()
script sc_scan():
    console = enc_refinery_portal1.sp_placement_array._object
    sleep_until(console.get_device_position() > 0)
    cue1.start()
    cue1.set_switch_mask(1)
    sleep(3)
    s01_xx50.start()
    sleep_until_dead(sq_objective_fallen01d)
    sleep(2)
    s01_xx60.start()
    sleep(3)
    m02_alarm.start()
    sleep(2)
    cue1.set_switch_mask(2)
    s01_xx70.start()
    sleep_until(not o_laserweb02.is_alive())
    s01_xx80.start()
    sleep(2)
    cue1.set_switch_mask(4)
    sleep_until(console.get_device_position() >= 1)
    s01_xx90.start()
    sleep_until(not o_laserweb03.is_alive())
    m02_alarm.stop()
    sleep(3)
    cue1.stop()

@startup()
script sc_walker_line():
    sleep_until(pt_play_s01_x100_s01_x110.is_triggered())
    sleep(1)
    s01_x100.start()
    sleep_until_dead(sq_tank)
    s01_x100.stop()

@startup()
script sc_ship():
    il_loot_pickup.bind_incident_name_hash("inventory_item_added")
    sleep_until(pt_play_s01_x120.is_triggered())
    s01_x120.start()
    sleep_until(obj_s1_phase05_m1._player_trigger.is_triggered())
    s01_x120.stop()
    cue2.start()
    sleep_until(guards_alive_count() > 0)
    sleep_until(guards_alive_count() == 0)
    cue2.stop()
    sleep(1)
    cue3.start()
    cue3.set_switch_mask(1)
    sleep_until(sq_bossbattle_boss01.alive_count() > 0)
    sleep_until_boss_dead()
    cue3.stop()
    cue2.start()
    sleep_until_timeout(il_loot_pickup.get_count() > 0, 7)
    sleep(1)
    seq_music_ascent.start()
    s01_x125.start()
    s01_x130.start()

def playfight_alive_count():
    return sq_playfight_hive01.alive_count() + sq_playfight_hive02.alive_count() + sq_playfight_fallen01.alive_count() + sq_playfight_fallen02.alive_count()

def guards_alive_count():
    return sq_bossbattle_fallen01.alive_count() + sq_bossbattle_fallen02.alive_count() + sq_bossbattle_fallen03.alive_count() + sq_bossbattle_fallen04.alive_count()

def sleep_until_boss_dead():
    while true:
        sleep_until(sq_bossbattle_boss01.alive_count() == 0)
        sleep(15)
        if sq_bossbattle_boss01.alive_count() == 0:
            break

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
