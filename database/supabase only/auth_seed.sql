-- Sanitized seed data for Supabase Auth schema
-- Only demo users for helicop and soriya88 are included.

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	a49a4cba-a000-462a-ade3-3440fd750374	authenticated	authenticated	helicop@gmail.com	$2a$10$fZ5zwqWmGTVwmVgk7IZU7Ow7h9r8I1phXOUHBaDh1AoQyPnSxjF/a	2025-12-13 17:06:48.106336+00	\N	pkce_4b382a3093b7eb4ddef0f96f5930c55d5d0dad23193224b7561722c9	2025-12-13 17:01:00.285561+00		\N			\N	2025-12-13 18:26:58.0826+00	{"provider": "email", "providers": ["email"]}	{"sub": "a49a4cba-a000-462a-ade3-3440fd750374", "email": "helicop@gmail.com", "full_name": "helicop", "email_verified": false, "phone_verified": false}	\N	2025-12-13 17:01:00.24612+00	2025-12-14 07:22:48.918391+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	77bd5f4c-0e6b-40f5-b0f5-a77443c89b82	authenticated	authenticated	soriya88@gmail.com	$2a$10$c9hWOktNKjWhAbi5CFv/KuRUqqBKda8o0iGB0qcVR0/3p8KWJmj6m	2025-12-14 05:06:20.298513+00	\N	pkce_d9ba3d808f89e28264c9370409edfccd2569cf280c2e432563a292bb	2025-12-14 05:01:24.392437+00		\N			\N	2025-12-14 05:06:34.683521+00	{"provider": "email", "providers": ["email"]}	{"sub": "77bd5f4c-0e6b-40f5-b0f5-a77443c89b82", "email": "soriya88@gmail.com", "full_name": "Soriya-Chan", "email_verified": false, "phone_verified": false}	\N	2025-12-14 05:01:24.314724+00	2025-12-14 07:22:47.825542+00	\N	\N			\N		0	\N		\N	f	\N	f
\.

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
a49a4cba-a000-462a-ade3-3440fd750374	a49a4cba-a000-462a-ade3-3440fd750374	{"sub": "a49a4cba-a000-462a-ade3-3440fd750374", "email": "helicop@gmail.com", "full_name": "helicop", "email_verified": false, "phone_verified": false}	email	2025-12-13 17:01:00.269446+00	2025-12-13 17:01:00.270297+00	2025-12-13 17:01:00.270297+00	21b37c2e-32e3-40f5-a52a-d8d9d6ca55e0
77bd5f4c-0e6b-40f5-b0f5-a77443c89b82	77bd5f4c-0e6b-40f5-b0f5-a77443c89b82	{"sub": "77bd5f4c-0e6b-40f5-b0f5-a77443c89b82", "email": "soriya88@gmail.com", "full_name": "Soriya-Chan", "email_verified": false, "phone_verified": false}	email	2025-12-14 05:01:24.357704+00	2025-12-14 05:01:24.357768+00	2025-12-14 05:01:24.357768+00	50e23a76-f8be-451e-b02a-67f92217b5e0
\.

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
c52f4634-efcd-40ed-9b74-a326578c1737	a49a4cba-a000-462a-ade3-3440fd750374	confirmation_token	pkce_4b382a3093b7eb4ddef0f96f5930c55d5d0dad23193224b7561722c9	helicop@gmail.com	2025-12-13 17:01:01.764201	2025-12-13 17:01:01.764201
af3cd6d6-3afe-4b68-b5b6-79c770aa16ef	77bd5f4c-0e6b-40f5-b0f5-a77443c89b82	confirmation_token	pkce_d9ba3d808f89e28264c9370409edfccd2569cf280c2e432563a292bb	soriya88@gmail.com	2025-12-14 05:01:25.971829	2025-12-14 05:01:25.971829
\.

