# es\hiveship\unknown_abd45f37.es
#
# The breech's breakables on the Dreadnaught (bundle ABD45F37, file name unknown;
# an ambient bundle of the hiveship layer, which the destination's patrol
# and its other activities load too; bubble 1 in mission_touchdown). Every
# object stands from the moment the players are in; the explosive ones go
# when a player shoots them, which the client reports. Authored from one
# mission_touchdown run, the only capture that has the bundle on the wire:
# a patrol or another hiveship activity would show whether it does more.

@activity_bundle(0xABD45F37)

static_array<object, 7> dynamic_objects
static_array<object, 3> explosive_objects

@startup()
script sc_breakables():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    for o in dynamic_objects:
        o.create()
    for o in explosive_objects:
        o.create()
