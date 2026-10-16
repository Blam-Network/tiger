@activity_bundle("enc_vault_amb1")
c_objective_sensor_host obj_vault_amb1  # true name unknown
c_squad_group_sensor_host sg_left  # true name unknown
c_squad_group_sensor_host sg_right  # true name unknown
c_squad_group_sensor_host sg_center  # true name unknown
loot_vault loot_venus_vault





startup thread sc_main_thread:
    print("---------------------------------------------------------")
    print("ACADEMY VAULT ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")



def sc_spawn(sq, obj, sg):
    sg.add_child(sq)
    obj.add_squad(sq)
    sq.place()


def sc_spawn_respawn(sq, obj, delay, sg, amount):

    while true:
        sg.add_child(sq)
        sleep_until(sq.alive_count() <= 0 and sg.alive_count() <= amount)
        print("RESPAWN")
        obj.add_squad(sq)
        sq.place()
        sleep(delay)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8013
