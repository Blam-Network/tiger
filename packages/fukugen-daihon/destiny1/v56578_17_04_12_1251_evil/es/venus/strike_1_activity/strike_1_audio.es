# es\venus\strike_1_activity\strike_1_audio.es
#
# The Nexus's Ghost lines. The intro and the first line play when the game
# starts; the rest follow the strike's own rows (the engineering bubble's
# trigger, the portal end door, the dig site bubble, the boss's guards).
# The music (music01, ascent) belongs to the missions that cue it.
#
# One run: md_s1_m1_d010 never played, so nothing starts it here. The dig
# site line waits on the bubble monitor, which the replay cannot feed.

@activity_bundle("strike_1_audio")

sequence intro
sequence music01
sequence md_s1_m1_d010
sequence md_s1_m1_d020
sequence md_s1_m1_d030
sequence md_s1_m1_d040
sequence md_s1_m2_d010
sequence md_s1_m3_d020
sequence md_s1_m4_d010
sequence md_s1_m4_d020
sequence ascent
dialog_trigger md_s1_m3_d010_trigger
trigger_volume tv_ruins_audio
location engineering
player_monitor pm_bubble_engineering bind(engineering)
location dig_site
player_monitor pm_bubble_dig_site bind(dig_site)
location vex_ruins
trigger_bubble_objective engineering_bubble_objective
object o_portal_end_door
squad sq_boss_guard01
squad sq_boss_guard02
squad sq_boss_guard03
squad sq_boss_guard04
squad sq_boss_guard05
squad sq_boss_guard06

@startup()
script sc_audio_main():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    intro.start()
    md_s1_m1_d020.start()
    print("md_s1_m1_d020")

@startup()
script sc_engineering():
    # the floor fight starts as the player enters the engineering bubble
    sleep_until(engineering_bubble_objective._player_trigger.is_triggered())
    md_s1_m1_d030.start()
    print("md_s1_m1_d030")
    # the last servitor dies and the portal end door opens
    sleep_until(o_portal_end_door.get_device_position() > 0)
    md_s1_m1_d030.stop()
    sleep(2)
    md_s1_m1_d040.start()
    print("md_s1_m1_d040")

@startup()
script sc_dig_site():
    sleep_until(pm_bubble_dig_site.get_count() > 0)
    md_s1_m2_d010.start()
    print("md_s1_m2_d010")

@startup()
script sc_ruins():
    # the Nexus Mind shows itself a while after its guards are dead
    sleep_until(guards_alive_count() > 5)
    sleep_until(guards_alive_count() == 0)
    sleep(12)
    md_s1_m3_d020.start()
    print("md_s1_m3_d020")

def guards_alive_count():
    return sq_boss_guard01.alive_count() + sq_boss_guard02.alive_count() + sq_boss_guard03.alive_count() + sq_boss_guard04.alive_count() + sq_boss_guard05.alive_count() + sq_boss_guard06.alive_count()
