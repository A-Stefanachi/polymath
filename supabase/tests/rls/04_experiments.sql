-- BL-0012: assign_experiment is sticky, per user, and refuses non-running experiments. ST-RLS-13.
begin;
\ir _helpers.psql

select plan(7);

select rls_test.act_as(rls_test.user_a());
select is(public.assign_experiment('exp.rlstest-assign')::text, public.assign_experiment('exp.rlstest-assign')::text,
          'ST-RLS-13: two calls by the same user return the same arm');
select is((select count(*) from public.experiment_assignments where experiment_key = 'exp.rlstest-assign'), 1::bigint,
          'ST-RLS-13: the two calls stored exactly one assignment row (sticky)');
select throws_ok($$select public.assign_experiment('exp.rlstest-draft')$$, '55000', null,
                 'ST-RLS-13: assigning an experiment that is not running is an error');
select throws_ok($$select public.assign_experiment('exp.rlstest-nonexistent')$$, 'P0002', null,
                 'ST-RLS-13: assigning an unknown experiment is an error');
reset role;

create table rls_test.arm_a as
  select arm from public.experiment_assignments where experiment_key = 'exp.rlstest-assign' and user_id = rls_test.user_a();

select rls_test.act_as(rls_test.user_b());
select public.assign_experiment('exp.rlstest-assign');
reset role;

select is((select count(distinct user_id) from public.experiment_assignments where experiment_key = 'exp.rlstest-assign'), 2::bigint,
          'ST-RLS-13: a second user gets an independent assignment row');
select is((select arm from public.experiment_assignments where experiment_key = 'exp.rlstest-assign' and user_id = rls_test.user_a()),
          (select arm from rls_test.arm_a), 'ST-RLS-13: the first user''s arm is unchanged by the second user''s assignment');
select rls_test.act_as(rls_test.user_b());
select is(public.assign_experiment('exp.rlstest-assign'),
          (select arm from public.experiment_assignments where experiment_key = 'exp.rlstest-assign' and user_id = rls_test.user_b()),
          'ST-RLS-13: the second user''s repeat call returns their stored arm');
reset role;

select * from finish();
rollback;
