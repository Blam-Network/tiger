# es\cosmo\refinery\enc_refinery_amb1.es
#
# The refinery's ambient layer: Hive in the shipping area, at the
# crashed pod and in the strike's arena, Fallen in the arena and the
# snowy hall, and the blast transition, two Fallen waves where the
# second comes as the first thins out.
#
# Retail runs the transition wave on its 30 s respawn timer (its
# _respawn_timer digest changed every 29.9 s in the Cosmodrome
# missions' public hosts, bundle_enc_refinery_amb1); none of its
# squads was on the wire. The wave's threshold (the second comes when
# one of the first is left) is a guess. The Devils' Lair runs
# enc_refinery_portal1 in this bubble instead.
#
# Everything else goes in as soon as the bubble loads, under the
# encounter manager, one body per member.

@activity_bundle("enc_refinery_amb1")

encounter_manager encounters
simple_encounter smpl_hive_shipping01
simple_encounter smpl_hive_crashed_pod01
simple_encounter smpl_hive_strike_arena01
simple_encounter smpl_fallen_strike_arena01
simple_encounter amb_fallen_snowyhall01
simple_encounter smpl_fallen_blast_transition_wave01
simple_encounter smpl_fallen_blast_transition_wave02
wave_encounter wave_encounter_fallen_blast_transition

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 18
    wave_encounter_fallen_blast_transition.add_wave(smpl_fallen_blast_transition_wave01, 1)
    wave_encounter_fallen_blast_transition.add_wave(smpl_fallen_blast_transition_wave02, 0)
    encounters.add_ambient_encounter(smpl_hive_shipping01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(smpl_hive_crashed_pod01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(smpl_hive_strike_arena01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(smpl_fallen_strike_arena01, 3, 100, 20, 30, 0)
    encounters.add_ambient_encounter(amb_fallen_snowyhall01, 2, 100, 20, 30, 0)
    encounters.add_ambient_encounter(wave_encounter_fallen_blast_transition, 5, 100, 20, 30, 0)
