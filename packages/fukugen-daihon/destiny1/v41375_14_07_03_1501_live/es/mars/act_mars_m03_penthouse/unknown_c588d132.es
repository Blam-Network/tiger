# es\mars\act_mars_m03_penthouse\unknown_c588d132.es
#
# Music and the Ghost's lines for The Buried City. The lines tied to an
# objective or a phase are started by the missions, the climax music's
# steps by enc_penthouse_m03; this script plays the one on its own trigger
# by the downtown console. The clean room's trigger is the darkness
# mission's.
#
# One run: the console line started with the trigger's fire, on the tick
# the console's objective went active.

@activity_bundle(0xC588D132)

trigger_volume tv_downtown_obj_near
player_trigger pt_downtown_obj_near bind(tv_downtown_obj_near)
sequence seq_d_downtown_obj_s01

@startup()
script sc_downtown_obj_near():
    sleep_until(pt_downtown_obj_near.is_triggered())
    seq_d_downtown_obj_s01.start()
