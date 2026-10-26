# es\moon\act_moon_m5_strength\unknown_d53aaa20.es
#
# The Chamber of Night itself (bundle name uncracked). The gates stand from
# the start; the rush gate opens once a player is at it and the approach's
# cave is clear (enc_strength_m5 calls the next wave in the same frame).
# Mission 7 wakes the ritual (three wizards casting on the shard, the
# anomaly's effects around them) and, once they are dead, the waves: thrall
# exploders, then knights and troopers, a second round of each, then the
# ogre with its thrall and a last trooper squad. The ogre's death ends the
# climax and the leftover troopers are killed off. Mission 8 wakes the
# shard's end.
#
# Two runs. Each wave follows the last one's deaths within a second or two,
# apart from three steady waits: troopers a press in nine seconds
# after they are placed (9.0 / 9.2 s), the second exploders and the knights
# five seconds apart (5.0 / 5.2, 4.7 / 4.9 s), and the ogre's roar nine
# seconds after the second round is dead (9.0 / 8.7 s). The casting broke
# 2.2 / 0.2 s after the first wizard died.

@activity_bundle(0xD53AAA20)

object o_gate_intro
object o_gate_swords
object o_gate_selection
object o_gate_rush
player_trigger pt_gate
player_trigger pt_gate_rush
encounter_handle enc_strength_m5
objective obj_strength_ch1
squad sq_dark_ritual
encounter_handle specops_moon_anomaly
squad sq_thrall_exploders_a1
squad sq_knights_a
squad sq_troopers_a
squad sq_thrall_exploders_b1
squad sq_thrall_exploders_b2
squad sq_knights_b
squad sq_troopers_b
squad sq_minibosses
squad sq_thrall_miniboss
squad sq_troopers_c
sequence seq_wave_announce1
sequence seq_wave_announce3
sequence seq_ogreroar_close
sequence seq_strength_music
bool waves_complete = false

@startup()
script sc_chamber_main():
    o_gate_intro.create()
    o_gate_swords.create()
    o_gate_selection.create()
    o_gate_rush.create()
    sq_dark_ritual.set_objective(obj_strength_ch1)
    sleep_until(pt_gate_rush.is_triggered() and enc_strength_m5.cave_cleared)
    o_gate_rush.set_device_position(1)

script sc_ritual():
    sleep(6)
    sq_dark_ritual.set_task("arena_right")
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
    place_on_task(sq_thrall_exploders_a1, "thrall")
    o_gate_selection.set_device_position(1)
    seq_wave_announce1.start()
    seq_strength_music.set_switch_mask(15)
    sleep_until_dead(sq_thrall_exploders_a1)
    place_on_task(sq_knights_a, "arena_left_troopers")
    place_on_task(sq_troopers_a, "arena_left_troopers_push")
    sleep(9)
    sq_troopers_a.set_task("gate_arena_left")
    sleep_until_dead(sq_troopers_a)
    sleep(1)
    place_on_task(sq_thrall_exploders_b1, "thrall")
    sleep(5)
    place_on_task(sq_thrall_exploders_b2, "thrall")
    o_gate_intro.set_device_position(1)
    seq_wave_announce3.start()
    seq_strength_music.set_switch_mask(31)
    sleep(5)
    place_on_task(sq_knights_b, "thrall")
    place_on_task(sq_troopers_b, "gate_arena_right")
    sleep_until_dead(sq_knights_b)
    # the troopers fall back to the arena once the knights are down, if any
    # are left
    if sq_troopers_b.alive_count() > 0:
        sq_troopers_b.set_task("arena_left")
    sleep_until(sq_troopers_b.alive_count() == 0)
    sleep(9)
    seq_ogreroar_close.start()
    sleep(1)
    place_on_task(sq_minibosses, "arena_right_rush")
    o_gate_swords.set_device_position(1)
    seq_strength_music.set_switch_mask(63)
    sleep(1)
    place_on_task(sq_thrall_miniboss, "thrall")
    sleep(1)
    place_on_task(sq_troopers_c, "0xB0A871C3")
    sleep_until_dead(sq_minibosses)
    sq_troopers_c.kill()
    sleep(1)
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
