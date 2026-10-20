# es\moon\act_moon_m5_strength\unknown_d53aaa20.es
#
# The Chamber of Night itself (bundle name uncracked). The gates stand from
# the start; the rush gate opens on its trigger as the players come down
# the approach. Mission 7 wakes the ritual (three wizards casting on the
# shard, the anomaly's effects around them) and, once they are dead, the
# waves: thrall exploders, knights and troopers in two rounds, then the ogre
# with its thrall and a last trooper squad. The ogre's death ends the climax
# and the leftover troopers are killed off. Mission 8 wakes the shard's end.
#
# One run: the waits between waves are this run's, apart from the squads
# whose deaths the client reported (troopers a, knights b, troopers b, the
# ogre).

@activity_bundle(0xD53AAA20)

object o_gate_intro
object o_gate_swords
object o_gate_selection
object o_gate_rush
player_trigger pt_gate
player_trigger pt_gate_rush
objective obj_strength_ch1
squad sq_dark_ritual
encounter_handle specops_moon_anomaly
@member_counts({thrall: 3, exploders: 1})
squad sq_thrall_exploders_a1
@member_counts({knight: 1, 0xFA650FD6: 1, 0xFA650FD5: 1, trooper: 2})
squad sq_knights_a
@member_counts({trooper: 3})
squad sq_troopers_a
@member_counts({exploders: 1, thrall: 2})
squad sq_thrall_exploders_b1
@member_counts({exploders: 2, thrall: 2})
squad sq_thrall_exploders_b2
@member_counts({wizard: 1, knights: 2})
squad sq_knights_b
@member_counts({trooper: 5})
squad sq_troopers_b
@member_counts({0xB19FA1DF: 1})
squad sq_minibosses
@member_counts({thrall: 1, thrall_1: 1, thrall_2: 1})
squad sq_thrall_miniboss
@member_counts({trooper: 3})
squad sq_troopers_c
sequence seq_wave_announce1
sequence seq_wave_announce3
sequence seq_ogreroar_close
hop_on ho_void_t01
sequence seq_strength_music
bool waves_complete = false

@startup()
script sc_chamber_main():
    o_gate_intro.create()
    o_gate_swords.create()
    o_gate_selection.create()
    o_gate_rush.create()
    sq_dark_ritual.set_objective(obj_strength_ch1)
    sleep_until(pt_gate_rush.is_triggered())
    sleep(1)
    o_gate_rush.set_device_position(1)

script sc_ritual():
    sleep(6)
    sq_dark_ritual.set_task("0xE3CC09AD")
    sq_dark_ritual.place()
    sleep(1)
    specops_moon_anomaly.o_darkness.create()
    specops_moon_anomaly.o_traveler_shard.create()
    specops_moon_anomaly.o_wizard_aura.create()
    specops_moon_anomaly.ofi_anomaly_wizard_cast.add(sq_dark_ritual)
    specops_moon_anomaly.ho_anomaly_wizard_cast.set_filter(specops_moon_anomaly.ofi_anomaly_wizard_cast)
    o_gate_intro.set_device_position(1)
    # the first wizard to die breaks the casting
    sleep_until(sq_dark_ritual.alive_count() >= 3)
    sleep_until(sq_dark_ritual.alive_count() < 3)
    set_anomaly(0.5)
    specops_moon_anomaly.ofi_anomaly_wizard_cast.clear()

script sc_waves():
    o_gate_intro.set_device_position(0)
    pt_gate.reset()
    sleep(7)
    place_on_task(sq_thrall_exploders_a1, "0x8FC74ADA")
    o_gate_selection.set_device_position(1)
    seq_wave_announce1.start()
    seq_strength_music.set_switch_mask(15)
    sleep(8)
    place_on_task(sq_knights_a, "0xBB715615")
    place_on_task(sq_troopers_a, "0x7E57303C")
    # the troopers press in once the knights are down (their deaths never reached the wire)
    sleep(9)
    sq_troopers_a.set_task("0x263BE300")
    sleep_until_dead(sq_troopers_a)
    sleep(1)
    place_on_task(sq_thrall_exploders_b1, "0x8FC74ADA")
    sleep(5)
    place_on_task(sq_thrall_exploders_b2, "0x8FC74ADA")
    o_gate_intro.set_device_position(1)
    seq_wave_announce3.start()
    seq_strength_music.set_switch_mask(31)
    sleep(5)
    place_on_task(sq_knights_b, "0x8FC74ADA")
    place_on_task(sq_troopers_b, "0x6F64E317")
    sleep_until_dead(sq_knights_b)
    sq_troopers_b.set_task("0xEF8C8A0E")
    sleep_until_dead(sq_troopers_b)
    sleep(9)
    seq_ogreroar_close.start()
    sleep(1)
    place_on_task(sq_minibosses, "0x9FB5090E")
    o_gate_swords.set_device_position(1)
    seq_strength_music.set_switch_mask(63)
    sleep(1)
    place_on_task(sq_thrall_miniboss, "0x8FC74ADA")
    sleep(1)
    place_on_task(sq_troopers_c, "0xB0A871C3")
    sleep_until_dead(sq_minibosses)
    sleep(1)
    sq_troopers_c.kill()
    ho_void_t01.clear_filter()
    seq_strength_music.set_switch_mask(127)
    waves_complete = true

script sc_shard():
    sleep(1)
    set_anomaly(1)
    sleep(5)
    specops_moon_anomaly.o_wizard_aura.delete_object()
    sleep(7)
    specops_moon_anomaly.o_traveler_shard.delete_object()
    sleep(11)
    specops_moon_anomaly.o_darkness.delete_object()

def set_anomaly(position):
    specops_moon_anomaly.o_darkness.set_device_position(position)
    specops_moon_anomaly.o_traveler_shard.set_device_position(position)
    specops_moon_anomaly.o_wizard_aura.set_device_position(position)

def place_on_task(sq, task):
    sq.set_objective(obj_strength_ch1)
    sq.set_task(task)
    sq.place()

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
