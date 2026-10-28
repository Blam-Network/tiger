# es\venus\quest_safari\unknown_f300fb1f.es
#
# quest_safari's raid bridge (bundle F300FB1F, file name unknown; bubble 16,
# the activity's own). Three fights:
#
# - The intro: a Fallen ambush (enc_intro_wave, enc_intro_snipe) goes in as
#   the player crosses the outer volume. Once it is down to four, the bridge
#   is broken and mission 3 moves on.
# - The oracles: mission 3 wakes sc_oracles. Six Vex security nodes come in
#   one at a time, each with its tone; Fallen guards land beside them, one
#   squad as the node before is destroyed and one as the tone ends. The
#   Ghost speaks at the first, second, third and last.
# - The captains: mission 4 wakes sc_captains. Four captains in turn, each
#   with a rush squad as the one before dies, and three pairs of adds, each
#   once two of the pair before are killed. Once the last captain is dead the
#   rest despawn.
#
# One retail 2.3.1 run, with two wipes in the oracles (the encounter starts
# over with the phase): every wait is that run's, unconfirmed. The rosters
# are the run's squad auths; the task names are the 1.33 tables'.

@activity_bundle(0xF300FB1F)

objective main_objective
objective objective_finale
trigger_volume tv_outer
player_trigger pt_outer bind(tv_outer)
ambush_encounter enc_intro_wave
ambush_encounter enc_intro_snipe
vex_security vex_security_fa
vex_security vex_security_re
vex_security vex_security_do
vex_security vex_security_mi
vex_security vex_security_ti
vex_security vex_security_so
@member_counts({cell_1: 2})
squad sq_or_1_guard_a
@member_counts({cell_1: 2})
squad sq_or_1_guard_b
squad sq_or_2_guard_a
@member_counts({cell_1: 2})
squad sq_or_2_guard_b
@member_counts({cell_1: 2})
squad sq_or_3_guard_a
@member_counts({cell_1: 2})
squad sq_or_3_guard_b
@member_counts({cell_1: 1, cell_2: 2})
squad sq_or_4_guard_a
squad sq_spear_cap
squad_member sq_spear_cap__cell_1
squad sq_spear_cap_a
squad sq_cap_left
squad_member sq_cap_left__cell_1
squad sq_cap_left_a
squad sq_cap_right
squad_member sq_cap_right__cell_1
squad sq_cap_right_a
squad sq_intro_cap
squad_member sq_intro_cap__cell_1
squad sq_intro_cap_a
squad sq_cap_add_1_a
squad sq_cap_add_1_b
squad sq_cap_add_2_a
squad sq_cap_add_2_b
@member_counts({cell_1: 2})
squad sq_cap_add_3_a
@member_counts({cell_1: 2})
squad sq_cap_add_3_b
@member_counts({cell_1: 3})
squad sq_cap_add_1_rush
@member_counts({cell_1: 3})
squad sq_cap_add_2_rush
@member_counts({cell_1: 3})
squad sq_cap_add_3_rush

kill_incident_listener kil_cap_adds_1
kill_incident_listener kil_cap_adds_2
kill_incident_listener kil_captain
encounter_handle quest_safari
bool b_intro_broken = false
int i_oracles_destroyed = 0
bool b_captains_dead = false

@startup()
# every squad stands against its objective from the bubble's start, placed or
# not
script sc_objectives():
    for sq in [sq_or_1_guard_a, sq_or_1_guard_b, sq_or_2_guard_a, sq_or_2_guard_b, sq_or_3_guard_a,             sq_or_3_guard_b, sq_or_4_guard_a, sq_cap_left, sq_cap_left_a, sq_cap_right,             sq_cap_right_a, sq_intro_cap, sq_intro_cap_a]:
        sq.set_objective(main_objective)
    for sq in [sq_spear_cap, sq_spear_cap_a, sq_cap_add_1_a, sq_cap_add_1_b, sq_cap_add_2_a,             sq_cap_add_2_b, sq_cap_add_3_a, sq_cap_add_3_b, sq_cap_add_1_rush, sq_cap_add_2_rush,             sq_cap_add_3_rush]:
        sq.set_objective(objective_finale)

@startup()
# The ambush goes in a second after the outer trigger (three times in the
# run, once per start of the phase) and stands until it is killed: retail
# never waited on the ambushes' own volumes, which the client did not report
# until long after.
script sc_intro():
    sleep_until(pt_outer.is_triggered())
    spring(enc_intro_wave, ["task_1", "task_3", "task_5", "task_7", "task_9", "task_11"])
    spring(enc_intro_snipe, ["task", "task_2"])
    sleep_until(intro_alive_count() <= 4)
    b_intro_broken = true

# Each squad takes its own task, the one retail gave it as it went in; the
# tasks it moves between later are the AI's.
def spring(ambush, tasks):
    ambush.activate()
    sleep(1)
    ambush._squad_group.place()
    for i in range(len(tasks)):
        ambush._squad[i].set_objective(ambush._objective)
        ambush._squad[i].set_task(tasks[i])
    ambush.main.kill()

def intro_alive_count():
    return enc_intro_wave._squad_group.alive_count() + enc_intro_snipe._squad_group.alive_count()

def place_squad(sq, task):
    sq.place()
    sq.set_task(task)

# Each node comes in 4-5 s after the one before is destroyed (3.8-5.4 in the
# run), its tone half a second later; the first five seconds after its
# guards.
script sc_oracles():
    place_squad(sq_or_1_guard_a, "task_3")
    sleep(5)
    vex_security_fa.appear()
    vex_security_fa.sleep_until_sounded()
    place_squad(sq_or_1_guard_b, "task_4")
    oracle_destroyed(vex_security_fa)
    place_squad(sq_or_2_guard_a, "task_5")
    sleep(1)
    quest_safari.oracle_2_dialog.start()
    sleep(4)
    vex_security_re.appear()
    vex_security_re.sleep_until_sounded()
    place_squad(sq_or_2_guard_b, "task_6")
    oracle_destroyed(vex_security_re)
    place_squad(sq_or_3_guard_a, "task_7")
    sleep(4)
    vex_security_do.appear()
    quest_safari.oracle_3_dialog.start()
    vex_security_do.sleep_until_sounded()
    place_squad(sq_or_3_guard_b, "task_8")
    oracle_destroyed(vex_security_do)
    sleep(4)
    vex_security_mi.appear()
    oracle_destroyed(vex_security_mi)
    place_squad(sq_or_4_guard_a, "task_9")
    sleep(4)
    vex_security_ti.appear()
    oracle_destroyed(vex_security_ti)
    sleep(4)
    vex_security_so.appear()
    sleep(1)
    quest_safari.oracle_last_dialog.start()
    oracle_destroyed(vex_security_so)

def oracle_destroyed(node):
    node.sleep_until_destroyed()
    i_oracles_destroyed = i_oracles_destroyed + 1

# The spear captain and the first adds go in with the objective; the rush
# squads and the next captains come 0.7 s after a captain is killed.
script sc_captains():
    kil_captain.bind_incident_name_hash("0xA9FEA575")
    place_squad(sq_spear_cap, "task_5")
    place_squad(sq_spear_cap_a, "task_11")
    place_squad(sq_cap_add_1_a, "task")
    place_squad(sq_cap_add_1_b, "task_6")
    sc_captain_adds.wake()
    sleep_until_killed(sq_spear_cap)
    place_squad(sq_cap_add_1_rush, "task_16")
    place_squad(sq_cap_left, "task")
    sleep_until_killed(sq_cap_left)
    place_squad(sq_cap_add_2_rush, "task_16")
    place_squad(sq_cap_right, "task_1")
    sleep_until_killed(sq_cap_right)
    place_squad(sq_cap_add_3_rush, "task_16")
    place_squad(sq_intro_cap, "task_2")
    sleep_until_killed(sq_intro_cap)
    sleep(1)
    for sq in [sq_spear_cap_a, sq_or_1_guard_a, sq_or_1_guard_b, sq_or_2_guard_a, sq_or_2_guard_b, \
            sq_or_3_guard_a, sq_or_3_guard_b, sq_or_4_guard_a, sq_intro_cap_a, sq_cap_add_1_a, \
            sq_cap_add_1_b, sq_cap_add_2_a, sq_cap_add_2_b, sq_cap_add_3_a, sq_cap_add_3_b, \
            sq_cap_add_1_rush, sq_cap_add_2_rush, sq_cap_add_3_rush, sq_cap_left, sq_cap_left_a, \
            sq_cap_right, sq_cap_right_a, sq_intro_cap]:
        sq.activate_temperament("temper_despawn")
    enc_intro_wave._squad_group.activate_temperament("temper_despawn")
    enc_intro_snipe._squad_group.activate_temperament("temper_despawn")
    b_captains_dead = true

# Each pair of adds a second after two of the pair before (six bodies) are
# killed. The kills, not the counts the client reports: those come in as the
# squads come into view.
script sc_captain_adds():
    kil_cap_adds_1.bind_squad(sq_cap_add_1_a)
    kil_cap_adds_2.bind_squad(sq_cap_add_1_b)
    sleep_until(kil_cap_adds_1.get_count() + kil_cap_adds_2.get_count() >= 2)
    place_squad(sq_cap_add_2_a, "task_7")
    place_squad(sq_cap_add_2_b, "task_14")
    kil_cap_adds_1.reset()
    kil_cap_adds_1.bind_squad(sq_cap_add_2_a)
    kil_cap_adds_2.reset()
    kil_cap_adds_2.bind_squad(sq_cap_add_2_b)
    sleep_until(kil_cap_adds_1.get_count() + kil_cap_adds_2.get_count() >= 2)
    place_squad(sq_cap_add_3_a, "task_13")
    place_squad(sq_cap_add_3_b, "task_15")

# Retail's kills of the four captains are of incident 0xA9FEA575 (name not
# cracked; the strike bosses' kills carry it too), and no other kill in the
# activity is. The captains stand one at a time, so the next such kill is
# this one's: the third captain's squad reported no counts to go by.
def sleep_until_killed(captain):
    kil_captain.reset()
    sleep_until(kil_captain.get_count() > 0)
