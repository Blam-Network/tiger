@activity_bundle("enc_city_tower_default1")
@activity("city_tower_default1")
@start_slice("plaza")

fireteam host
player_objective po_mission01
player_objective po_mission02
new_mission pm_new_mission















@startup()
script sc_main_thread():


    while not host.t30_hack_bind_host():
        print("waiting for a fireteam to join")
        sleep(1)

    sleep(1)
    print("---------------------------------------------------------")
    print("CITY TOWER DEFAULT ACTIVITY")
    print("---------------------------------------------------------")

    mission01.wake()




script mission01():

    sleep(5)
    host.nav_point_clear_all()

    pm_new_mission.display(4)
    sleep(4)
    po_mission01.activate()
    sleep(120)
    host.nav_point_clear_all()
    po_mission01.set_complete()
    po_mission01.clear()

    pm_new_mission.display(4)
    sleep(4)
    po_mission02.activate()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821E2000
