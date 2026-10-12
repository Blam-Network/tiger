# es\cosmo\refinery\enc_refinery_portal1.es
#
# Devils' Lair, the refinery: entrance trash and the playfight, then the
# Ghost's scan. Using the console starts the hack; the laser webs come down
# as the waves of Fallen are fought off. The console only works for players
# holding the scan objective's activity flag.

c_object_sensor_host o_laserweb01
c_object_sensor_host o_laserweb02
c_object_sensor_host o_laserweb03
c_object_sensor_host o_laserweb_pusher01
c_object_sensor_host o_laserweb_nutblock0101
c_object_sensor_host o_laserweb_nutblock0102
c_object_sensor_host o_laserweb_nutblock0201
c_object_sensor_host o_laserweb_nutblock0202
c_object_sensor_host o_laserweb_nutblock0203
c_object_sensor_host o_laserweb_nutblock0301
c_object_sensor_host o_laserweb_nutblock0302
c_object_sensor_host o_laserweb_behavior0101
c_object_sensor_host o_laserweb_behavior0102
c_object_sensor_host o_laserweb_behavior0201
c_object_sensor_host o_laserweb_behavior0202
c_object_sensor_host o_laserweb_behavior0203
c_object_sensor_host o_laserweb_behavior0301
c_object_sensor_host o_laserweb_behavior0302
interactable_placement sp_placement_array  # archetype not authored on day0
c_squad_sensor_host sq_trash01_hive01
c_objective_sensor_host obj_trash  # true name unknown
c_squad_sensor_host sq_trash01_hive02
c_squad_sensor_host sq_trash01_hive03
c_squad_sensor_host sq_trash01_fallen01
c_squad_sensor_host sq_trash02_fallen01
c_objective_sensor_host obj_refinery_trash  # true name unknown
c_squad_sensor_host sq_trash02_fallen02
c_squad_sensor_host sq_trash02_fallen03
c_squad_sensor_host sq_playfight_hive01
c_objective_sensor_host obj_refinery_playfight  # true name unknown
c_squad_sensor_host sq_playfight_hive02
c_squad_sensor_host sq_playfight_fallen01
c_squad_sensor_host sq_playfight_fallen02
c_squad_sensor_host sq_objective_fallen01a
c_objective_sensor_host obj_refinery_objective  # true name unknown
c_squad_sensor_host sq_objective_fallen01b
c_squad_sensor_host sq_objective_fallen01c
c_squad_sensor_host sq_objective_fallen01d
c_squad_sensor_host sq_objective_fallen01e
c_squad_sensor_host sq_objective_fallen02a
c_squad_sensor_host sq_objective_fallen02b
c_squad_sensor_host sq_objective_fallen02c
c_squad_sensor_host sq_objective_fallen02d
c_squad_sensor_host sq_objective_fallen02e
c_squad_sensor_host sq_objective_fallen03a
c_squad_sensor_host sq_objective_fallen03b
c_squad_sensor_host sq_objective_fallen03c
c_squad_sensor_host sq_objective_hive01
c_squad_sensor_host sq_objective_hive02
c_squad_sensor_host sq_objective_hive03
c_squad_sensor_host sq_objective_hive04
c_squad_sensor_host sq_objective_suppressors01
c_squad_sensor_host sq_objective_suppressors02
c_squad_sensor_host sq_objective_suppressors03
c_squad_sensor_host sq_objective_suppressors04
c_squad_sensor_host sq_objective_suppressors05
c_trigger_volume_slot_host tv_wake_trash01
c_player_trigger_sensor_host pt_wake_trash01 bind(tv_wake_trash01)  # true name unknown
c_trigger_volume_slot_host tv_wake_playfight01
c_player_trigger_sensor_host pt_wake_playfight01 bind(tv_wake_playfight01)  # true name unknown
c_object_sensor_host o_ghost_scan_cage_orb
c_object_sensor_host o_ghost_scan_cage_cyln
c_squad_member_sensor_host sq_objective_fallen01d__shank01  # true name unknown
c_squad_member_sensor_host sq_objective_fallen01d__shank02  # true name unknown
c_squad_member_sensor_host sq_objective_fallen01d__shank03  # true name unknown
c_squad_member_sensor_host sq_objective_fallen01d__shank04  # true name unknown
c_squad_member_sensor_host sq_objective_fallen01e__shank01  # true name unknown
c_squad_member_sensor_host sq_objective_fallen01e__shank02  # true name unknown
c_squad_member_sensor_host sq_objective_fallen01e__shank03  # true name unknown
c_squad_member_sensor_host sq_objective_fallen01e__shank04  # true name unknown
c_squad_member_sensor_host sq_objective_fallen03c__captain_major  # true name unknown

startup thread sc_refinery_main:
    o_laserweb01.create()
    o_laserweb02.create()
    o_laserweb03.create()
    o_laserweb_pusher01.create()
    o_laserweb_nutblock0101.create()
    o_laserweb_nutblock0102.create()
    o_laserweb_nutblock0201.create()
    o_laserweb_nutblock0202.create()
    o_laserweb_nutblock0203.create()
    o_laserweb_nutblock0301.create()
    o_laserweb_nutblock0302.create()
    o_laserweb_behavior0101.create()
    o_laserweb_behavior0102.create()
    o_laserweb_behavior0201.create()
    o_laserweb_behavior0202.create()
    o_laserweb_behavior0203.create()
    o_laserweb_behavior0301.create()
    o_laserweb_behavior0302.create()
    console = sp_placement_array
    console._object_filter.add_players_with_activity_flag(console._object.import_identifier())
    console._object.set_enabled_player_filter(console._object_filter)
    console._object.create()
    sq_trash01_hive01.set_objective(obj_trash)
    sq_trash01_hive02.set_objective(obj_trash)
    sq_trash01_hive03.set_objective(obj_trash)
    sq_trash01_fallen01.set_objective(obj_trash)
    sq_trash02_fallen01.set_objective(obj_refinery_trash)
    sq_trash02_fallen02.set_objective(obj_refinery_trash)
    sq_trash02_fallen03.set_objective(obj_refinery_trash)
    sq_playfight_hive01.set_objective(obj_refinery_playfight)
    sq_playfight_hive02.set_objective(obj_refinery_playfight)
    sq_playfight_fallen01.set_objective(obj_refinery_playfight)
    sq_playfight_fallen02.set_objective(obj_refinery_playfight)
    sq_objective_fallen01a.set_objective(obj_refinery_objective)
    sq_objective_fallen01b.set_objective(obj_refinery_objective)
    sq_objective_fallen01c.set_objective(obj_refinery_objective)
    sq_objective_fallen01d.set_objective(obj_refinery_objective)
    sq_objective_fallen01e.set_objective(obj_refinery_objective)
    sq_objective_fallen02a.set_objective(obj_refinery_objective)
    sq_objective_fallen02b.set_objective(obj_refinery_objective)
    sq_objective_fallen02c.set_objective(obj_refinery_objective)
    sq_objective_fallen02d.set_objective(obj_refinery_objective)
    sq_objective_fallen02e.set_objective(obj_refinery_objective)
    sq_objective_fallen03a.set_objective(obj_refinery_objective)
    sq_objective_fallen03b.set_objective(obj_refinery_objective)
    sq_objective_fallen03c.set_objective(obj_refinery_objective)
    sq_objective_hive01.set_objective(obj_refinery_objective)
    sq_objective_hive02.set_objective(obj_refinery_objective)
    sq_objective_hive03.set_objective(obj_refinery_objective)
    sq_objective_hive04.set_objective(obj_refinery_objective)
    sq_objective_suppressors01.set_objective(obj_refinery_objective)
    sq_objective_suppressors02.set_objective(obj_refinery_objective)
    sq_objective_suppressors03.set_objective(obj_refinery_objective)
    sq_objective_suppressors04.set_objective(obj_refinery_objective)
    sq_objective_suppressors05.set_objective(obj_refinery_objective)
    sc_trash.wake()
    sc_playfight.wake()
    sc_pusher.wake()

thread sc_trash:
    sleep_until(pt_wake_trash01.is_triggered())
    place_on_task(sq_trash01_hive01, 0)
    place_on_task(sq_trash01_hive02, 1)
    place_on_task(sq_trash01_hive03, 2)
    place_on_task(sq_trash01_fallen01, 6)

thread sc_playfight:
    sleep_until(pt_wake_playfight01.is_triggered())
    place_on_task(sq_playfight_hive01, 0)
    place_on_task(sq_playfight_hive02, 1)
    place_on_task(sq_playfight_fallen01, 2)
    place_on_task(sq_playfight_fallen02, 3)

thread sc_pusher:
    sleep_until(not o_laserweb_pusher01.is_alive())
    o_laserweb_pusher01.delete_object()

thread sc_hack:
    o_laserweb01.delete_object()
    o_laserweb02.delete_object()
    o_laserweb03.delete_object()
    o_laserweb01.create()
    o_laserweb02.create()
    o_laserweb03.create()
    console = sp_placement_array._object
    sleep_until(console.is_active())
    console.set_device_position(0.1)
    sc_hack_waves.wake()
    sleep(1)
    o_ghost_scan_cage_orb.create()
    o_ghost_scan_cage_cyln.create()
    sleep(82)
    o_laserweb01.delete_object()
    o_laserweb_nutblock0101.delete_object()
    o_laserweb_nutblock0102.delete_object()
    o_laserweb_behavior0101.delete_object()
    o_laserweb_behavior0102.delete_object()
    sleep(66)
    o_laserweb02.delete_object()
    o_laserweb_nutblock0201.delete_object()
    o_laserweb_nutblock0202.delete_object()
    o_laserweb_nutblock0203.delete_object()
    o_laserweb_behavior0201.delete_object()
    o_laserweb_behavior0202.delete_object()
    o_laserweb_behavior0203.delete_object()
    sleep(134)
    o_ghost_scan_cage_orb.set_device_position(1)
    o_ghost_scan_cage_cyln.set_device_position(1)
    console.set_device_position(1)
    sleep(1)
    o_ghost_scan_cage_orb.delete_object()
    o_ghost_scan_cage_cyln.delete_object()
    sleep(1)
    o_laserweb03.delete_object()
    o_laserweb_nutblock0301.delete_object()
    o_laserweb_nutblock0302.delete_object()
    o_laserweb_behavior0301.delete_object()
    o_laserweb_behavior0302.delete_object()
    sleep(3)
    place_on_task(sq_trash02_fallen01, 0)
    place_on_task(sq_trash02_fallen02, 1)
    place_on_task(sq_trash02_fallen03, 2)

thread sc_hack_waves:
    sleep(6)
    place_on_task(sq_objective_suppressors01, 18)
    place_on_task(sq_objective_suppressors02, 21)
    place_on_task(sq_objective_suppressors03, 22)
    sleep(2)
    place_on_task(sq_objective_fallen01a, 4)
    place_on_task(sq_objective_fallen01b, 2)
    sleep(33)
    place_on_task(sq_objective_fallen01c, 5)
    sleep(20)
    sq_objective_fallen01d.set_task(0)
    sq_objective_fallen01d__shank01.place()
    sq_objective_fallen01d__shank02.place()
    sq_objective_fallen01d__shank03.place()
    sq_objective_fallen01d__shank04.place()
    sleep(1)
    sq_objective_fallen01e.set_task(1)
    sq_objective_fallen01e__shank01.place()
    sq_objective_fallen01e__shank02.place()
    sq_objective_fallen01e__shank03.place()
    sq_objective_fallen01e__shank04.place()
    sleep(31)
    place_on_task(sq_objective_fallen02b, 8)
    place_on_task(sq_objective_fallen02c, 7)
    sleep(1)
    place_on_task(sq_objective_suppressors04, 19)
    place_on_task(sq_objective_suppressors05, 20)
    sleep(24)
    sq_objective_fallen02b.set_task(7)
    sleep(4)
    place_on_task(sq_objective_fallen02d, 10)
    place_on_task(sq_objective_fallen02e, 9)
    sleep(32)
    place_on_task(sq_objective_hive01, 14)
    place_on_task(sq_objective_hive02, 15)
    sleep(3)
    place_on_task(sq_objective_fallen03a, 11)
    place_on_task(sq_objective_fallen03b, 12)
    sleep(12)
    place_on_task(sq_objective_hive03, 16)
    place_on_task(sq_objective_hive04, 17)
    sleep(103)
    sq_objective_fallen03c.set_task(13)
    sq_objective_fallen03c__captain_major.place()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
