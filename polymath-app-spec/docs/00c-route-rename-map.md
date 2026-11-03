# 00c - Route rename map

Authority: `schemas/api.openapi.yaml` is authoritative for route names. All paths below are relative to `/api/v1`. Documents listed in the left column use informal `/api/...` routes and must be renamed by their owners. **Status after review pass 2 (31 Oct 2026):** documents 07, 09 and 10 now use the OpenAPI routes; this table is kept as history and is exempt from the route check of `reference/check_package.py`. **Update 31 Oct 2026 (decision G16, platform pass):** the two open rows are decided: session preview is `POST /sessions/build` with `dry_run: true` (200 `SessionPreview`, nothing written) and progress is `GET /progress` (operationId `getProgress`). The row for reminder preferences was corrected from `/me/profile` to `/profile`, the path that exists in the OpenAPI file. Strict-unaided has no endpoint (it is the internal view `app_private.v_attempts_strict_unaided`).

| Doc | Informal route | OpenAPI route | Note |
|---|---|---|---|
| 09 | `POST /api/session-preview` | `POST /sessions/build` with body field `dry_run: true` | G16: no separate route. Returns `200 SessionPreview`; writes no row, reserves no item, consumes no idempotency key; rate limit 10 per minute. |
| 09 | `POST /api/sessions` | `POST /sessions/build` | |
| 09 | `POST /api/attempts` | `POST /attempts` | |
| 09 | `POST /api/tutor/messages` | `POST /tutor/messages` (hints: `POST /tutor/hints`) | |
| 09 | `GET /api/map` | `GET /graph` (and `GET /frontier`) | |
| 09 | `GET /api/progress` | `GET /progress` (operationId `getProgress`) | G16: server-side aggregate of the caller's own rows (tier per node, skills by mastery state, review load for 7 days, weekly minutes, project status). Replaces the client-side composition of `/skills`, `/checkpoints`, `/project-grants`. |
| 09 | `GET/PUT /api/plan` | `GET /plans`, `POST /plans`, `GET/PATCH /plans/{plan_id}`, `POST /plans/{plan_id}/slots`, `PATCH /plans/{plan_id}/slots/{slot_id}`, `GET /plans/{plan_id}/calendar` | Weekly plans and slots (00a C). |
| 09 | `GET /api/review` | `GET /review-queue` | |
| 09 | `POST /api/checkpoints` | `POST /checkpoints/manual` | Manual request only; scheduled ones are created by the scheduler. |
| 09 | `GET /api/checkpoints/:id` | `GET /checkpoints` (list) and `POST /checkpoints/{checkpoint_id}/start` | No get-by-id route. |
| 09 | `POST /api/projects/:key/steps/:stepKey/evidence` | `POST /user-projects/{id}/evidence/upload-url` then `POST /user-projects/{id}/evidence` | Two-step upload. Routes are keyed by user_project id, not project key. |
| 10 | `POST /api/projects/:key/steps/:stepKey/challenge` | `POST /user-projects/{id}/steps/{step_key}/challenge` | Verification: `POST .../challenge/verify`. |
| 09 | `PUT /api/projects/:key/bench` | `PUT /user-projects/{id}/bench-state` | |
| 09 | `POST /api/push/subscribe`, `DELETE /api/push/subscribe` | `POST /push-subscriptions`, `DELETE /push-subscriptions/{id}` | |
| 09 | `POST /api/account/export` | `POST /me/export` | |
| 09 | `DELETE /api/account` | `DELETE /me` | |
| 09 | `GET /api/offline-set?hours=24` | `GET /sync/pack?hours=24` | |
| 09 | `POST /api/events` | `POST /events` | Event names are owned by doc 11 (00a D6). |
| 07 | `POST /api/item-reports` | `POST /items/{item_id}/report` | Admin: `GET /admin/item-reports`, `POST /admin/item-reports/{report_id}/resolve`. |
| 09 | `/api/notification_prefs` | `PATCH /profile` field `reminder_prefs` | No notification_prefs table (00a). Stored in `profiles.reminder_prefs`. |
| 09/10 | experiment assignment | `POST /experiments/{experiment_key}/assignments` (plus `GET /experiments/assignments`) | Unit-level: `unit_type`, `unit_key`. |
| 03/10 | project grants | `GET /project-grants` | Read only; tiers L0/L1. |
| 03 | modules | `GET /modules`, `GET /modules/{module_key}` | |
| 11 | analysis exclusions | `GET/POST /admin/analysis-exclusions` | Admin only. |
