c_fireteam_sensor_host host
c_player_objective_sensor_host po_mission01
c_player_objective_sensor_host po_mission02
c_new_mission_sensor_host pm_new_mission  # true name unknown
















startup thread sc_main_thread:


    while not host.t30_hack_bind_host():
        print("waiting for a fireteam to join")
        sleep(1)

    sleep(1)
    print("---------------------------------------------------------")
    print("CITY TOWER DEFAULT ACTIVITY")
    print("---------------------------------------------------------")

    mission01.wake()




thread mission01:

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
