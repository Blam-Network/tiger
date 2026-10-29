# es\venus\unknown_972b0f9c.es
#
# The Taken's hold on the vex complex's bridge (Venus' public bubble 4;
# bundle 972B0F9C, file name unknown), loaded with Venus' ambient layer by
# the patrol, the story missions and mission_traitor: two Taken effects
# objects (taken_fx_controller's kind) and a two-wave bridge encounter.
#
# On the wire in five segments (Patrol Venus#5, act_venus_m07_northern_tides'
# 2026-10-01 21-06-51#5 and 2026-10-26 23-01-56#5, mission_traitor's
# 2026-10-27 22-53-09#3 and 2026-10-29 03-38-43#3): both objects stood at
# device 0 from the bubble's start in all five. The bridge encounter never
# placed a squad, so it is left out.

@activity_bundle(0x972B0F9C)

static_array<object, 2> taken_fx_objects

@startup()
script ss_main_thread():
    for fx in taken_fx_objects:
        fx.create()
        fx.set_device_position(0)
