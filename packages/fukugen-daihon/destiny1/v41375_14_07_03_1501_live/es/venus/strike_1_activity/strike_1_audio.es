# es\venus\strike_1_activity\strike_1_audio.es
#
# Venus strike 1's music and dialogue. Plays the intro and music at the
# start, and the line for reaching the dig site. What plays is guessed from the
# row names.

c_sequence_host intro  # true name unknown
c_sequence_host music01  # true name unknown
c_location_sensor_host engineering  # true name unknown
c_player_monitor_sensor_host pm_bubble_engineering bind(engineering)  # true name unknown
c_sequence_host md_s1_m2_d010  # true name unknown
c_location_sensor_host dig_site  # true name unknown
c_player_monitor_sensor_host pm_bubble_dig_site bind(dig_site)  # true name unknown

startup thread sc_main_thread:
    intro.start()
    music01.start()
    sleep_until(pm_bubble_dig_site.get_count() > 0)
    md_s1_m2_d010.start()
    print("md_s1_m2_d010")
