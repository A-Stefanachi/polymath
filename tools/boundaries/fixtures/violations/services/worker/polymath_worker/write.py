"""Violation: worker-no-learner-state-writes, twice (skill_state and review_log)."""

SET_STATE = "INSERT INTO skill_state (user_id, skill_key) VALUES (%s, %s)"
FIX_LOG = 'update public."review_log" set rating = 3 where id = %s'
