-- Sanitized seed data for Supabase public schema
-- Only demo data related to helicop and soriya88 is included.

SET row_security = off;

COPY public.profiles (id, email, full_name, avatar_url, bio, password_hash, last_sign_in, created_at, updated_at) FROM stdin;
77bd5f4c-0e6b-40f5-b0f5-a77443c89b82	soriya88@gmail.com	\N	https://yifuvgsmtgobiicgelqx.supabase.co/storage/v1/object/public/project-images/profiles/77bd5f4c-0e6b-40f5-b0f5-a77443c89b82/69c21ec5-2ed2-415f-ad51-579277aae61e.webp	\N	\N	\N	2025-12-14 05:07:20.009385+00	2025-12-14 05:07:20.009385+00
a49a4cba-a000-462a-ade3-3440fd750374	helicop@gmail.com	\N	https://yifuvgsmtgobiicgelqx.supabase.co/storage/v1/object/public/project-images/profiles/a49a4cba-a000-462a-ade3-3440fd750374/ca67a439-73e2-4ba3-8907-55afc55bbd77.jpg	i am heli.	\N	\N	2025-12-13 18:41:01.786169+00	2025-12-13 18:41:01.786169+00
\.

COPY public.projects (id, owner_id, title, description, departments, image_url, created_at, updated_at) FROM stdin;
a36cd1a9-329b-4ae9-afd1-d3e698713cf0	a49a4cba-a000-462a-ade3-3440fd750374	apple	aa	{ap1,dep2}	https://yifuvgsmtgobiicgelqx.supabase.co/storage/v1/object/public/project-images/projects/a49a4cba-a000-462a-ade3-3440fd750374/6941d4e4-bc2d-424f-bfae-88431f1d918f.jpg	2025-12-13 18:27:18.619341+00	2025-12-13 18:27:18.619341+00
95fbfe76-d1d3-4106-a331-6a1b4892b4fa	a49a4cba-a000-462a-ade3-3440fd750374	dfdf	dfs	{s}	https://yifuvgsmtgobiicgelqx.supabase.co/storage/v1/object/public/project-images/projects/a49a4cba-a000-462a-ade3-3440fd750374/df14b054-35a7-46b0-a71a-fc27e130da90.jpg	2025-12-13 18:28:09.155023+00	2025-12-13 18:28:09.155023+00
aed1862f-163c-4342-9ad7-b90924e14f63	a49a4cba-a000-462a-ade3-3440fd750374	fdf	df	{aa}	https://yifuvgsmtgobiicgelqx.supabase.co/storage/v1/object/public/project-images/projects/a49a4cba-a000-462a-ade3-3440fd750374/a95989ab-8abc-440a-93d5-418639d16744.jpg	2025-12-13 18:30:06.329557+00	2025-12-13 18:30:06.329557+00
a576f024-3693-4308-9f27-eb6bdc048a04	a49a4cba-a000-462a-ade3-3440fd750374	WEE	Test WEEEEEEE	{Student,Teacher,Grandma}	https://yifuvgsmtgobiicgelqx.supabase.co/storage/v1/object/public/project-images/projects/a49a4cba-a000-462a-ade3-3440fd750374/3de13869-5eb2-44dd-9eaf-2c899f7dadee.webp	2025-12-13 18:41:35.943692+00	2025-12-13 18:41:35.943692+00
\.

COPY public.project_departments (id, project_id, name, color, text_color, head, member_count, "order", created_at, updated_at) FROM stdin;
0c433f65-5b1e-4fd8-9b0c-190f5f7df7dd	a576f024-3693-4308-9f27-eb6bdc048a04	Grandma	#D9DEE8	#2F2766	\N	0	2	2025-12-14 05:08:43.922632+00	2025-12-14 05:08:43.922632+00
d3074e0f-31d6-4ead-bf7c-4f063ee75ab6	a576f024-3693-4308-9f27-eb6bdc048a04	Student	#93E8B9	#2F2766	Soriya-Chan	0	0	2025-12-14 05:08:43.791955+00	2025-12-14 05:08:43.791955+00
8526a140-5df8-47c0-b773-e3958d3e2a28	a576f024-3693-4308-9f27-eb6bdc048a04	Teacher	#CDB4FF	#2F2766	helicop	0	1	2025-12-14 05:08:43.916997+00	2025-12-14 05:08:43.916997+00
\.

COPY public.project_invites (id, project_id, department_id, token, role, created_by, max_uses, use_count, expires_at, revoked_at, created_at) FROM stdin;
cdcd4cc4-ebde-4fd3-8f90-e81585f3f37c	a576f024-3693-4308-9f27-eb6bdc048a04	d3074e0f-31d6-4ead-bf7c-4f063ee75ab6	113b28e8-4479-40af-8928-ff0cdaa2b12c	MEMBER	a49a4cba-a000-462a-ade3-3440fd750374	1	0	\N	\N	2025-12-14 05:10:11.033154+00
\.

COPY public.project_members (id, project_id, user_id, role, username, department_id, status, last_seen_at, created_at, updated_at) FROM stdin;
30768285-dbf4-429f-a92e-8bd2efdab07e	a576f024-3693-4308-9f27-eb6bdc048a04	a49a4cba-a000-462a-ade3-3440fd750374	OWNER	helicop	8526a140-5df8-47c0-b773-e3958d3e2a28	ACTIVE	2025-12-13 18:41:39.67+00	2025-12-13 18:41:39.877684+00	2025-12-13 18:41:39.877684+00
eb9cb140-0686-49d9-ad75-6a6073e64623	a576f024-3693-4308-9f27-eb6bdc048a04	77bd5f4c-0e6b-40f5-b0f5-a77443c89b82	HEADER	Soriya-Chan	d3074e0f-31d6-4ead-bf7c-4f063ee75ab6	ACTIVE	2025-12-14 05:10:25.068+00	2025-12-14 05:10:25.190778+00	2025-12-14 05:10:25.190778+00
\.

COPY public.project_tasks (id, project_id, department_id, created_by_member_id, title, detail, status, start_date, due_date, card_color, card_text_color, created_at, updated_at) FROM stdin;
68d85dfa-02c7-4fe9-a0e5-89d237b56691	a576f024-3693-4308-9f27-eb6bdc048a04	\N	30768285-dbf4-429f-a92e-8bd2efdab07e	Need Apple	hurry up my bro!!!	IN_PROGRESS	2025-12-14 12:12:00+00	2025-12-19 00:00:00+00	#B7E5FF	#2F2766	2025-12-14 05:12:56.152544+00	2025-12-14 05:12:56.152544+00
c0a1b854-db05-41d7-b340-07c6cc7250d3	a576f024-3693-4308-9f27-eb6bdc048a04	\N	30768285-dbf4-429f-a92e-8bd2efdab07e	need a pen	\N	SUBMITTED	2025-12-14 12:12:00+00	2025-12-15 00:00:00+00	#ffb8e2	#2F2766	2025-12-14 05:13:40.524986+00	2025-12-14 05:13:40.524986+00
4214e3d2-3db1-46c8-b96f-52162d18be74	a576f024-3693-4308-9f27-eb6bdc048a04	\N	30768285-dbf4-429f-a92e-8bd2efdab07e	I need Hollow Cube!!	\N	BLOCKED	2025-12-17 14:00:00+00	2025-12-17 23:59:00+00	#CFF7C4	#2F2766	2025-12-14 05:21:54.297035+00	2025-12-14 05:21:54.297035+00
\.

COPY public.project_task_assignees (task_id, member_id, assigned_at) FROM stdin;
68d85dfa-02c7-4fe9-a0e5-89d237b56691	eb9cb140-0686-49d9-ad75-6a6073e64623	2025-12-14 05:12:56.152544+00
c0a1b854-db05-41d7-b340-07c6cc7250d3	eb9cb140-0686-49d9-ad75-6a6073e64623	2025-12-14 05:13:40.524986+00
4214e3d2-3db1-46c8-b96f-52162d18be74	eb9cb140-0686-49d9-ad75-6a6073e64623	2025-12-14 05:21:54.297035+00
\.

