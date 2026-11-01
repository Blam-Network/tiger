# es\mars\penthouse\enc_penthouse_m03.es
#
# The Buried City's penthouse rooms. Rooms 0 and 1 come in on their entry
# triggers, room 1's back line once its front starts to fall. Rooms 2 and 3
# are the darkness phase's: it arms their triggers and room 2 comes in as a
# player enters it again; reaching the major's spawn (the phase's trigger)
# starts room 3's waves, each one once the last is down, the third through
# the courtyard door with its major. The climax music steps up with the
# waves and drops out when the major dies. A squad that loses a member, or
# is wiped, moves to its next task. Task names are uncracked and written as
# hashes.
#
# One run (2026-11-01): each step follows its trigger or the last death by
# about a second, each task change a squad's loss by about half a second.
# Room 2's trigger fired before the phase armed it, with no response.

@activity_bundle("enc_penthouse_m03")

object o_courtyard_door_dummy
objective obj_penthouse_m03_room0and1
objective obj_penthouse_m03_room2
objective obj_penthouse_m03_room3
@objective(obj_penthouse_m03_room0and1)
@member_counts({phalanx: 2})
squad sq_room0_support1
@objective(obj_penthouse_m03_room0and1)
squad sq_room1_anchor1
@objective(obj_penthouse_m03_room0and1)
@member_counts({legionary: 2})
squad sq_room1_support1
@objective(obj_penthouse_m03_room0and1)
@member_counts({legionary: 2})
squad sq_room1_support2
@objective(obj_penthouse_m03_room0and1)
@member_counts({phalanx: 2})
squad sq_room1_support3
@objective(obj_penthouse_m03_room0and1)
@member_counts({phalanx: 2})
squad sq_room1_support4
@objective(obj_penthouse_m03_room0and1)
squad sq_room1_support5
@objective(obj_penthouse_m03_room0and1)
squad sq_room1_support6
@objective(obj_penthouse_m03_room2)
@member_counts({legionary: 2})
squad sq_room2_support1
@objective(obj_penthouse_m03_room2)
@member_counts({legionary: 2})
squad sq_room2_support2
@objective(obj_penthouse_m03_room3)
@member_counts({phalanx: 2})
squad sq_room3_wave1_support1
@objective(obj_penthouse_m03_room3)
@member_counts({psion: 2})
squad sq_room3_wave1_support2
@objective(obj_penthouse_m03_room3)
squad sq_room3_wave1_support3
@objective(obj_penthouse_m03_room3)
@member_counts({legionary: 2})
squad sq_room3_wave2_support1
@objective(obj_penthouse_m03_room3)
@member_counts({legionary: 2})
squad sq_room3_wave2_support2
@objective(obj_penthouse_m03_room3)
@member_counts({psion: 2})
squad sq_room3_wave2_support3
@objective(obj_penthouse_m03_room3)
squad sq_room3_wave3_major1
squad_member sq_room3_wave3_major1__major_centurion
@objective(obj_penthouse_m03_room3)
@member_counts({phalanx: 2})
squad sq_room3_wave3_support1
@objective(obj_penthouse_m03_room3)
@member_counts({psion: 2})
squad sq_room3_wave3_support2
@objective(obj_penthouse_m03_room3)
@member_counts({psion: 2})
squad sq_room3_wave3_support3
trigger_volume tv_room0_entry
player_trigger pt_room0_entry bind(tv_room0_entry)
trigger_volume tv_room1_entry
player_trigger pt_room1_entry bind(tv_room1_entry)
trigger_volume tv_room2and3
player_trigger pt_room2and3 bind(tv_room2and3)
trigger_volume tv_room2_exit
player_trigger pt_room2_exit bind(tv_room2_exit)
trigger_volume tv_room3_whole
player_trigger pt_room3_whole bind(tv_room3_whole)
sequence seq_m_climax_s01
sequence seq_d_cabal_wave_announce
bool rooms_clear

@startup()
script sc_penthouse():
    o_courtyard_door_dummy.create()
    o_courtyard_door_dummy.set_device_position(0)
    sc_room0.wake()
    sc_room1.wake()

# Rooms 0 and 1 ------------------------------------------------------------

script sc_room0():
    sleep_until(pt_room0_entry.is_triggered())
    sleep(1)
    place_on_task(sq_room0_support1, "0x45AE8441")

script sc_room1():
    sleep_until(pt_room1_entry.is_triggered())
    sleep(0.6)
    place_on_task(sq_room1_anchor1, "0x305097EC")
    place_on_task(sq_room1_support1, "0x83C22064")
    place_on_task(sq_room1_support2, "0xEE1FD406")
    sc_room1_front.wake()
    # the back line comes in as the front's first squad loses one
    sleep_until(lost_one(sq_room1_support1))
    sq_room1_support1.set_task("0xC2985A44")
    sleep(0.5)
    place_on_task(sq_room1_support3, "0x4C3EF83B")
    place_on_task(sq_room1_support4, "0xB1A1D25B")
    sleep_until(lost_one(sq_room1_support4))
    sq_room1_support4.set_task("0x7B42698F")
    sleep_until(sq_room1_support4.alive_count() == 0)
    sq_room1_support3.set_task("0x7B42698C")
    sq_room1_support4.set_task("0x7B42698C")
    sleep(0.7)
    sq_room1_anchor1.set_task("0x3DC34355")

script sc_room1_front():
    sleep_until(lost_one(sq_room1_support2))
    sq_room1_support1.set_task("0xC2985A47")
    sq_room1_support2.set_task("0xC2985A47")

# Rooms 2 and 3 ------------------------------------------------------------

# Woken by the darkness phase as it starts.
script sc_rooms_2_and_3():
    pt_room2and3.reset()
    pt_room2_exit.reset()
    pt_room3_whole.reset()
    sleep_until(pt_room2and3.is_triggered())
    sleep(1)
    place_on_task(sq_room2_support1, "0x9579890B")
    place_on_task(sq_room2_support2, "0x20385E0B")
    place_on_task(sq_room3_wave1_support2, "0x37CF0215")

# Woken by the darkness phase once a player reaches the major's spawn.
script sc_room3():
    sq_room2_support1.set_task("0x15E47969")
    place_on_task(sq_room3_wave1_support1, "0xAF6E43E0")
    sc_room2_wiped.wake()
    sleep(1)
    seq_m_climax_s01.set_switch_mask(3)
    sleep_until(sq_room3_wave1_support1.alive_count() + sq_room3_wave1_support2.alive_count() == 0)
    sleep(1.3)
    place_on_task(sq_room3_wave2_support1, "0xF68C734C")
    place_on_task(sq_room3_wave2_support2, "0x3115532E")
    place_on_task(sq_room3_wave2_support3, "0x2F9462C3")
    sc_wave2.wake()
    sleep(0.9)
    seq_m_climax_s01.set_switch_mask(7)
    sleep_until(sq_room3_wave2_support1.alive_count() + sq_room3_wave2_support2.alive_count() + sq_room3_wave2_support3.alive_count() == 0)
    sleep(0.8)
    o_courtyard_door_dummy.set_device_position(1)
    sq_room3_wave3_major1.set_task("0xA95E207B")
    sq_room3_wave3_major1__major_centurion.place()
    place_on_task(sq_room3_wave3_support1, "0x45479DEC")
    place_on_task(sq_room3_wave3_support2, "0x47E3547A")
    place_on_task(sq_room3_wave3_support3, "0x47E3547A")
    sc_wave3.wake()
    sleep(3.3)
    seq_d_cabal_wave_announce.start()
    sleep(3.1)
    seq_m_climax_s01.set_switch_mask(15)
    sleep_until(not sq_room3_wave3_major1__major_centurion.is_alive())
    sleep(0.7)
    seq_m_climax_s01.set_switch_mask(31)
    seq_m_climax_s01.stop()
    sleep_until(sq_room3_wave3_support1.alive_count() + sq_room3_wave3_support2.alive_count() + sq_room3_wave3_support3.alive_count() + sq_room2_support1.alive_count() + sq_room2_support2.alive_count() == 0)
    rooms_clear = true

script sc_room2_wiped():
    sleep_until(sq_room2_support1.alive_count() == 0)
    sq_room2_support1.set_task("0x4E337FDC")
    sq_room2_support2.set_task("0x4E337FDC")

script sc_wave2():
    sleep_until(lost_one(sq_room3_wave2_support1))
    sq_room3_wave2_support1.set_task("0x5D9BEDA8")
    sleep_until(sq_room3_wave2_support1.alive_count() == 0)
    sq_room3_wave2_support1.set_task("0xCFDE351F")
    sq_room3_wave2_support2.set_task("0xCFDE351F")

script sc_wave3():
    sleep_until(lost_one(sq_room3_wave3_support2))
    sq_room3_wave3_support1.set_task("0x94FE5D5B")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

# A squad of two that has lost a member.
def lost_one(sq):
    return sq.alive_count() <= 1
