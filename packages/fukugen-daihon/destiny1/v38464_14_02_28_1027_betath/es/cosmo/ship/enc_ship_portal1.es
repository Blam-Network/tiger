# es\cosmo\ship\enc_ship_portal1.es
#
# Devils' Lair, the ship. The pre-alpha's ship bundle holds only the ship's
# machinery: the hangar and inner doors, the bridges, plates, cog and cables
# over the pit, and the pit's kill volume. The guards and Sepiks Prime are
# the ship phases' own rows (phase05, phase06). Everything stands as the
# ship loads, the doors shut; the phases open them.

@activity_bundle("enc_ship_portal1")

object o_hangar_door01
object o_door_left01
object o_door_right01
object o_bridge1
object o_bridge2
object o_bridge3
object o_bridge4
object o_bridge5
object o_plate1
object o_plate2
object o_cog1
object o_trigger
object o_cable2
object o_cable3
object o_cable4
object o_cable5
trigger_group t_pit_kill_volume

@startup()
script sc_ship_main():
    for door in [o_hangar_door01, o_door_left01, o_door_right01]:
        door.create()
        door.set_device_position(0)
    for machine in [o_bridge1, o_bridge2, o_bridge3, o_bridge4, o_bridge5, o_plate1, o_plate2, o_cog1, o_trigger, o_cable2, o_cable3, o_cable4, o_cable5]:
        machine.create()
    t_pit_kill_volume.activate()
