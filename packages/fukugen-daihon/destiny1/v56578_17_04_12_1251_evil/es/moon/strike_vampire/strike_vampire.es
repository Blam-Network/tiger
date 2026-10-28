# es\moon\strike_vampire\strike_vampire.es
#
# The Moon strike through the launch tubes, the Fallen throne room and the
# Fallen bay: fight past the Hive in the launch tubes, beat back the Fallen
# baron in the throne room until he flees through his teleporter, chase him
# to the Ketch's bay, kill his spider tank, chase him again into the depot
# and kill him there. The root puts the lifetime in pregame and holds the
# music, the Ghost's lines and the cue's sections; the phases are the
# missions beside it, run in order. Mission file names are ours.
#
#   strike_vampire_mission1.esp  launchtubes: the Hive in the bowl, the gates
#   strike_vampire_mission2.esp  moonthrone: the baron's throne room
#   strike_vampire_mission3.esp  moonbay: the baron at the eye
#   strike_vampire_mission4.esp  moonbay: to the bay
#   strike_vampire_mission5.esp  moonbay: the spider tank
#   strike_vampire_mission6.esp  moonbay: the chase to the depot
#   strike_vampire_mission7.esp  moonbay: the baron's last stand
#   strike_vampire_mission8.esp  the end of the strike
#
# The launch tubes' fights are unknown_d733da5c's, the throne room's
# unknown_b4046ff3's, the bay's unknown_9f24395b's. Authored from one retail
# 2.3.1 run (tiger-packet-analysis docs/missions/strike_vampire.md) for the
# 1.33 build: every wait is that run's, unconfirmed. In that run the fireteam
# grew from one to two players mid-strike and wiped three times.

@activity_bundle("strike_vampire")
# The player spawns in the launch tubes (bubble 3, region 24) at the GAS's
# spawn 95BB611A, crosses to the throne room (8) and on to the bay (7),
# where the last six phases play. The region transitions are the ones the GAS
# named once the client had been there; after a wipe in the throne room the
# GAS named 95BB6119 and after the second bay wipe 22322A31 (the phases'
# checkpoints; the root can name only one per region).
@activity("strike_vampire")
@start_slice("launchtubes", "phase_launchtubes_main")
@phase("phase_launchtubes_main", "launchtubes")
@phase("phase_moonthrone_main", "moonthrone")
@phase("phase_moonbay_eye", "moonbay")
@phase("phase_moonbay_pretank", "moonbay")
@phase("phase_moonbay_tank", "moonbay")
@phase("phase_moonbay_chase", "moonbay")
@phase("phase_moonbay_boss", "moonbay")
@phase("phase_moonbay_end", "moonbay")
@spawn_transition(0x95BB611A)
@region_spawn_transition(24, 0x95BB611A)
@region_spawn_transition(64, 0xB5857907)
@region_spawn_transition(56, 0xF307194C)

strike_vampire_mission1 phase_launchtubes_main
strike_vampire_mission2 phase_moonthrone_main
strike_vampire_mission3 phase_moonbay_eye
strike_vampire_mission4 phase_moonbay_pretank
strike_vampire_mission5 phase_moonbay_tank
strike_vampire_mission6 phase_moonbay_chase
strike_vampire_mission7 phase_moonbay_boss
strike_vampire_mission8 phase_moonbay_end
sequence music_intro
sequence music_cue1
sequence music_outro
sequence mns02_100_20
sequence mns02_100_30
sequence mns02_100_40
sequence mns02_100_50
sequence mns02_100_60
sequence mns02_100_70
sequence mns02_100_80
sequence mns02_100_90
sequence mns02_100_100
sequence mns02_100_110
sequence mns02_100_120

# the phase running now (0 the launch tubes .. 7 the end), as the missions
# report it, and the cue's sections since it last started
int i_phase = -1
int i_cue_mask = 0
bool b_cue_playing = false

@startup()
script ss_strike_vampire():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)

# Each mission says so as it starts. A phase starting a second time is a
# hard wipe, which in retail stopped the cue with every other sequence: the
# phase then starts it again from its own sections.
def phase_start(index):
    if index == i_phase:
        music_cue1.stop()
        b_cue_playing = false
        i_cue_mask = 0
    i_phase = index

# The cue's switch mask is one bit per section, and a section once reached
# stays on until the cue stops: 1, 3, 7 .. 63 through the throne room and the
# eye, 16 and 48 when the eye starts over, 128 when the tank starts over.
def cue(sections):
    bit = 1
    while bit <= sections:
        if has_bit(sections, bit) and not has_bit(i_cue_mask, bit):
            i_cue_mask = i_cue_mask + bit
        bit = bit * 2
    if not b_cue_playing:
        music_cue1.start()
        b_cue_playing = true
    music_cue1.set_switch_mask(i_cue_mask)

def cue_stop():
    music_cue1.stop()
    b_cue_playing = false

def has_bit(mask, bit):
    return mask % (bit * 2) >= bit
