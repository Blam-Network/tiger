# es\cosmo\hangar\enc_hangar_m0_5.es
#
# The hangar in the hangar mission (act_cosmo_m0_5_hangar): once the Fallen
# the ambient encounter (enc_hangar_amb1) sends at the player on the way in
# are down, the ultra roars in and lands in the second wave's task, its three
# Vandals drop in behind it, and it moves on to the third wave's. Task names
# are the cracked hashes of obj_hangar_m0_5_fallen's tasks. From four retail
# 2.3.1 runs; every wait held in all of them within half a second, the
# ultra's arrival the loosest (1.4 to 3.0 s after the last kill), and its
# third wave 1.3 to 1.8 s after the last Vandal lands in three (the fourth,
# 26 s, most likely went on its health).
#
# Left to the AI: the ultra's last task ("ultra", 0.1, 3.3, 20 and 27 s
# after the third wave's, a few seconds before it dies in each) and the
# second Vandal standing again once it is there.

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
# enc_hangar_amb1's, the two squads its final fallback trigger sends in
squad sq_amb_fallen_north_2
squad sq_amb_fallen_south_1

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
    sleep_until(hangar_fallen_alive_count() > 0)
    sleep_until(hangar_fallen_alive_count() == 0)
    o_ultra_audio.create()
    sleep(1.5)
    sq_amb_fallen_ultra.set_task("wave_2")
    sq_amb_fallen_ultra.place()
    o_ultra_audio.delete_object()
    sleep(5)
    sq_amb_fallen_vandal_1.set_task("ultra_gang")
    sq_amb_fallen_vandal_1.place()
    sleep(0.5)
    sq_amb_fallen_vandal_2.set_task("ultra_gang")
    sq_amb_fallen_vandal_2.place()
    sleep(1.3)
    sq_amb_fallen_vandal_3.set_task("ultra_gang")
    sq_amb_fallen_vandal_3.place()
    sleep(1.5)
    sq_amb_fallen_ultra.set_task("wave_3")

def hangar_fallen_alive_count():
    return sq_amb_fallen_north_2.alive_count() + sq_amb_fallen_south_1.alive_count()
