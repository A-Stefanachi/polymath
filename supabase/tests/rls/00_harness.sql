-- BL-0011: self-tests of the RLS harness (helpers in _helpers.psql). Run with `pnpm test:rls`.
begin;
\ir _helpers.psql

select plan(5);

select rls_test.act_as(rls_test.user_a());
select is((select count(*) from public.profiles where id = rls_test.user_b()), 0::bigint,
          'harness: user A cannot select the profiles row of user B');
select is((select count(*) from public.profiles where id = rls_test.user_a()), 1::bigint,
          'harness: user A can select their own profiles row');
select is(auth.uid(), rls_test.user_a(), 'harness: auth.uid() returns the acting user (JWT claims set)');
select throws_ok($$update public.attempts set grade_status = 'error'$$, '42501', null,
                 'harness: a write the role has no privilege for is rejected (42501)');
reset role;
select rls_test.act_as(rls_test.user_c());
select is(public.is_admin(), true, 'harness: admin C (admin_users row) is recognised by is_admin()');
reset role;

select * from finish();
rollback;
