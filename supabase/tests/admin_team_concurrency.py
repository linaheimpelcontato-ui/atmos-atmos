"""LOCAL disposable database only. Two real connections, no remote credentials.
Run after applying the team migration to atmos_team_auth_test.
Fixtures are retained in this isolated database for inspection.
"""
import subprocess
import time

COMMAND = ['docker', 'exec', '-i', 'supabase_db_atmos-homolog-20260912',
           'psql', '-X', '-U', 'postgres', '-d', 'atmos_team_auth_test', '-v', 'ON_ERROR_STOP=1', '-At']
A = 'aa170001-0000-4000-8000-000000000001'
B = 'aa170001-0000-4000-8000-000000000002'
C = 'aa170001-0000-4000-8000-000000000003'


def sql(script, expected=0):
    result = subprocess.run(COMMAND, input=script, text=True, capture_output=True)
    assert result.returncode == expected, result.stderr + result.stdout
    return result.stdout


def reset():
    sql(f"""BEGIN;
    INSERT INTO auth.users(id,email) VALUES ('{A}','concurrent-a@example.invalid'),
    ('{B}','concurrent-b@example.invalid'),('{C}','concurrent-c@example.invalid') ON CONFLICT(id) DO NOTHING;
    UPDATE public.admin_permissions SET allowed_modules='{{}}' WHERE user_id IN ('{A}','{B}');
    INSERT INTO public.user_roles(user_id,role) VALUES ('{A}','admin'),('{B}','admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_permissions(user_id,allowed_modules) VALUES ('{A}','{{}}'),('{B}','{{}}')
    ON CONFLICT(user_id) DO UPDATE SET allowed_modules='{{}}';
    INSERT INTO public.admin_permissions(user_id,allowed_modules)
    SELECT user_id,'{{site}}' FROM public.user_roles WHERE role='admin' AND user_id NOT IN ('{A}','{B}')
    ON CONFLICT(user_id) DO UPDATE SET allowed_modules=EXCLUDED.allowed_modules;
    COMMIT;""")


def race(isolation, revoke_actor=False):
    reset()
    first = subprocess.Popen(COMMAND, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    target = B if revoke_actor else A
    first.stdin.write(f"""BEGIN; SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub','{A}',true);
    UPDATE public.admin_permissions SET allowed_modules='{{configuracoes}}' WHERE user_id='{target}';
    SELECT 'LOCK_HELD';
    """)
    first.stdin.flush()
    while True:
        line = first.stdout.readline()
        assert line, 'First writer failed before taking lock: ' + first.stderr.read()
        if line.strip() == 'LOCK_HELD':
            break
    second = subprocess.Popen(COMMAND, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    action = (f"SELECT public.manage_admin_team('add','{C}','{{}}');" if revoke_actor else
              f"UPDATE public.admin_permissions SET allowed_modules='{{configuracoes}}' WHERE user_id='{B}';")
    second.stdin.write(f"BEGIN ISOLATION LEVEL {isolation}; SET LOCAL ROLE authenticated; "
                       f"SELECT set_config('request.jwt.claim.sub','{B}',true); {action} COMMIT;\n")
    second.stdin.flush()
    # Observe an actual blocked backend, rather than assuming sleep establishes the race.
    for _ in range(100):
        waiting = sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                      "AND pid<>pg_backend_pid() AND wait_event_type='Lock';").strip()
        if int(waiting) > 0:
            break
        time.sleep(.02)
    else:
        raise AssertionError('Second writer did not block on the shared lock')
    first.stdin.write('COMMIT;\n')
    first.stdin.close()
    first.wait(timeout=10)
    assert first.returncode == 0, first.stderr.read()
    second.stdin.close()
    second.wait(timeout=10)
    error = second.stderr.read()
    assert second.returncode != 0, 'Both conflicting mutations committed'
    expected = ('could not serialize' if isolation == 'REPEATABLE READ' else
                'acesso total' if revoke_actor else 'pelo menos um administrador')
    assert expected in error, error
    count = sql("SELECT count(*) FROM public.user_roles WHERE role='admin' AND public.is_full_admin(user_id);").strip()
    assert int(count) >= 1, 'Lost the last full administrator'
    if revoke_actor:
        assert sql(f"SELECT public.has_role('{C}','admin');").strip() == 'f', 'Revoked actor granted an admin'
    print('PASS', isolation, 'revoked actor' if revoke_actor else 'last full admin')


for level in ['READ COMMITTED', 'REPEATABLE READ']:
    race(level)
    race(level, revoke_actor=True)
reset()
