# es\impactsite\mission_darksnow\unknown_0e747941.es
#
# The Cabal base in mission_darksnow (bundle 0E747941, file name unknown;
# bubble 1, the activity's own). The lures light the players' way in, a
# Taken centurion walks off through a portal ahead of them and another comes
# and goes, and the Cabal elevator cinematic plays. When mission 4 starts
# the reveal the door shuts, the Taken's visage shows itself and the Ghost
# talks; a blight opens, the psions come through it and the knight after
# them, and they move up as the visage goes. Mission 5 opens the hall:
# the Cabal and psions there fight as the players come in, the phalanxes
# and the anchors come at the next two triggers.
#
# One retail 2.3.1 run: every hold is its gap. No placement is on the wire:
# the squads with a task are placed with it, the rest are left for a run
# that shows them. The task names are the 1.33 tables'; several do not
# match their squad's name (the hall's psions take "hall_cabal"), as the
# tables have them. The elevator strobe's monitor counted the player and
# it never lit; the psion ambush, the scare tactics bodies and the second
# lure never moved.

@activity_bundle(0x0E747941)

objective mission_darksnow_base_objective
@objective(mission_darksnow_base_objective)
squad init_psion_squad01
@objective(mission_darksnow_base_objective)
squad init_psion_squad02
@objective(mission_darksnow_base_objective)
squad init_psion_squad03
@objective(mission_darksnow_base_objective)
squad init_psion_squad04
@objective(mission_darksnow_base_objective)
squad taken_knight_squad
squad_member taken_knight_squad__knight
squad visage_squad
@objective(mission_darksnow_base_objective)
squad hall_cabal_squad
@objective(mission_darksnow_base_objective)
squad hall_psion_squad
@objective(mission_darksnow_base_objective)
squad door_phalanx_squad
@objective(mission_darksnow_base_objective)
squad cabal_playfight_squad
@objective(mission_darksnow_base_objective)
squad hall_phalanx_squad01
@objective(mission_darksnow_base_objective)
squad hall_phalanx_squad02
@objective(mission_darksnow_base_objective)
squad hall_phalanx_squad03
@objective(mission_darksnow_base_objective)
squad hall_anchor_squad01
@objective(mission_darksnow_base_objective)
squad hall_anchor_squad02
@objective(mission_darksnow_base_objective)
squad hall_anchor_phalanx_squad01
squad taken_portal_squad01
squad_member taken_portal_squad01__centurion
squad taken_portal_squad02
squad_member taken_portal_squad02__centurion
squad cabal_casualty_squad01
squad_member cabal_casualty_squad01__cabal01
taken_fx_controller taken_fx_controller_base
taken_blight knight_blight
specops_lures specops_base_lures
device taken_door_device
device post_taken_door_device
cinematic cabal_elevator_cinematic
hop_on taken_audio_hopon
object_filter taken_audio_filter
performance visage_machine
performance chimera_intro_performance
performance centurion_taken_portal_despawn01
performance centurion_taken_portal_despawn02
performance idle_then_die1
trigger_volume cabal_elevator_volume
player_trigger cabal_elevator_trigger bind(cabal_elevator_volume)
trigger_volume tv_base_portal_despawn1
player_trigger pt_base_portal_despawn1 bind(tv_base_portal_despawn1)
trigger_volume tv_base_portal_despawn2
player_trigger pt_base_portal_despawn2 bind(tv_base_portal_despawn2)
trigger_volume taken_portal_volume
player_trigger taken_portal_trigger bind(taken_portal_volume)
trigger_volume hall_spawn_volume
player_trigger hall_spawn_trigger bind(hall_spawn_volume)
trigger_volume hall_phalanxes_volume
player_trigger hall_phalanxes_trigger bind(hall_phalanxes_volume)
trigger_volume hall_anchor_volume
player_trigger hall_anchor_trigger bind(hall_anchor_volume)
trigger_volume tv_base_cabal_slumper1
player_trigger pt_cabal_slumper1 bind(tv_base_cabal_slumper1)
encounter_handle unknown_1702136e
# set as the knight comes through the blight; mission 4 brings up its
# objective then
bool knight_arrived = false

@startup()
script sc_base():
    taken_fx_controller_base.create(0)
    specops_base_lures.o_lure_first.create()
    specops_base_lures.o_lure_first.set_device_position(0)
    taken_audio_hopon.set_filter(taken_audio_filter)
    hall_spawn_trigger.disable()
    taken_portal_squad01__centurion.place()
    centurion_taken_portal_despawn01.start_performance("0xFD3BA683")

@startup()
# each strobe flashes a second after its monitor counts a player
script sc_first_strobe():
    sleep_until(specops_base_lures.pm_first_strobe.test_any_inside())
    sleep(0.9)
    specops_base_lures.o_first_strobe.create()
    sleep(2)
    specops_base_lures.o_first_strobe.delete_object()

@startup()
script sc_lure_first():
    sleep_until(specops_base_lures.pm_lure_first.test_any_inside())
    sleep(0.9)
    specops_base_lures.o_lure_first.set_device_position(1)
    sleep(4.2)
    specops_base_lures.o_lure_first.delete_object()

@startup()
script sc_second_strobe():
    sleep_until(specops_base_lures.pm_second_strobe.test_any_inside())
    sleep(0.8)
    specops_base_lures.o_second_strobe.create()
    sleep(4)
    specops_base_lures.o_second_strobe.delete_object()

@startup()
script sc_enc_room_strobe():
    sleep_until(specops_base_lures.pm_enc_room_strobe.test_any_inside())
    sleep(1)
    specops_base_lures.o_enc_room_strobe.create()
    sleep(4.2)
    specops_base_lures.o_enc_room_strobe.delete_object()

@startup()
script sc_cabal_elevator():
    sleep_until(cabal_elevator_trigger.is_triggered())
    sleep(1)
    cabal_elevator_cinematic.start()

@startup()
# the centurion who stood at the start walks off through his portal
script sc_portal_despawn1():
    sleep_until(pt_base_portal_despawn1.is_triggered())
    sleep(0.9)
    centurion_taken_portal_despawn01.cue_performance("0x2CA330DB")

@startup()
# a second centurion comes through and leaves the same way
script sc_portal_despawn2():
    sleep_until(taken_portal_trigger.is_triggered())
    sleep(1.1)
    taken_portal_squad02__centurion.place()
    centurion_taken_portal_despawn02.start_performance("0xFD3BA683")
    sleep_until(pt_base_portal_despawn2.is_triggered())
    sleep(0.6)
    centurion_taken_portal_despawn02.cue_performance("0x2CA330DB")

# mission 4's reveal
def taken_reveal():
    sc_taken_reveal.wake()

def taken_are_dead():
    if not knight_arrived:
        return false
    return taken_knight_squad.alive_count() + init_psion_squad01.alive_count() + init_psion_squad02.alive_count() + init_psion_squad03.alive_count() + init_psion_squad04.alive_count() == 0

# The visage shows itself and the Ghost talks a moment later; seven seconds
# on the blight opens, the psions and the knight come through it three
# seconds after that, and as the visage goes they move up the back, the
# blight closing behind them.
script sc_taken_reveal():
    taken_door_device.set_device_position(0)
    visage_machine.start_performance("0x2BA0A4BA")
    unknown_1702136e.phm_dks_990_130_dialogue_sequence.start()
    sleep(7)
    knight_blight.open()
    sleep(3)
    for sq in [init_psion_squad01, init_psion_squad02, init_psion_squad03, init_psion_squad04]:
        sq.set_task("psions")
        sq.place()
    taken_fx_controller_base.set_intensity(0.9)
    taken_knight_squad.set_task("0xBE3D4ABB")
    taken_knight_squad.place()
    knight_arrived = true
    sleep(3)
    init_psion_squad02.set_task("psions_upper_back")
    sleep(1)
    knight_blight.close()
    chimera_intro_performance.start_performance("0x06511919")
    init_psion_squad04.set_task("psions_upper_back")
    sleep(3)
    init_psion_squad01.set_task("psions_upper_back")
    sleep_until(taken_are_dead())
    taken_fx_controller_base.set_intensity(0)

# mission 5 opens the hall
def open_hall():
    hall_spawn_trigger.enable()
    hall_spawn_trigger.reset()
    sc_hall.wake()
    sc_hall_phalanxes.wake()
    sc_hall_anchors.wake()

script sc_hall():
    sleep_until(hall_spawn_trigger.is_triggered())
    sleep(1.3)
    door_phalanx_squad.set_task("playfight_psions")
    hall_cabal_squad.set_task("psions_upper")
    hall_psion_squad.set_task("hall_cabal")
    cabal_playfight_squad.set_task("psions_center")
    for sq in [door_phalanx_squad, hall_cabal_squad, hall_psion_squad, cabal_playfight_squad]:
        sq.place()
    post_taken_door_device.set_device_position(1)
    sleep(0.4)
    cabal_casualty_squad01__cabal01.place()
    idle_then_die1.start_performance("0x70D80E9A")
    sleep(0.7)
    taken_fx_controller_base.set_intensity(0.9)
    sleep_until(pt_cabal_slumper1.is_triggered())
    sleep(0.5)
    idle_then_die1.cue_performance("0x2CA330DB")

script sc_hall_phalanxes():
    sleep_until(hall_phalanxes_trigger.is_triggered())
    for sq in [hall_phalanx_squad01, hall_phalanx_squad02, hall_phalanx_squad03]:
        sleep(0.4)
        sq.set_task("hall_psions")
        sq.place()

script sc_hall_anchors():
    sleep_until(hall_anchor_trigger.is_triggered())
    sleep(1)
    hall_anchor_squad01.set_task("hall_phalanxes")
    hall_anchor_squad01.place()
    hall_anchor_squad02.set_task("hall_phalanxes")
    hall_anchor_squad02.place()
    hall_anchor_phalanx_squad01.set_task("hall_psion_back")
    hall_anchor_phalanx_squad01.place()
