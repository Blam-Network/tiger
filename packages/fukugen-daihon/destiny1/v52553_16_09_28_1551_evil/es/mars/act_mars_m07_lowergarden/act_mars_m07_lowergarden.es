# es\mars\act_mars_m07_lowergarden\act_mars_m07_lowergarden.es
#
# The Black Garden, the last story mission. The root starts nothing; the
# phases are the missions beside it, run in order. Mission file names are
# ours. From one retail capture: every timing is that run's.
#
#   act_mars_m07_lowergarden_mission1.esp   the Barrens: the Ghost's intro
#   act_mars_m07_lowergarden_mission2.esp   the valley: the Vex gate
#   act_mars_m07_lowergarden_mission3.esp   the catacombs
#   act_mars_m07_lowergarden_mission4.esp   the upper garden: the pit, the hydra
#   act_mars_m07_lowergarden_mission5.esp   the lower garden: glyphs, kiosk, the door
#   act_mars_m07_lowergarden_mission6.esp   the heart revealed (cinematic)
#   act_mars_m07_lowergarden_mission7.esp   the hop down: the Vex at the heart
#   act_mars_m07_lowergarden_mission8.esp   the darkness: two Sol Progeny
#   act_mars_m07_lowergarden_mission9.esp   the climax: the last one, the heart dies
#   act_mars_m07_lowergarden_mission10.esp  the outro
#
# The area encounters (catacombs, uppergarden, lowergarden) are scripts of
# their own. unknown_e44359c7 holds the music and the Ghost's lines that
# follow the fights; the lines tied to an objective are its mission's.
# The ending cinematic is its own activity (cine_end), not this script's.

@activity_bundle("act_mars_m07_lowergarden")
startup thread ss_mars_m07_lowergarden:
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
