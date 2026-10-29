# es\mars\downtown\enc_downtown_public_events.es
#
# The public event of downtown (Mars' public bubble 6), loaded with Mars'
# ambient layer by the patrol, the strikes and the story missions: one
# target patrol, with a quiet spell before each run.
#
# Never seen to start: the bundle was on the wire on the patrol's fresh
# downtown host (Patrol Mars#3, 201 s), and nothing in it moved. The quiet
# spell is Mars' (pooled in enc_battleground_events.es). The patrol runs
# its archetype as the Moon's do (its route starts on "task").

@activity_bundle("enc_downtown_public_events")

static_array<u_event_patrol, 1> pf_event_patrol

@startup()
script sc_public_events():
    while true:
        sleep(mathlib.random_int_inclusive(60, 900))
        pf_event_patrol[0].main.restart()
        sleep_until(pf_event_patrol[0].main.is_finished())
