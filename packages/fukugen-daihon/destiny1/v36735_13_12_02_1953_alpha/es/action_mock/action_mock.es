u_globals globals
static_array<c_object_sensor_host, 3> candy1
c_object_sensor_host candy
int interactable_index
int travel_index
int destructible_index
int time_between_spawns = 7
int spawn_timer
c_objective_sensor_host obj_action_mock  # true name unknown
c_squad_sensor_host sq_action_mock_ultra
c_squad_sensor_host sq_action_mock0
c_squad_sensor_host sq_action_mock1
c_squad_sensor_host sq_action_mock2
c_squad_sensor_host sq_action_mock3
static_array<int, 16> type_list
static_array<int, 16> parameter_list
static_array<c_common_reference, 8> obj_list
static_array<c_common_reference, 4> squad_list
static_array<c_common_reference, 3> interactable_list  # true name unknown
static_array<c_common_reference, 3> travel_list  # true name unknown
static_array<c_common_reference, 3> destructible_list  # true name unknown
static_array<string_hash, 3> incident_list
c_player_objective_sensor_host po_action_mock_begin
c_player_objective_sensor_host po_action_mock_end
kill_squad_objective po_kill_obj bind("_squad", 0)
kill_squad_objective po_kill_boss_obj bind("_boss", 1)
interactable_placement ob_interact_plc0 bind("_interactable0")
interactable_objective po_interact_obj0 bind("_interactable0")
interactable_placement ob_interact_plc1 bind("_interactable1")
interactable_objective po_interact_obj1 bind("_interactable1")
interactable_placement ob_interact_plc2 bind("_interactable2")
interactable_objective po_interact_obj2 bind("_interactable2")
trigger_volume_objective po_travel_obj0
trigger_volume_objective po_travel_obj1
trigger_volume_objective po_travel_obj2
countdown_objective po_defend_obj bind("_defend")
countdown_placement ob_defend_plc bind("_defend")
destructible_objective po_destroy_obj0 bind("_destroy0")
destructible_placement ob_destroy_plc0 bind("_destroy0")
destructible_objective po_destroy_obj1 bind("_destroy1")
destructible_placement ob_destroy_plc1 bind("_destroy1")
destructible_objective po_destroy_obj2 bind("_destroy2")
destructible_placement ob_destroy_plc2 bind("_destroy2")
collect_loot_objective po_collect_obj bind("_collect", 0)
string_hash incident_hash0
string_hash incident_hash1
string_hash incident_hash2
string_hash type_hash_objective = "action_mock_objective_type"
string_hash parameter_hash_objective = "action_mock_objective_parameter"
c_common_reference current_objective














startup thread test_encounter:

    i = 0
    for i in range(15):
        type_list[i] = get_activity_option_integer_array(type_hash_objective, i)
        parameter_list[i] = get_activity_option_integer_array(parameter_hash_objective, i)

    obj_list[1] = po_kill_obj
    obj_list[2] = po_kill_boss_obj
    obj_list[3] = po_interact_obj0
    obj_list[4] = po_travel_obj0
    obj_list[5] = po_defend_obj
    obj_list[6] = po_destroy_obj0
    obj_list[7] = po_collect_obj
    interactable_list[0] = po_interact_obj0
    interactable_list[1] = po_interact_obj1
    interactable_list[2] = po_interact_obj2
    travel_list[0] = po_travel_obj0
    travel_list[1] = po_travel_obj1
    travel_list[2] = po_travel_obj2
    destructible_list[0] = po_destroy_obj0
    destructible_list[1] = po_destroy_obj1
    destructible_list[2] = po_destroy_obj2
    squad_list[0] = sq_action_mock0
    squad_list[1] = sq_action_mock1
    squad_list[2] = sq_action_mock2
    squad_list[3] = sq_action_mock3
    action_mock_objectives.wake()

def user_import():
    incident_hash0 = "action_mock_partial_complete25"
    incident_hash1 = "action_mock_partial_complete50"
    incident_hash2 = "action_mock_partial_complete75"
    incident_list[0] = incident_hash0
    incident_list[1] = incident_hash1
    incident_list[2] = incident_hash2
    return true

thread action_mock_objectives:
    for index in range(len(type_list)):
        if index == 0:
            po_action_mock_begin.activate()
            sleep(5)
            po_action_mock_begin.clear()
        if type_list[index] != 0:
            current_objective = obj_list[type_list[index]]

            if parameter_list[index] > 0 and type_list[index] != 2 and type_list[index] != 3 and type_list[index] != 4 and type_list[index] != 5 and type_list[index] != 6:
                current_objective._count = parameter_list[index]
            if index == 0:
                current_objective.objective_begin()
            else:
                current_objective.objective_begin_immediate()



            if type_list[index] != 2:

                while not current_objective.is_complete():
                    if spawn_timer <= 0:

                        spawn_timer = time_between_spawns
                        if squad_list[0].alive_count() + squad_list[1].alive_count() + squad_list[2].alive_count() + squad_list[3].alive_count() <= 2:
                            squad_list[mathlib.random_int_inclusive(0, 3)].respawn()
                    else:
                        spawn_timer = spawn_timer - 1

                    sleep(1)
            elif type_list[index] == 2:
                sq_action_mock_ultra.place()
                sleep_until(current_objective.is_complete())
            else:
                sleep_until(current_objective.is_complete())


            if index < len(incident_list):
                c_incident_utilities.submit_incident_hash(incident_list[index])

            if type_list[index] == 3:
                if interactable_index < len(interactable_list) - 1:
                    interactable_index = interactable_index + 1
                else:
                    interactable_index = 0
                obj_list[3] = interactable_list[interactable_index]
            if type_list[index] == 4:
                if travel_index < len(travel_list) - 1:
                    travel_index = travel_index + 1
                else:
                    travel_index = 0
                obj_list[4] = travel_list[travel_index]
            if type_list[index] == 6:
                if destructible_index < len(destructible_list) - 1:
                    destructible_index = destructible_index + 1
                else:
                    destructible_index = 0
                obj_list[6] = destructible_list[destructible_index]
            if index == len(type_list) - 1:
                current_objective.objective_end()
            else:
                current_objective.objective_end_silent()
        sleep(1)
    set_activity_complete()
    po_action_mock_end.activate()

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 8228A000
