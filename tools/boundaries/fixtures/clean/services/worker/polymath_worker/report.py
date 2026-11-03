"""Allowed: the worker reads learner state and writes only its own tables."""

READ_STATE = "select stability from skill_state where user_id = %s"
WRITE_JOB = "update jobs set status = 'done' where id = %s"
