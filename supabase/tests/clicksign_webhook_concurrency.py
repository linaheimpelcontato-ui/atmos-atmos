"""Only a disposable LOCAL DB: apply migrations 180000 and 230000 first.
Two PostgreSQL sessions race the same document, then race notification claims.
No external HTTP calls. Fixtures retained in atmos_clicksign_test for inspection.
"""
import json
import subprocess
import time
import uuid

COMMAND = ['docker', 'exec', '-i', 'supabase_db_atmos-homolog-20260912',
           'psql', '-X', '-U', 'postgres', '-d', 'atmos_clicksign_test', '-v', 'ON_ERROR_STOP=1', '-At']

def sql(script):
    r = subprocess.run(COMMAND, input=script, text=True, capture_output=True)
    assert r.returncode == 0, r.stderr + r.stdout
    return r.stdout.strip()

lead, proposal, token_a, token_b = [str(uuid.uuid4()) for _ in range(4)]
doc = 'concurrent-' + proposal
sql(f"""INSERT INTO public.prospects(id,name,segment,phone) VALUES('{lead}','Concurrent local test','b2c','000000000');
INSERT INTO public.proposals(id,title,prospect_id,contract_status,clicksign_document_key)
VALUES('{proposal}','Concurrent local test','{lead}','sent','{doc}');""")

def race(lock_sql, call_a, call_b):
    # Hold a lock in the first session; observe it from pg_stat_activity before starting the second.
    marker = 'clicksign_race_' + uuid.uuid4().hex
    process = subprocess.Popen(COMMAND, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    process.stdin.write(f"SET application_name='{marker}'; BEGIN; {lock_sql}; SELECT pg_sleep(2); SET LOCAL ROLE service_role; SELECT {call_a}; COMMIT;")
    process.stdin.close()
    for _ in range(100):
        if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{marker}' AND wait_event='PgSleep'") == '1':
            break
        time.sleep(.02)
    else:
        raise AssertionError('First session did not acquire the lock')
    second = sql(f'SET ROLE service_role; SELECT {call_b};')
    first = process.stdout.read()
    errors = process.stderr.read()
    assert process.wait() == 0, errors
    return [json.loads(next(line for line in output.splitlines() if line.startswith('{'))) for output in [first, second]]

call = f"public.complete_clicksign_document('{doc}',NULL)"
results = race(f"SELECT id FROM public.proposals WHERE id='{proposal}' FOR UPDATE", call, call)
assert sorted(r['action'] for r in results) == ['already_signed', 'signed'], results
outbox = results[0]['outbox_id']
assert sql(f"SELECT count(*) FROM public.prospect_interactions WHERE prospect_id='{lead}' AND type='note'") == '1'
assert sql(f"SELECT count(*) FROM public.clicksign_notification_outbox WHERE proposal_id='{proposal}'") == '1'
claims = race(f"SELECT id FROM public.clicksign_notification_outbox WHERE id='{outbox}' FOR UPDATE",
              f"public.transition_clicksign_notification('{outbox}','{token_a}','claim')",
              f"public.transition_clicksign_notification('{outbox}','{token_b}','claim')")
assert sorted(r['claimed'] for r in claims) == [False, True], claims
print('PASS: two real sessions; one signed transition, one note, one outbox, one notification claim')
