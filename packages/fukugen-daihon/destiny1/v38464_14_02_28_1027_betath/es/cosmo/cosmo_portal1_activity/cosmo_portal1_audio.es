# es\cosmo\cosmo_portal1_activity\cosmo_portal1_audio.es
#
# The Devils' Lair's music. The pre-alpha's audio bundle holds only the three
# cues; the Ghost's lines are the phases' own sequences, which the missions
# play. cue1 runs under the refinery hack, cue2 under the ship's guards and
# cue3 under Sepiks Prime.

@activity_bundle("cosmo_portal1_audio")

sequence cue1
sequence cue2
sequence cue3
encounter_handle enc_refinery_portal1
squad sq_bossbattle_fallen01
squad sq_bossbattle_fallen02
squad sq_bossbattle_boss01

@startup()
script sc_hack_music():
    console = enc_refinery_portal1.sp_placement_array._object
    sleep_until(console.get_device_position() > 0)
    cue1.start()
    sleep_until(console.get_device_position() >= 1)
    sleep(3)
    cue1.stop()

@startup()
script sc_ship_music():
    sleep_until(guards_alive_count() > 0)
    cue2.start()
    sleep_until(guards_alive_count() == 0)
    cue2.stop()
    sleep_until(sq_bossbattle_boss01.alive_count() > 0)
    cue3.start()
    sleep_until_boss_dead()
    cue3.stop()

def guards_alive_count():
    return sq_bossbattle_fallen01.alive_count() + sq_bossbattle_fallen02.alive_count()

def sleep_until_boss_dead():
    while true:
        sleep_until(sq_bossbattle_boss01.alive_count() == 0)
        sleep(15)
        if sq_bossbattle_boss01.alive_count() == 0:
            break
