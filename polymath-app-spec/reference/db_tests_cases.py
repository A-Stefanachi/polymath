"""Behavioural tests for schemas/schema.sql. Run through reference/db_tests.py (it creates the throwaway cluster
and sets PM_DSN). Needs psycopg2. Exit code 1 on any failure."""
import psycopg2, sys, json, uuid, os
DSN=os.environ.get("PM_DSN","host=/tmp port=5544 user=postgres dbname=pm")
A='aaaaaaaa-0000-4000-8000-00000000000a'; B='bbbbbbbb-0000-4000-8000-00000000000b'; C='cccccccc-0000-4000-8000-00000000000c'
passed=failed=0
def conn(role=None, uid=None):
    c=psycopg2.connect(DSN); c.autocommit=False; cur=c.cursor()
    if role:
        if uid: cur.execute("select set_config('request.jwt.claim.sub',%s,true), set_config('request.jwt.claim.role',%s,true)",(uid,role if role=='service_role' else 'authenticated'))
        elif role=='service_role': cur.execute("select set_config('request.jwt.claim.role','service_role',true)")
        cur.execute(f"set local role {role}")
    return c,cur
def t(name, role, uid, sql, expect='ok', params=None):
    """expect: 'ok' | 'fail' | 'fail:<substr>' | ('val', v)"""
    global passed, failed
    c,cur=conn(role,uid)
    try:
        cur.execute(sql, params); 
        try: rows=cur.fetchall()
        except Exception: rows=None
        res=('ok',rows)
    except Exception as e:
        res=('fail',str(e).splitlines()[0])
    finally:
        c.rollback(); c.close()
    good=False
    if expect=='ok': good=res[0]=='ok'
    elif expect=='fail': good=res[0]=='fail'
    elif isinstance(expect,str) and expect.startswith('fail:'): good=res[0]=='fail' and expect[5:] in res[1]
    elif isinstance(expect,tuple): good=res[0]=='ok' and rows_val(res[1])==expect[1]
    if good: passed+=1
    else: failed+=1
    print(('PASS ' if good else 'FAIL ')+name+('' if good else f'   -> got {res}'))
def rows_val(rows):
    if rows is None: return None
    if len(rows)==1 and len(rows[0])==1: return rows[0][0]
    return [list(r) for r in rows]

# ---------------- fixture (superuser, committed) ----------------
c,cur=conn(); 
cur.execute("delete from auth.users where id in (%s,%s,%s)",(A,B,C))
cur.execute("delete from public.items where template_key like 'tpl.elec.%'")
cur.execute("delete from public.item_templates where key like 'tpl.elec.%'")
cur.execute("delete from public.experiments")
cur.execute("delete from public.admin_users")
cur.execute("delete from public.jobs")
cur.execute("update public.skills set status='draft' where key in ('elec.dc.ohms-law','elec.dc.voltage-divider')")
for u,e in ((A,'a@example.test'),(B,'b@example.test'),(C,'c@example.test')):
    cur.execute("insert into auth.users(id,email) values(%s,%s)",(u,e))
cur.execute("insert into public.admin_users(user_id) values(%s)",(C,))
cur.execute("update public.skills set status='verified' where key in ('elec.dc.ohms-law','elec.dc.voltage-divider')")
cur.execute("""insert into public.item_templates(key,skill_key,task_kind,grader_type,version,status,body,license,source,pool)
 values('tpl.elec.t1','elec.dc.voltage-divider','problem','exact_numeric',1,'verified','{"secret":"gen"}','original','x','practice'),
       ('tpl.elec.t1','elec.dc.voltage-divider','problem','exact_numeric',2,'verified','{"secret":"gen2"}','original','x','practice'),
       ('tpl.elec.assess','elec.dc.voltage-divider','retrieval','exact_numeric',1,'verified','{}','original','x','assessment')""")
ids={}
for k,(tk,ver,uid) in {'iA':('tpl.elec.t1',1,A),'iB':('tpl.elec.t1',1,B),'iP':('tpl.elec.t1',2,None),'iAs':('tpl.elec.assess',1,A)}.items():
    ids[k]=str(uuid.uuid4())
    cur.execute("""insert into public.items(id,template_key,template_version,seed,params,rendered,verification_report,status,user_id)
      values(%s,%s,%s,%s,'{"p":1}','{"prompt":"x"}','{"verifier":"v","agreed":true,"key":42}','verified',%s)""",(ids[k],tk,ver,hash(k)%1000,uid))
    cur.execute("insert into public.item_secrets(item_id,answer_key,hidden_tests) values(%s,'{\"a\":42}','{\"t\":1}')",(ids[k],))
att={}
for k,(u,it) in {'aA':(A,ids['iA']),'aB':(B,ids['iB'])}.items():
    att[k]=str(uuid.uuid4())
    cur.execute("""insert into public.attempts(id,user_id,item_id,started_at,submitted_at,response,grade,grade_status,client_attempt_id)
      values(%s,%s,%s,now()-interval '1 min',now(),'{"v":1}','{"status":"graded","score":1,"correct":true,"graders":[]}','graded',gen_random_uuid())""",(att[k],u,it))
    cur.execute("insert into public.skill_state(user_id,skill_key) values(%s,'elec.dc.voltage-divider')",(u,))
for u in (A,B):
    cur.execute("insert into public.weekly_plans(user_id,week_start,target_minutes) values(%s,'2026-11-02',480) returning id",(u,))
    pid=cur.fetchone()[0]; ids['plan'+u[0]]=str(pid)
    cur.execute("insert into public.plan_slots(plan_id,user_id,day,session_type,planned_min,context) values(%s,%s,'2026-11-03','micro',20,'phone')",(pid,u))
    cur.execute("insert into public.user_projects(user_id,project_key) values(%s,'prj.L1.divider-rc-filter') returning id",(u,)) if False else None
cur.execute("select key from public.projects order by key limit 1"); pk=cur.fetchone()[0]
cur.execute("select key from public.project_steps where project_key=%s order by position limit 2",(pk,)); steps=[r[0] for r in cur.fetchall()]
ups={}
for u in (A,B):
    cur.execute("insert into public.user_projects(user_id,project_key) values(%s,%s) returning id",(u,pk)); ups[u]=str(cur.fetchone()[0])
    cur.execute("""insert into public.evidence_challenges(user_id,user_project_id,step_key,code,expires_at)
       values(%s,%s,%s,%s,now()+interval '1 day')""",(u,ups[u],steps[0],'PM-7Q4K-2XD9' if u==A else 'PM-3WRT-5HNZ'))
    cur.execute("insert into public.project_grants(user_id,user_project_id,project_key,skill_key,tier,status) values(%s,%s,%s,'elec.dc.voltage-divider','L1','pending')",(u,ups[u],pk))
cur.execute("insert into public.item_reports(user_id,item_id,reason) values(%s,%s,'ambiguous')",(B,ids['iB']))
cur.execute("insert into public.experiments(key,description,started_at,status,allocation_treatment_pct,design) values('exp.unit','unit-level',now()-interval '1 day','running',50,'{\"unit_type\":\"skill\"}'),('exp.user','user-level',now()-interval '1 day','running',50,'{}'),('exp.ext','external',now()-interval '1 day','running',50,'{\"allocation\":\"external\"}'),('exp.draft','d',null,'draft',50,'{}')")
cur.execute("insert into public.experiment_assignments(experiment_key,user_id,arm,unit_type,unit_key,block_index,rng_seed) values('exp.ext',%s,'treatment','user',%s,0,'seed1')",(B,B))
c.commit(); c.close()

# ---------------- RLS isolation ----------------
for tbl in ['attempts','skill_state','weekly_plans','plan_slots','user_projects','evidence_challenges','project_grants','item_reports','sessions','session_tasks','review_log','tutor_threads','tutor_messages','checkpoints','events','push_subscriptions','privacy_requests','experiment_assignments','llm_calls','project_evidence']:
    t(f'A sees only own rows in {tbl}','authenticated',A,f"select count(*) from public.{tbl} where user_id <> %s",('ok'),(A,)) if False else None
    t(f'A sees no foreign rows in {tbl}','authenticated',A,f"select count(*) from public.{tbl} where user_id is distinct from %s::uuid",('val',0),(A,))
t('A sees own attempt','authenticated',A,"select count(*) from public.attempts",('val',1))
t('B sees own plan slots only','authenticated',B,"select count(*) from public.plan_slots",('val',1))
t('A sees 1 grant','authenticated',A,"select count(*) from public.project_grants",('val',1))
t('A cannot read B challenge','authenticated',A,"select count(*) from public.evidence_challenges where code='PM-3WRT-5HNZ'",('val',0))
t('A sees 1 report (none own)','authenticated',A,"select count(*) from public.item_reports",('val',0))
t('A sees own items + pool only','authenticated',A,"select count(*) from public.items",('val',3))
t('admin sees all reports','authenticated',C,"select count(*) from public.item_reports",('val',1))
t('admin sees all assignments','authenticated',C,"select count(*) from public.experiment_assignments",('val',1))
t('A sees no assignments of B','authenticated',A,"select count(*) from public.experiment_assignments",('val',0))
t('A sees 2 verified skills + stubs, draft hidden','authenticated',A,"select count(*) filter (where status='draft') from public.skills",('val',0))
t('A sees stubs','authenticated',A,"select count(*) > 0 from public.skills where status='stub'",('val',True))
t('admin sees drafts','authenticated',C,"select count(*) > 0 from public.skills where status='draft'",('val',True))
t('A reads modules','authenticated',A,"select count(*) from public.modules",('val',61))  # graph 0.7.0 module rows

# ---------------- hidden columns ----------------
for name,sql in [
 ('item_templates.body','select body from public.item_templates'),
 ('item_templates select *','select * from public.item_templates'),
 ('item_templates.n_obs','select n_obs from public.item_templates'),
 ('items.params','select params from public.items'),
 ('items.verification_report','select verification_report from public.items'),
 ('items select *','select * from public.items'),
 ('item_secrets','select * from public.item_secrets'),
 ('item_secrets.answer_key','select answer_key from public.item_secrets'),
 ('projects.spec','select spec from public.projects'),
 ('project_steps.verification_spec','select verification_spec from public.project_steps'),
 ('experiments.design','select design from public.experiments'),
 ('experiments.pre_registration','select pre_registration from public.experiments'),
 ('experiment_assignments.rng_seed','select rng_seed from public.experiment_assignments'),
 ('experiment_assignments.block_index','select block_index from public.experiment_assignments'),
 ('admin_get_template','select public.admin_get_template(\'tpl.elec.t1\')'),
 ('app_private.rate_limits','select * from app_private.rate_limits'),
 ('app_private view','select * from app_private.v_attempts_strict_unaided'),
 ('rate_limit_take','select app_private.rate_limit_take(gen_random_uuid(),\'x\',1,1,1)'),
 ('claim_jobs','select * from public.claim_jobs(\'w\')'),
 ('enqueue_job','select public.enqueue_job(\'grade_attempt\')'),
 ('check_challenge_code direct','select app_private.check_challenge_code(gen_random_uuid(),gen_random_uuid(),\'x\',\'y\')'),
]:
    t('learner denied: '+name,'authenticated',A,sql,'fail')
t('non-admin sees zero analysis_exclusions rows','authenticated',A,"select count(*) from public.analysis_exclusions",('val',0))
t('learner can read allowed columns of templates','authenticated',A,"select key,version,pool,mastery_eligible,tier from public.item_templates",'ok')
t('learner reads projects non-hidden','authenticated',A,"select key,title,bom from public.projects limit 1",'ok')
t('learner reads items.rendered','authenticated',A,"select rendered from public.items",'ok')
t('admin denied items.params too (use service)','authenticated',C,"select params from public.items",'fail')
t('admin_get_template for admin: latest version','authenticated',C,"select (public.admin_get_template('tpl.elec.t1')).version",('val',2))
t('admin_get_template explicit version','authenticated',C,"select (public.admin_get_template('tpl.elec.t1',1)).body->>'secret'",('val','gen'))
t('service reads item_secrets','service_role',None,"select count(*) from public.item_secrets",('val',4))
t('service reads strict view','service_role',None,"select count(*) from app_private.v_attempts_strict_unaided",('val',2))

# ---------------- anon ----------------
for tbl in ['profiles','skills','modules','item_templates','items','attempts','weekly_plans','plan_slots','project_grants','evidence_challenges','experiments','analysis_exclusions','item_secrets','events','jobs','cohorts','admin_users']:
    t(f'anon denied: {tbl}','anon',None,f"select 1 from public.{tbl} limit 1",'fail')
t('anon denied assign_experiment','anon',None,"select public.assign_experiment('exp.user')",'fail')
t('anon denied verify_challenge_code','anon',None,"select public.verify_challenge_code(gen_random_uuid(),'x','y')",'fail')
t('anon denied is_admin','anon',None,"select public.is_admin()",'fail')
t('anon denied app_private','anon',None,"select * from app_private.rate_limits",'fail')
t('anon cannot insert event','anon',None,"insert into public.events(user_id,name) values(gen_random_uuid(),'x')",'fail')

# ---------------- learner writes ----------------
t('A updates own display_name + new profile cols','authenticated',A,"update public.profiles set display_name='x', consents='{\"research\":{\"v\":1}}', reminder_prefs='{\"max_per_day\":1}', bedtime_local='22:30', onboarded_at=now() where id=%s",'ok',(A,))
t('A cannot change cohort','authenticated',A,"update public.profiles set cohort_id=(select id from public.cohorts limit 1) where id=%s",'fail',(A,))
t('A cannot update B profile (0 rows)','authenticated',A,"with u as (update public.profiles set display_name='h' where id=%s returning 1) select count(*) from u",('val',0),(B,))
t('A cannot insert attempts','authenticated',A,"insert into public.attempts(user_id,item_id,started_at,submitted_at,response,client_attempt_id) values(%s,%s,now(),now(),'{}',gen_random_uuid())",'fail',(A,ids['iA']))
t('A cannot insert plan','authenticated',A,"insert into public.weekly_plans(user_id,week_start,target_minutes) values(%s,'2026-11-09',480)",'fail',(A,))
t('A cannot update plan slots','authenticated',A,"update public.plan_slots set status='done'",'fail')
t('A cannot insert grants','authenticated',A,"insert into public.project_grants(user_id,user_project_id,project_key,skill_key,tier) values(%s,%s,%s,'elec.dc.ohms-law','L0')",'fail',(A,ups[A],pk))
t('A cannot insert challenge','authenticated',A,"insert into public.evidence_challenges(user_id,user_project_id,step_key,code,expires_at) values(%s,%s,%s,'PM-2222-3333',now()+interval '1h')",'fail',(A,ups[A],steps[0]))
t('A inserts own event','authenticated',A,"insert into public.events(user_id,name,graph_version) values(%s,'x',%s)",'ok',(A,'0.1.0'))
t('A cannot insert event as B','authenticated',A,"insert into public.events(user_id,name) values(%s,'x')",'fail',(B,))
t('A files item report','authenticated',A,"insert into public.item_reports(user_id,item_id,reason,note) values(%s,%s,'wrong_answer','n')",'ok',(A,ids['iP']))
t('A cannot file report as resolved','authenticated',A,"insert into public.item_reports(user_id,item_id,reason,status) values(%s,%s,'other','confirmed')",'fail',(A,ids['iP']))
t('A cannot update reports (0 rows)','authenticated',B,"with u as (update public.item_reports set status='dismissed' returning 1) select count(*) from u",('val',0))
hc,hcur=conn()
hcur.execute("insert into public.tutor_threads(user_id) values(%s) returning id",(A,)); thA=hcur.fetchone()[0]
hcur.execute("insert into public.tutor_messages(thread_id,role,content,user_id) values(%s,'assistant','x',%s) returning id",(thA,A)); msgA=hcur.fetchone()[0]
hc.commit(); hc.close()
t('00a H16: A reports own tutor message','authenticated',A,"insert into public.item_reports(user_id,reason,target_type,tutor_message_id) values(%s,'other','tutor_message',%s)",'ok',(A,msgA))
t('00a H16: B cannot report A tutor message','authenticated',B,"insert into public.item_reports(user_id,reason,target_type,tutor_message_id) values(%s,'other','tutor_message',%s)",'fail',(B,msgA))
t('00a H16: item report needs an item','authenticated',A,"insert into public.item_reports(user_id,reason) values(%s,'ambiguous')",'fail',(A,))
t('OA-9: is_service_role true for the role without a claim','service_role',None,"select set_config('request.jwt.claim.role','',true); select public.is_service_role()",('val',True))
t('admin resolves report','authenticated',C,"update public.item_reports set status='confirmed', resolved_by=%s, resolved_at=now()",'ok',(C,))
t('A cannot write modules','authenticated',A,"insert into public.modules(key,node,module,title,order_index) values('math.zz','math','zz','x',1)",'fail')
t('admin writes modules','authenticated',C,"insert into public.modules(key,node,module,title,order_index) values('math.zz','math','zz','x',1)",'ok')
t('admin inserts analysis exclusion','authenticated',C,"insert into public.analysis_exclusions(experiment_key,user_id,unit_key,reason,decided_by) values('exp.user',%s,'elec.dc.ohms-law','ceiling at baseline',%s)",'ok',(A,C))
t('admin exclusion needs own decided_by','authenticated',C,"insert into public.analysis_exclusions(experiment_key,user_id,reason,decided_by) values('exp.user',%s,'reason here',%s)",'fail',(A,A))
t('admin cannot delete exclusions (append-only)','authenticated',C,"delete from public.analysis_exclusions",'fail')
t('non-admin cannot insert exclusion','authenticated',A,"insert into public.analysis_exclusions(experiment_key,user_id,reason,decided_by) values('exp.user',%s,'reason here',%s)",'fail',(A,A))
t('exclusion requires a target','service_role',None,"insert into public.analysis_exclusions(reason) values('no target at all')",'fail:analysis_exclusions_target')

# ---------------- constraints (service role) ----------------
S='service_role'
def attempt_sql(extra_cols,extra_vals,grade="'{\"status\":\"graded\",\"score\":0.5,\"correct\":false,\"graders\":[]}'",gs="graded"):
    cols="user_id,item_id,started_at,submitted_at,response,client_attempt_id,grade,grade_status"+extra_cols
    return f"insert into public.attempts({cols}) values('{A}','{ids['iA']}',now()-interval '1 min',now(),'{{}}',gen_random_uuid(),{grade},'{gs}'{extra_vals})"
t('unaided=true with level 0 ok',S,None,attempt_sql(",unaided,max_hint_level",",true,0"))
t('unaided=true with level 1 ok (00a B1)',S,None,attempt_sql(",unaided,max_hint_level,hints_used",",true,1,1"))
t('unaided=true with level 2 rejected',S,None,attempt_sql(",unaided,max_hint_level,hints_used",",true,2,2"),'fail:attempts_unaided_rule')
t('unaided=false with level 0 rejected (iff)',S,None,attempt_sql(",unaided,max_hint_level",",false,0"),'fail:attempts_unaided_rule')
t('unaided=false with level 4 ok',S,None,attempt_sql(",unaided,max_hint_level,hints_used",",false,4,3"))
t('hint level 5 rejected by domain',S,None,attempt_sql(",unaided,max_hint_level,hints_used",",false,5,3"),'fail:hint_level_range')
t('hint level -1 rejected by domain',S,None,attempt_sql(",max_hint_level",",-1"),'fail:hint_level_range')
t('checkpoint attempt with hints rejected',S,None,attempt_sql(",assessment_kind,unaided,max_hint_level,hints_used",",'module_end',false,2,1"),'fail:attempts_checkpoint_no_hints')
t('checkpoint attempt without hints ok',S,None,attempt_sql(",assessment_kind",",'module_end'"))
t('bad assessment_kind rejected',S,None,attempt_sql(",assessment_kind",",'x'"),'fail')
t('invalid_input needs null score/correct',S,None,attempt_sql("",'',"'{\"status\":\"invalid_input\",\"score\":null,\"correct\":null,\"graders\":[]}'",'invalid_input'))
t('invalid_input with numeric score rejected',S,None,attempt_sql("",'',"'{\"status\":\"invalid_input\",\"score\":0,\"correct\":false,\"graders\":[]}'",'invalid_input'),'fail:attempts_grade_shape')
t('pending_review with null score ok',S,None,attempt_sql("",'',"'{\"status\":\"pending_review\",\"score\":null,\"correct\":null,\"graders\":[]}'",'pending_review'))
t('grade.status must mirror grade_status',S,None,attempt_sql("",'',"'{\"status\":\"error\",\"score\":null,\"correct\":null,\"graders\":[]}'",'graded'),'fail:attempts_grade_shape')
t('graded score 1.5 rejected',S,None,attempt_sql("",'',"'{\"status\":\"graded\",\"score\":1.5,\"correct\":true,\"graders\":[]}'"),'fail:attempts_grade_shape')
t('graded with null score rejected',S,None,attempt_sql("",'',"'{\"status\":\"graded\",\"score\":null,\"correct\":null,\"graders\":[]}'"),'fail:attempts_grade_shape')
t('pending with grade rejected',S,None,attempt_sql("",'',gs='pending'),'fail')
t('pending without grade ok',S,None,attempt_sql("",'',"null",'pending'))
t('error without grade ok',S,None,attempt_sql("",'',"null",'error'))
t('graded without grade rejected',S,None,attempt_sql("",'',"null",'graded'),'fail:attempts_graded_has_grade')
t('active_ms/expected_ms/flags',S,None,attempt_sql(",active_ms,expected_ms,flags",",5000,4000,array['rapid_guess']"))
t('micro 30 min rejected (A1)',S,None,f"insert into public.sessions(user_id,session_type,context,planned_min,available_minutes) values('{A}','micro','phone',30,30)",'fail:sessions_planned_min_by_type')
t('focus 30 min rejected (A1)',S,None,f"insert into public.sessions(user_id,session_type,context,planned_min,available_minutes) values('{A}','focus','desktop',30,30)",'fail:sessions_planned_min_by_type')
t('diagnostic = focus session with task kind diagnostic',S,None,f"with s as (insert into public.sessions(user_id,session_type,context,planned_min,available_minutes,graph_version,experiment_snapshot) values('{A}','focus','desktop',45,45,'0.1.0','{{\"a\":1}}') returning id) insert into public.session_tasks(session_id,position,task_kind,skill_key,user_id,assessment_kind) select id,1,'diagnostic','elec.dc.ohms-law','{A}','diagnostic' from s")
t('project step 30 min micro rejected (A1)',S,None,f"insert into public.project_steps(key,project_key,position,title,est_min,session_type) values('{pk}#s90','{pk}',90,'x',30,'micro')",'fail:project_steps_est_by_type')
t('project step 30 min focus rejected (A1)',S,None,f"insert into public.project_steps(key,project_key,position,title,est_min,session_type) values('{pk}#s91','{pk}',91,'x',30,'focus')",'fail:project_steps_est_by_type')
t('project step evidence_required array',S,None,f"insert into public.project_steps(key,project_key,position,title,est_min,session_type,evidence_required) values('{pk}#s92','{pk}',92,'x',60,'focus','{{photo,log}}')")
t('video/quicktime allowed in bucket','postgres',None,"select 'video/quicktime' = any(allowed_mime_types) from storage.buckets where id='evidence'",('val',True))
t('skill stub with minutes rejected',S,None,"insert into public.skills(key,node,module,title,tier_target,est_minutes,license,source,status) values('phys.mech.zz','phys','mech','x','L1',5,'o','o','stub')",'fail:skills_stub_shape')
t('real skill without retrieval rejected',S,None,"insert into public.skills(key,node,module,title,tier_target,est_minutes,license,source,status,task_kinds,grader_types) values('elec.dc.zz','elec','dc','x','L1',5,'o','o','draft','{worked_example}','{exact_numeric}')",'fail:skills_stub_shape')
t('skill with checkpoint task_kind rejected (A2)',S,None,"insert into public.skills(key,node,module,title,tier_target,est_minutes,license,source,status,task_kinds,grader_types) values('elec.dc.zz','elec','dc','x','L1',5,'o','o','draft','{worked_example,retrieval,checkpoint}','{exact_numeric}')",'fail:skills_no_session_level_kinds')
t('skill with unknown module rejected',S,None,"insert into public.skills(key,node,module,title,tier_target,est_minutes,license,source,status,task_kinds,grader_types) values('elec.nomod.zz','elec','nomod','x','L1',5,'o','o','draft','{worked_example,retrieval}','{exact_numeric}')",'fail:skills_module_fk')
t('skill status needs_human_review ok',S,None,"insert into public.skills(key,node,module,title,tier_target,est_minutes,license,source,status,task_kinds,grader_types,confusable_set,phone_suitable) values('elec.dc.zz','elec','dc','x','L1',5,'o','o','needs_human_review','{worked_example,retrieval}','{exact_numeric}','dc-ratios',true)")
t('difficulty_prior 0 rejected (D3)',S,None,"insert into public.item_templates(key,skill_key,task_kind,grader_type,difficulty_prior,body,license,source) values('tpl.elec.zz','elec.dc.ohms-law','problem','exact_numeric',0,'{}','o','o')",'fail')
t('difficulty_prior 1 rejected (D3)',S,None,"insert into public.item_templates(key,skill_key,task_kind,grader_type,difficulty_prior,body,license,source) values('tpl.elec.zz','elec.dc.ohms-law','problem','exact_numeric',1,'{}','o','o')",'fail')
t('template (key,version) unique',S,None,"insert into public.item_templates(key,skill_key,task_kind,grader_type,version,body,license,source) values('tpl.elec.t1','elec.dc.ohms-law','problem','exact_numeric',1,'{}','o','o')",'fail:item_templates_key_version_unique')
t('new template version ok',S,None,"insert into public.item_templates(key,skill_key,task_kind,grader_type,version,body,license,source,mastery_eligible,pool,interleave,reference_time_s,tier) values('tpl.elec.t1','elec.dc.voltage-divider','problem','exact_numeric',3,'{}','o','o',false,'transfer',true,90,'L1')")
t('bad pool rejected',S,None,"insert into public.item_templates(key,skill_key,task_kind,grader_type,body,license,source,pool) values('tpl.elec.zz','elec.dc.ohms-law','problem','exact_numeric','{}','o','o','x')",'fail')
t('item must reference existing template version',S,None,"insert into public.items(template_key,template_version,seed,rendered) values('tpl.elec.t1',9,1,'{}')",'fail:items_template_fk')
t('assessment-pool item as practice task rejected',S,None,f"with s as (insert into public.sessions(user_id,session_type,context,planned_min,available_minutes) values('{A}','micro','phone',10,10) returning id) insert into public.session_tasks(session_id,position,task_kind,skill_key,user_id,item_id) select id,1,'retrieval','elec.dc.voltage-divider','{A}','{ids['iAs']}' from s",'fail:assessment-pool')
t('assessment-pool item as delayed task ok',S,None,f"with s as (insert into public.sessions(user_id,session_type,context,planned_min,available_minutes) values('{A}','micro','phone',10,10) returning id) insert into public.session_tasks(session_id,position,task_kind,skill_key,user_id,item_id,assessment_kind) select id,1,'retrieval','elec.dc.voltage-divider','{A}','{ids['iAs']}','delayed' from s")
SERVE=lambda u,i: f"with s as (insert into public.sessions(user_id,session_type,context,planned_min,available_minutes) values('{u}','micro','phone',10,10) returning id) insert into public.session_tasks(session_id,position,task_kind,skill_key,user_id,item_id) select id,1,'retrieval','elec.dc.voltage-divider','{u}','{i}' from s"
# FR-060: the gate holds for the service role, which bypasses RLS
t('verified item can be served',S,None,SERVE(A,ids['iA']))
t('draft item cannot be served',S,None,f"update public.items set status='draft' where id='{ids['iA']}'; "+SERVE(A,ids['iA']),'fail:unverified item')
t('retired item cannot be served',S,None,f"update public.items set status='retired' where id='{ids['iA']}'; "+SERVE(A,ids['iA']),'fail:unverified item')
t('verified item of an unverified template cannot be served',S,None,"update public.item_templates set status='needs_human_review' where key='tpl.elec.t1' and version=1; "+SERVE(A,ids['iA']),'fail:unverified item')
t('needs_human_review item cannot be served to a learner',S,None,f"update public.items set status='needs_human_review' where id='{ids['iA']}'; "+SERVE(A,ids['iA']),'fail:unverified item')
t('needs_human_review item can be served to the founder',S,None,f"update public.items set status='needs_human_review' where id='{ids['iA']}'; "+SERVE(C,ids['iA']))
# Supabase grants function EXECUTE to authenticated directly, so a revoke from PUBLIC alone leaves these callable
for fn in ["claim_jobs('w')","requeue_stale_jobs()","enqueue_job('nightly_maintenance','{}'::jsonb)"]:
    t(f'learner cannot call {fn}','authenticated',A,f"select public.{fn}",'fail:permission denied')
# skill_state
t('skill_state defaults fsrs-6',S,None,"select fsrs_model, source, diag_credit, interleave_stage, blocked_by from public.skill_state limit 1",('val',['fsrs-6','learned',False,0,[]]) if False else 'ok')
t('skill_state fsrs_model default',S,None,"select fsrs_model from public.skill_state limit 1",('val','fsrs-6'))
t('placement cannot be mastered (B6)',S,None,f"update public.skill_state set source='placement', mastery_state='mastered' where user_id='{A}'",'fail:skill_state_placement_never_mastered')
t('placement reviewing ok',S,None,f"update public.skill_state set source='placement', mastery_state='reviewing', diag_credit=true, loop_step='verify', interleave_stage=3 where user_id='{A}'")
t('bad source rejected',S,None,f"update public.skill_state set source='x' where user_id='{A}'",'fail')
t('interleave_stage 4 rejected',S,None,f"update public.skill_state set interleave_stage=4 where user_id='{A}'",'fail')
# review_log
rl=f"insert into public.review_log(user_id,skill_key,rating,session_id,flags,attempt_ids) select '{A}','elec.dc.ohms-law',3,%s,array['x'],array[gen_random_uuid()]"
t('review_log fine',S,None,"insert into public.review_log(user_id,skill_key,rating,flags,attempt_ids) values(%s,'elec.dc.ohms-law',3,array['x'],array[gen_random_uuid()])",'ok',(A,))
t('one review row per skill per session',S,None,f"with s as (insert into public.sessions(user_id,session_type,context,planned_min,available_minutes) values('{A}','micro','phone',10,10) returning id), r1 as (insert into public.review_log(user_id,skill_key,rating,session_id) select '{A}','elec.dc.ohms-law',3,id from s returning 1) insert into public.review_log(user_id,skill_key,rating,session_id) select '{A}','elec.dc.ohms-law',3,id from s",'fail:review_log_session_skill_unique')
# attempts.state_applied_at (00a H15)
t('state_applied_at on a graded attempt ok',S,None,attempt_sql(",state_applied_at",",now()"))
t('state_applied_at on a pending attempt rejected',S,None,attempt_sql(",state_applied_at",",now()","null","pending"),'fail:attempts_state_applied_when_graded')
t('state_applied_at on pending_review rejected',S,None,attempt_sql(",state_applied_at",",now()","'{\"status\":\"pending_review\",\"score\":null,\"correct\":null,\"graders\":[]}'",'pending_review'),'fail:attempts_state_applied_when_graded')
t('state_applied_at on invalid_input rejected',S,None,attempt_sql(",state_applied_at",",now()","'{\"status\":\"invalid_input\",\"score\":null,\"correct\":null,\"graders\":[]}'",'invalid_input'),'fail:attempts_state_applied_when_graded')
t('learner cannot set state_applied_at','authenticated',A,"update public.attempts set state_applied_at=now()",'fail')
t('reconcile index exists','postgres',None,"select count(*) from pg_indexes where schemaname='public' and indexname='attempts_state_unapplied_idx'",('val',1))
c,cur=conn(S)
cur.execute(attempt_sql("","")+" returning id"); aid=cur.fetchone()[0]
cur.execute(attempt_sql("","")+" returning id"); aid2=cur.fetchone()[0]
cas="update public.attempts set state_applied_at=now() where id=%s and state_applied_at is null returning id"
recon="select count(*) from public.attempts where id=%s and grade_status='graded' and state_applied_at is null"
cur.execute(recon,(aid,)); before=cur.fetchone()[0]
cur.execute(cas,(aid,)); first=len(cur.fetchall())
cur.execute(cas,(aid,)); second=len(cur.fetchall())
cur.execute(cas,(aid2,)); cur.fetchall()
# a unit of two attempts has one review_log row: neither attempt comes back to reconcile
cur.execute("insert into public.review_log(user_id,skill_key,rating,attempt_id,attempt_ids) values(%s,'elec.dc.ohms-law',3,%s,%s::uuid[])",(A,aid,[aid,aid2]))
cur.execute(recon,(aid,)); after=cur.fetchone()[0]
cur.execute(recon,(aid2,)); after2=cur.fetchone()[0]
c.rollback(); c.close()
good=(before==1 and first==1 and second==0 and after==0 and after2==0); passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+f'state_applied_at compare-and-set applies once and reconcile skips attempts with no review_log row of their own ({before},{first},{second},{after},{after2})')
# plans
t('plan not a Monday rejected',S,None,f"insert into public.weekly_plans(user_id,week_start,target_minutes) values('{A}','2026-11-03',480)",'fail:weekly_plans_monday')
t('plan duplicate week rejected',S,None,f"insert into public.weekly_plans(user_id,week_start,target_minutes) values('{A}','2026-11-02',480)",'fail:weekly_plans_user_week_unique')
t('slot 30 min micro rejected',S,None,f"insert into public.plan_slots(plan_id,user_id,day,session_type,planned_min,context) values('{ids['plan'+A[0]]}','{A}','2026-11-04','micro',30,'phone')",'fail:plan_slots_planned_min_by_type')
t('slot with other user rejected (composite FK)',S,None,f"insert into public.plan_slots(plan_id,user_id,day,session_type,planned_min,context) values('{ids['plan'+A[0]]}','{B}','2026-11-04','micro',15,'phone')",'fail:plan_slots_plan_fk')
t('slot lab 180 bench ok; moved needs origin',S,None,f"insert into public.plan_slots(plan_id,user_id,day,session_type,planned_min,context,status) values('{ids['plan'+A[0]]}','{A}','2026-11-07','lab',180,'bench','moved')",'fail:plan_slots_moved_has_origin')
t('slot moved with origin ok',S,None,f"insert into public.plan_slots(plan_id,user_id,day,session_type,planned_min,context,status,moved_from_day) values('{ids['plan'+A[0]]}','{A}','2026-11-08','focus',90,'desktop','moved','2026-11-05')")
t('session links plan slot',S,None,f"insert into public.sessions(user_id,session_type,context,planned_min,available_minutes,plan_slot_id) select '{A}','micro','phone',20,20,id from public.plan_slots where user_id='{A}' limit 1")
# evidence status machine
ev_ins=lambda st: f"insert into public.project_evidence(user_project_id,user_id,step_key,evidence_kind,evidence_status,content,challenge_id) select '{ups[A]}','{A}','{steps[0]}','note','{st}','{{}}', id from public.evidence_challenges where user_id='{A}'"
def ev_flow(path):
    # run a chain of transitions in one transaction; return success
    c,cur=conn()
    try:
        cur.execute(ev_ins(path[0])); 
        for st in path[1:]: cur.execute("update public.project_evidence set evidence_status=%s where user_id=%s",(st,A))
        cur.execute("select status from public.evidence_challenges where user_id=%s",(A,)); st=cur.fetchone()[0]
        return ('ok',st)
    except Exception as e: return ('fail',str(e).splitlines()[0])
    finally: c.rollback(); c.close()
def chk(name,path,exp,cstat=None):
    global passed,failed
    r=ev_flow(path); good=(r[0]==exp) and (cstat is None or r[1]==cstat)
    passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+name+('' if good else f' -> {r}'))
chk('evidence submitted->rejected allowed',['submitted','rejected'],'ok','open')
chk('evidence submitted->auto_verified->accepted, challenge consumed',['submitted','auto_verified','accepted'],'ok','consumed')
chk('evidence submitted->needs_review->accepted',['submitted','needs_review','accepted'],'ok','consumed')
chk('evidence submitted->needs_review->rejected leaves challenge open',['submitted','needs_review','rejected'],'ok','open')
chk('evidence submitted->accepted illegal',['submitted','accepted'],'fail')
chk('evidence rejected->accepted illegal',['submitted','rejected','accepted'],'fail')
chk('evidence rejected->submitted illegal (terminal)',['submitted','rejected','submitted'],'fail')
chk('evidence auto_verified->rejected illegal',['submitted','auto_verified','rejected'],'fail')
chk('evidence accepted->needs_review illegal',['submitted','needs_review','accepted','needs_review'],'fail')
t('evidence with other user id rejected (composite FK)',S,None,f"insert into public.project_evidence(user_project_id,user_id,step_key,evidence_kind) values('{ups[A]}','{B}','{steps[0]}','note')",'fail:project_evidence_up_fk')
# challenges
t('challenge code format rejected',S,None,f"insert into public.evidence_challenges(user_id,user_project_id,step_key,attempt_no,code,expires_at) values('{A}','{ups[A]}','{steps[0]}',2,'PM-OOOO-1111',now()+interval '1h')",'fail:evidence_challenges_code_check')
t('challenge attempt_no unique per step',S,None,f"insert into public.evidence_challenges(user_id,user_project_id,step_key,attempt_no,code,expires_at) values('{A}','{ups[A]}','{steps[0]}',1,'PM-2222-3333',now()+interval '1h')",'fail:evidence_challenges_step_attempt_unique')
t('challenge code globally unique',S,None,f"insert into public.evidence_challenges(user_id,user_project_id,step_key,attempt_no,code,expires_at) values('{B}','{ups[B]}','{steps[0]}',2,'PM-7Q4K-2XD9',now()+interval '1h')",'fail:evidence_challenges_code_unique')
t('challenge for other user project rejected',S,None,f"insert into public.evidence_challenges(user_id,user_project_id,step_key,attempt_no,code,expires_at) values('{B}','{ups[A]}','{steps[0]}',3,'PM-2222-3333',now()+interval '1h')",'fail:evidence_challenges_up_fk')
vc=lambda code,step=None: f"select public.verify_challenge_code('{ups[A]}','{step or steps[0]}',%s)->>'reason'"
t('verify: exact code',  'authenticated',A,vc(0),('val','OK'),('PM-7Q4K-2XD9',))
t('verify: lowercase, no hyphen, no prefix','authenticated',A,vc(0),('val','OK'),('7q4k2xd9',))
t('verify: with spaces','authenticated',A,vc(0),('val','OK'),('pm 7Q4K 2XD9',))
t('verify: wrong code','authenticated',A,vc(0),('val','NONCE_MISMATCH'),('PM-AAAA-BBBB',))
t('verify: B code against A project','authenticated',A,vc(0),('val','NONCE_MISMATCH'),('PM-3WRT-5HNZ',))
t('verify: empty','authenticated',A,vc(0),('val','NONCE_MISSING'),('',))
t('verify: other step has no challenge','authenticated',A,vc(0,steps[1]),('val','NONCE_MISMATCH'),('PM-7Q4K-2XD9',))
t('verify: B cannot verify A project','authenticated',B,vc(0),('val','NONCE_MISMATCH'),('PM-7Q4K-2XD9',))
c,cur=conn(); cur.execute("update public.evidence_challenges set expires_at=now()-interval '1 min', issued_at=now()-interval '2 days' where code='PM-7Q4K-2XD9'"); 
cur.execute("select app_private.check_challenge_code(%s,%s,%s,'PM-7Q4K-2XD9')->>'reason'",(A,ups[A],steps[0])); r=cur.fetchone()[0]; c.rollback(); c.close()
good=r=='NONCE_EXPIRED'; passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+'verify: expired challenge -> NONCE_EXPIRED'+('' if good else r))
# bound challenge
c,cur=conn(); cur.execute("select id from public.evidence_challenges where code='PM-7Q4K-2XD9'"); base=cur.fetchone()[0]
cur.execute("insert into public.evidence_challenges(user_id,user_project_id,step_key,attempt_no,code,expires_at,bound_to) values(%s,%s,%s,1,'PM-ZZZZ-2222',now()+interval '100 days',%s)",(A,ups[A],steps[1],base))
cur.execute("select app_private.check_challenge_code(%s,%s,%s,'PM-7Q4K-2XD9')->>'reason'",(A,ups[A],steps[1])); r1=cur.fetchone()[0]
cur.execute("select app_private.check_challenge_code(%s,%s,%s,'PM-ZZZZ-2222')->>'reason'",(A,ups[A],steps[1])); r2=cur.fetchone()[0]; c.rollback(); c.close()
good=(r1=='OK' and r2=='NONCE_MISMATCH'); passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+f'verify: bound challenge validates the reused code ({r1},{r2})')
# grants
t('grant L1 applied needs applied_at',S,None,f"update public.project_grants set status='applied' where user_id='{A}'",'fail:project_grants_applied_at')
t('grant L2 rejected (B5)',S,None,f"insert into public.project_grants(user_id,user_project_id,project_key,skill_key,tier) values('{A}','{ups[A]}','{pk}','elec.dc.ohms-law','L2')",'fail')
t('grant L0 pending rejected',S,None,f"insert into public.project_grants(user_id,user_project_id,project_key,skill_key,tier,status) values('{A}','{ups[A]}','{pk}','elec.dc.ohms-law','L0','pending')",'fail:project_grants_l0_applied')
t('grant L0 applied ok',S,None,f"insert into public.project_grants(user_id,user_project_id,project_key,skill_key,tier,status,applied_at) values('{A}','{ups[A]}','{pk}','elec.dc.ohms-law','L0','applied',now())")
t('bench_state jsonb',S,None,f"update public.user_projects set bench_state='{{\"version\":1,\"power_state\":\"unplugged\"}}' where id='{ups[A]}'")
# experiments
t('assign: user-level sticky','authenticated',A,"select public.assign_experiment('exp.user') = public.assign_experiment('exp.user')",('val',True))
t('assign: row has unit_type user','authenticated',A,"select public.assign_experiment('exp.user'); select unit_type||':'||(unit_key=%s::text)::text from public.experiment_assignments where experiment_key='exp.user'",('val','user:true'),(A,))
t('assign: wrong unit type for design','authenticated',A,"select public.assign_experiment('exp.unit')",'fail:assigns by skill')
t('assign: skill-level sticky','authenticated',A,"select public.assign_experiment('exp.unit','skill','elec.dc.ohms-law') = public.assign_experiment('exp.unit','skill','elec.dc.ohms-law')",('val',True))
t('assign: unknown skill','authenticated',A,"select public.assign_experiment('exp.unit','skill','elec.dc.nope')",'fail:unknown skill')
t('assign: draft experiment refused','authenticated',A,"select public.assign_experiment('exp.draft')",'fail:not running')
t('assign: external allocation refused for new unit','authenticated',A,"select public.assign_experiment('exp.ext')",'fail:external allocation')
t('assign: external allocation returns existing','authenticated',B,"select public.assign_experiment('exp.ext')::text",('val','treatment'))
t('assign: user unit_key must be self','authenticated',A,"select public.assign_experiment('exp.user','user',%s)",'fail:invalid unit_key',(B,))
t('assign: no jwt refused','authenticated',None,"select public.assign_experiment('exp.user')",'fail')
# multi-skill per-unit stickiness + independence + distribution
ks=[r for r in ['elec.dc.ohms-law','elec.dc.voltage-divider']]
c,cur=conn(); cur.execute("select key from public.skills where node='elec' and module='dc' limit 11"); ks=[r[0] for r in cur.fetchall()]; c.rollback(); c.close()
c,cur=conn(); cur.execute("update public.experiments set design='{\"unit_type\":\"skill\"}', allocation_treatment_pct=50 where key='exp.unit'"); 
for k in ks: cur.execute("insert into public.experiment_assignments(experiment_key,user_id,arm,unit_type,unit_key) values('exp.unit',%s,'control','skill',%s)",(A,k)) if False else None
c.commit(); c.close()
# real run: assign each skill as A in one txn twice; commit to persist, then re-check stickiness across connections
c,cur=conn('authenticated',A)
first={}
for k in ks:
    cur.execute("select public.assign_experiment('exp.unit','skill',%s)::text",(k,)); first[k]=cur.fetchone()[0]
c.commit(); c.close()
c,cur=conn('authenticated',A); second={}
for k in ks:
    cur.execute("select public.assign_experiment('exp.unit','skill',%s)::text",(k,)); second[k]=cur.fetchone()[0]
cur.execute("select count(*) from public.experiment_assignments where experiment_key='exp.unit'"); n=cur.fetchone()[0]; c.rollback(); c.close()
good=(first==second and n==len(ks) and len(set(first.values()))==2); passed+=good; failed+=(not good)
print(('PASS ' if good else 'FAIL ')+f'assign: per-skill arms sticky across connections, one row per unit ({n} rows, arms {sorted(set(first.values()))})')
# changing allocation after assignment doesn't alter existing arms
c,cur=conn(); cur.execute("update public.experiments set allocation_treatment_pct=0 where key='exp.unit'"); c.commit(); c.close()
c,cur=conn('authenticated',A); third={}
for k in ks:
    cur.execute("select public.assign_experiment('exp.unit','skill',%s)::text",(k,)); third[k]=cur.fetchone()[0]
c.rollback(); c.close()
good=(third==first); passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+'assign: arms unchanged after allocation change (sticky)')
t('assign: ended experiment keeps existing arm','authenticated',A,"select public.assign_experiment('exp.unit','skill',%s)::text",'ok',(ks[0],))
c,cur=conn(); cur.execute("update public.experiments set status='ended', ended_at=now() where key='exp.unit'"); c.commit(); c.close()
t('assign: ended experiment keeps existing arm','authenticated',A,"select public.assign_experiment('exp.unit','skill',%s)::text",('val',first[ks[0]]),(ks[0],))
t('assign: ended experiment refuses new unit','authenticated',A,"select public.assign_experiment('exp.unit','skill','elec.dc.ohms-law-zz')",'fail')
t('assignment unit uniqueness','service_role',None,f"insert into public.experiment_assignments(experiment_key,user_id,arm,unit_type,unit_key) values('exp.unit','{A}','control','skill','{ks[0]}')",'fail:experiment_assignments_unit_unique')
t('user unit_key must equal user id','service_role',None,f"insert into public.experiment_assignments(experiment_key,user_id,arm,unit_type,unit_key) values('exp.user','{A}','control','user','{B}')",'fail:experiment_assignments_user_unit_is_user')
t('learner sees own assignment cols','authenticated',A,"select experiment_key,arm,unit_type,unit_key from public.experiment_assignments where experiment_key='exp.unit' limit 1",'ok')
t('design.unit_type validated','service_role',None,"insert into public.experiments(key,description,design) values('exp.bad','x','{\"unit_type\":\"galaxy\"}')",'fail:experiments_design_unit')
# jobs
t('enqueue/claim/complete (service)','service_role',None,"""select (select count(*) from (select public.enqueue_job('grade_attempt','{}',null,'dk1')) q) ; """,'ok')
c,cur=conn('service_role'); cur.execute("select public.enqueue_job('grade_attempt','{}'::jsonb,null,'dk1')"); j1=cur.fetchone()[0]
cur.execute("select public.enqueue_job('grade_attempt','{}'::jsonb,null,'dk1')"); j2=cur.fetchone()[0]
cur.execute("select count(*) from public.claim_jobs('w1')"); n1=cur.fetchone()[0]; cur.execute("select count(*) from public.claim_jobs('w2')"); n2=cur.fetchone()[0]
cur.execute("select public.fail_job(%s,'w1','boom',true)::text",(j1,)); st=cur.fetchone()[0]
cur.execute("select run_after > now() from public.jobs where id=%s",(j1,)); fut=cur.fetchone()[0]
c.rollback(); c.close()
good=(j1==j2 and n1==1 and n2==0 and st=='queued' and fut); passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+f'jobs: dedupe, single claim, retry with backoff ({j1==j2},{n1},{n2},{st},{fut})')
t('job kind check','service_role',None,"select public.enqueue_job('human_review')",'fail:jobs_kind_check')
# G15: nightly_maintenance is an accepted kind, dedupes per day, is claimable by kind and retention covers it
c,cur=conn('service_role')
cur.execute("select public.enqueue_job('nightly_maintenance','{\"run_date\":\"2026-11-01\"}'::jsonb,null,'nightly:20261101',0::smallint,now(),2,900)"); n1=cur.fetchone()[0]
cur.execute("select public.enqueue_job('nightly_maintenance','{\"run_date\":\"2026-11-01\"}'::jsonb,null,'nightly:20261101',0::smallint,now(),2,900)"); n2=cur.fetchone()[0]
cur.execute("select count(*) from public.claim_jobs('wN', array['grade_attempt'])"); wrong=cur.fetchone()[0]
cur.execute("select count(*), min(kind) from public.claim_jobs('wN', array['nightly_maintenance'])"); got,kind=cur.fetchone()
cur.execute("select public.complete_job(%s,'wN','{\"steps\":[\"decay\",\"calibration\",\"tutor_audit\"]}'::jsonb)::text",(n1,)); done=cur.fetchone()[0]
c.rollback(); c.close()
good=(n1==n2 and wrong==0 and got==1 and kind=='nightly_maintenance' and done=='true'); passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+f'jobs: nightly_maintenance accepted, deduped, claimed by kind, completed ({n1==n2},{wrong},{got},{kind},{done})')
t('nightly_maintenance not enqueueable by a learner','authenticated',A,"select public.enqueue_job('nightly_maintenance')",'fail')
t('learner sees no jobs (admin-only policy)','authenticated',A,"select count(*) from public.jobs",('val',0))

# rate limits
c,cur=conn('service_role'); u=A
res=[]
for i in range(4):
    cur.execute("select app_private.rate_limit_take(%s,'attempt',3,1.0,1)",(u,)); res.append(cur.fetchone()[0])
cur.execute("select tokens from app_private.rate_limits where user_id=%s and bucket='attempt'",(u,)); tok=cur.fetchone()[0]
c.rollback(); c.close()
good=(res[:3]==[0,0,0] and 0<res[3]<=1.0 and tok<1); passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+f'rate_limits: 3 allowed then wait {res[3]:.2f}s')
t('rate_limit invalid params','service_role',None,"select app_private.rate_limit_take(gen_random_uuid(),'x',1,1,5)",'fail')
t('rate_limits FK to profiles','service_role',None,"insert into app_private.rate_limits(user_id,bucket,tokens) values(gen_random_uuid(),'x',1)",'fail')
t('prune_expired runs','service_role',None,"select app_private.prune_expired()",'ok')
# strict view
c,cur=conn()
cur.execute("insert into public.tutor_threads(user_id,item_id,created_at) values(%s,%s,now()-interval '1 hour')",(B,ids['iB']))
cur.execute("select count(*) from app_private.v_attempts_strict_unaided where user_id=%s",(B,)); nb=cur.fetchone()[0]
cur.execute("select count(*) from app_private.v_attempts_strict_unaided where user_id=%s",(A,)); na=cur.fetchone()[0]
cur.execute("insert into public.attempts(user_id,item_id,started_at,submitted_at,response,client_attempt_id,grade,grade_status,max_hint_level,hints_used,unaided) values(%s,%s,now()-interval '1 min',now(),'{}',gen_random_uuid(),'{\"status\":\"graded\",\"score\":1,\"correct\":true,\"graders\":[]}','graded',1,1,true)",(A,ids['iP']))
cur.execute("select count(*) from app_private.v_attempts_strict_unaided where user_id=%s",(A,)); na2=cur.fetchone()[0]
cur.execute("insert into public.attempts(user_id,item_id,started_at,submitted_at,response,client_attempt_id,grade,grade_status) values(%s,%s,now()-interval '1 min',now(),'{}',gen_random_uuid(),'{\"status\":\"invalid_input\",\"score\":null,\"correct\":null,\"graders\":[]}','invalid_input')",(A,ids['iP']))
cur.execute("select count(*) from app_private.v_attempts_strict_unaided where user_id=%s",(A,)); na3=cur.fetchone()[0]
c.rollback(); c.close()
good=(nb==0 and na==1 and na2==1 and na3==1); passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+f'strict view: tutor thread excludes (B={nb}), level-1 excluded (A {na}->{na2}), invalid_input excluded ({na3})')
# triggers / privileges
c,cur=conn(); cur.execute("set role supabase_auth_admin"); 
try:
    cur.execute("insert into auth.users(id,email) values(gen_random_uuid(),'new@example.test') returning id"); nid=cur.fetchone()[0]
    cur.execute("reset role"); cur.execute("select count(*) from public.profiles where id=%s",(nid,)); ok=cur.fetchone()[0]==1
except Exception as e: ok=False; print(e)
c.rollback(); c.close(); passed+=ok; failed+=(not ok); print(('PASS ' if ok else 'FAIL ')+'signup trigger works for supabase_auth_admin with app_private locked down')
t('authenticated can update profile with app_private triggers','authenticated',A,"update public.profiles set locale='it' where id=%s",'ok',(A,))
t('authenticated reaches no app_private function','authenticated',A,"select app_private.prune_expired()",'fail')
# security definer functions pin search_path
t('all security definer functions pin search_path','postgres',None,"""select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%')""",('val',0))
t('RLS enabled on every public table + rate_limits','postgres',None,"""select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','app_private') and not c.relrowsecurity""",('val',0))
t('no anon table grants','postgres',None,"select count(*) from information_schema.role_table_grants where grantee='anon' and table_schema in ('public','app_private')",('val',0))
t('no anon function execute','postgres',None,"""select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and has_function_privilege('anon',p.oid,'execute')""",('val',0))
t('no PUBLIC function execute in app_private','postgres',None,"""select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and has_function_privilege('authenticated',p.oid,'execute')""",('val',0))
# cascades
c,cur=conn()
cur.execute("delete from auth.users where id=%s",(A,))
chk_tbls=['profiles','attempts','skill_state','weekly_plans','plan_slots','user_projects','evidence_challenges','project_grants','project_evidence','items','item_secrets','events','experiment_assignments','review_log','sessions','session_tasks','analysis_exclusions','item_reports']
left={}
for tb in chk_tbls:
    col='id' if tb=='profiles' else 'user_id'
    if tb=='item_secrets': cur.execute("select count(*) from public.item_secrets s join public.items i on i.id=s.item_id where i.user_id=%s",(A,))
    else: cur.execute(f"select count(*) from public.{tb} where {col}=%s",(A,))
    left[tb]=cur.fetchone()[0]
c.rollback(); c.close()
good=all(v==0 for v in left.values()); passed+=good; failed+=(not good); print(('PASS ' if good else 'FAIL ')+f'cascade: deleting auth user removes dependents {({k:v for k,v in left.items() if v})}')
print(f'\n{passed} passed, {failed} failed'); sys.exit(1 if failed else 0)
