# es\cosmo\dome_a\enc_dome_a_patrols1.es
#
# The patrol targets of dome A: two named squads, each an ambient encounter
# of its own, that the patrol's kill missions (cosmo_patrols_1's
# patrol_kill_vip_<name>) send the players after. A target is put out while
# its mission is active and taken away (despawned if still standing) once
# the mission ends.
#
# Retail 2.3.1's equivalent bundle (5F241E51) arrives in the first world
# update with its targets never placed and its hop-on unfiltered, and stays
# so for 32 minutes with no target mission taken. This build's targets bring
# a backup squad each (_squad[1]), as retail's do. Body counts are the rows'
# defaults: no capture placed a target.

@activity_bundle("enc_dome_a_patrols1")

encounter_handle cosmo_patrols_1
simple_encounter sq_patrol_vip_shank
simple_encounter sq_patrol_vip_dreg_pistol
hop_on _invuln_hopon  # WARNING: unused - unfiltered all of retail's run; what it shields shows once a target mission is recorded
object_filter of_hopon  # WARNING: unused - the hop-on's filter, empty all of retail's run

@startup()
script sc_vip_shank():
    hunt(sq_patrol_vip_shank, cosmo_patrols_1.patrol_kill_vip_shank)

@startup()
script sc_vip_dreg_pistol():
    hunt(sq_patrol_vip_dreg_pistol, cosmo_patrols_1.patrol_kill_vip_dreg_pistol)

# the target goes in with its mission; once the named squad (its _squad[0];
# the backup does not count) has stood and is wiped the mission is told,
# and the target is taken away as the mission ends
def hunt(target, mission):
    while true:
        sleep_until(mission.is_active())
        target.activate()
        sleep_until(target._squad[0].alive_count() > 0 or not mission.is_active())
        sleep_until(target._squad[0].alive_count() == 0 or not mission.is_active())
        if mission.is_active():
            mission.target_down()
        sleep_until(not mission.is_active())
        target.deactivate()
