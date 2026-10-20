# es\cosmo\hangar\enc_hangar_m0_5.es
#
# The hangar in the hangar mission (act_cosmo_m0_5_hangar): once the hangar's
# own Fallen (enc_hangar_amb1) are down, the ultra roars in, lands, and its
# Vandals follow. Names that were never cracked are written as "0x" literals.
# From one retail capture, so the waits are that run's.

@activity_bundle("enc_hangar_m0_5")

object o_ultra_audio
objective obj_hangar_m0_5_fallen
squad sq_amb_fallen_ultra
squad sq_amb_fallen_vandal_1
squad sq_amb_fallen_vandal_2
squad sq_amb_fallen_vandal_3
squad sq_amb_fallen_vandal_4
squad sq_amb_fallen_vandal_5
squad sq_amb_fallen_vandal_6
squad sq_amb_fallen_vandal_7
squad sq_amb_fallen_ultra_gang_1
squad sq_amb_fallen_ultra_gang_2
squad sq_amb_fallen_1
squad sq_amb_shank
squad sq_amb_fallen_ship_2
squad sq_amb_fallen_north_1
@member_counts({dregs: 3, shanks: 2})
squad sq_amb_fallen_north_2
@member_counts({vandal: 2, shanks: 2})
squad sq_amb_fallen_south_1
squad sq_amb_fallen_south_2

@startup()
script sc_hangar_m0_5():
    sq_amb_fallen_ultra.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_ultra_gang_1.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_ultra_gang_2.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_vandal_1.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_vandal_2.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_vandal_3.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_vandal_4.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_vandal_5.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_vandal_6.set_objective(obj_hangar_m0_5_fallen)
    sq_amb_fallen_vandal_7.set_objective(obj_hangar_m0_5_fallen)
    # the ultra comes in once the hangar's own Fallen are down
    sleep_until(ambient_alive_count() > 0)
    sleep_until(ambient_alive_count() == 0)
    o_ultra_audio.create()
    sleep(2.2)
    sq_amb_fallen_ultra.set_task("0x56A597B9")
    sq_amb_fallen_ultra.place()
    o_ultra_audio.delete_object()
    # the Vandals drop in as the loot objective comes up
    sleep(5)
    sq_amb_fallen_vandal_1.set_task("0x1CFA66C9")
    sq_amb_fallen_vandal_1.place()
    sleep(0.5)
    sq_amb_fallen_vandal_2.set_task("0x1CFA66C9")
    sq_amb_fallen_vandal_2.place()
    sleep(1.3)
    sq_amb_fallen_vandal_3.set_task("0x1CFA66C9")
    sq_amb_fallen_vandal_3.place()
    # the ultra presses in
    sleep(1.8)
    sq_amb_fallen_ultra.set_task("0x56A597B8")
    sleep(0.1)
    sq_amb_fallen_ultra.set_task("0x357DB49D")

def ambient_alive_count():
    return sq_amb_fallen_1.alive_count() + sq_amb_shank.alive_count() + sq_amb_fallen_ship_2.alive_count() + sq_amb_fallen_north_1.alive_count() + sq_amb_fallen_north_2.alive_count() + sq_amb_fallen_south_1.alive_count() + sq_amb_fallen_south_2.alive_count()
