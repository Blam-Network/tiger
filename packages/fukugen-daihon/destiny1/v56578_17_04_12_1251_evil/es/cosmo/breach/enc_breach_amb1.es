# es\cosmo\breach\enc_breach_amb1.es
#
# The breach's ambient layer: as a player comes into the breach, its control
# panel and gating lights come on and a squad of Fallen goes in; the squad is
# against the breach's objective from the start (quest_bonzo_dlc01's world
# entry has it so without the player going there). Pooled over every 2.3.1
# capture that loads the bundle (the Cosmodrome story missions, patrol, the
# strikes and the Taken King quests); only quest_infidel's player went into
# the breach, so the rule is that run's.

@activity_bundle("enc_breach_amb1")

objective obj_breach_fallen
squad squad_1
location breach
player_trigger pt_bubble bind(breach)
object o_breach_control
object o_breach_gating_lights

@startup()
script sc_breach_amb1():
    squad_1.set_objective(obj_breach_fallen)
    squad_1.set_task("task")
    sleep_until(pt_bubble.is_triggered())
    o_breach_control.create()
    o_breach_gating_lights.create()
    o_breach_control.set_device_position(1)
    o_breach_gating_lights.set_device_position(1)
    squad_1.place()
