--
-- PostgreSQL database dump
--

\restrict ITaGixC7edJqRniIMfL4QeQCLcvgE6O0ShEigcZSrAclQTSMl7pvUar2G8MyMtb

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: ProjectMemberStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProjectMemberStatus" AS ENUM (
    'ACTIVE',
    'INVITED'
);


ALTER TYPE public."ProjectMemberStatus" OWNER TO postgres;

--
-- Name: ProjectRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProjectRole" AS ENUM (
    'OWNER',
    'HEADER',
    'MEMBER'
);


ALTER TYPE public."ProjectRole" OWNER TO postgres;

--
-- Name: ProjectTaskStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProjectTaskStatus" AS ENUM (
    'SUBMITTED',
    'IN_PROGRESS',
    'BLOCKED'
);


ALTER TYPE public."ProjectTaskStatus" OWNER TO postgres;

--
-- Name: SubmissionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SubmissionStatus" AS ENUM (
    'SUBMITTED',
    'REVISION_REQUESTED',
    'APPROVED'
);


ALTER TYPE public."SubmissionStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    bio text,
    password_hash text,
    last_sign_in timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: project_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_departments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#DDE7FF'::text NOT NULL,
    text_color text DEFAULT '#2F2766'::text NOT NULL,
    head character varying(255),
    member_count integer DEFAULT 0 NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.project_departments OWNER TO postgres;

--
-- Name: project_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_invites (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    department_id uuid,
    token text NOT NULL,
    role public."ProjectRole" DEFAULT 'MEMBER'::public."ProjectRole" NOT NULL,
    created_by uuid NOT NULL,
    max_uses integer,
    use_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp(6) with time zone,
    revoked_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.project_invites OWNER TO postgres;

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_members (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public."ProjectRole" DEFAULT 'MEMBER'::public."ProjectRole" NOT NULL,
    username text NOT NULL,
    department_id uuid,
    status public."ProjectMemberStatus" DEFAULT 'ACTIVE'::public."ProjectMemberStatus" NOT NULL,
    last_seen_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.project_members OWNER TO postgres;

--
-- Name: project_task_assignees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_task_assignees (
    task_id uuid NOT NULL,
    member_id uuid NOT NULL,
    assigned_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.project_task_assignees OWNER TO postgres;

--
-- Name: project_task_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_task_submissions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    submitted_by_id uuid NOT NULL,
    reviewer_id uuid,
    status public."SubmissionStatus" DEFAULT 'SUBMITTED'::public."SubmissionStatus" NOT NULL,
    description text,
    reviewer_comment text,
    attachment_metadata jsonb,
    acknowledged_at timestamp(6) with time zone,
    owner_acknowledged_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.project_task_submissions OWNER TO postgres;

--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    department_id uuid,
    created_by_member_id uuid NOT NULL,
    title text NOT NULL,
    detail text,
    status public."ProjectTaskStatus" DEFAULT 'SUBMITTED'::public."ProjectTaskStatus" NOT NULL,
    start_date timestamp(6) with time zone,
    due_date timestamp(6) with time zone,
    card_color text DEFAULT '#F6F0FF'::text NOT NULL,
    card_text_color text DEFAULT '#2F2766'::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.project_tasks OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    owner_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    departments text[] DEFAULT ARRAY[]::text[],
    image_url text,
    created_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_departments project_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_departments
    ADD CONSTRAINT project_departments_pkey PRIMARY KEY (id);


--
-- Name: project_invites project_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_invites
    ADD CONSTRAINT project_invites_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_task_assignees project_task_assignees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_task_assignees
    ADD CONSTRAINT project_task_assignees_pkey PRIMARY KEY (task_id, member_id);


--
-- Name: project_task_submissions project_task_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_task_submissions
    ADD CONSTRAINT project_task_submissions_pkey PRIMARY KEY (id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: profiles_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);


--
-- Name: project_departments_project_id_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_departments_project_id_order_idx ON public.project_departments USING btree (project_id, "order");


--
-- Name: project_invites_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX project_invites_token_key ON public.project_invites USING btree (token);


--
-- Name: project_members_project_id_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX project_members_project_id_user_id_key ON public.project_members USING btree (project_id, user_id);


--
-- Name: project_task_assignees_member_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_task_assignees_member_id_idx ON public.project_task_assignees USING btree (member_id);


--
-- Name: project_task_submissions_task_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_task_submissions_task_id_idx ON public.project_task_submissions USING btree (task_id);


--
-- Name: project_tasks_department_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_tasks_department_id_idx ON public.project_tasks USING btree (department_id);


--
-- Name: project_tasks_project_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_tasks_project_id_idx ON public.project_tasks USING btree (project_id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_departments project_departments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_departments
    ADD CONSTRAINT project_departments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_invites project_invites_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_invites
    ADD CONSTRAINT project_invites_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.project_departments(id) ON DELETE SET NULL;


--
-- Name: project_invites project_invites_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_invites
    ADD CONSTRAINT project_invites_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.project_departments(id) ON DELETE SET NULL;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: project_task_assignees project_task_assignees_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_task_assignees
    ADD CONSTRAINT project_task_assignees_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.project_members(id) ON DELETE CASCADE;


--
-- Name: project_task_assignees project_task_assignees_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_task_assignees
    ADD CONSTRAINT project_task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.project_tasks(id) ON DELETE CASCADE;


--
-- Name: project_task_submissions project_task_submissions_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_task_submissions
    ADD CONSTRAINT project_task_submissions_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.project_members(id) ON DELETE SET NULL;


--
-- Name: project_task_submissions project_task_submissions_submitted_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_task_submissions
    ADD CONSTRAINT project_task_submissions_submitted_by_id_fkey FOREIGN KEY (submitted_by_id) REFERENCES public.project_members(id) ON DELETE CASCADE;


--
-- Name: project_task_submissions project_task_submissions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_task_submissions
    ADD CONSTRAINT project_task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.project_tasks(id) ON DELETE CASCADE;


--
-- Name: project_tasks project_tasks_created_by_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_created_by_member_id_fkey FOREIGN KEY (created_by_member_id) REFERENCES public.project_members(id) ON DELETE CASCADE;


--
-- Name: project_tasks project_tasks_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.project_departments(id) ON DELETE SET NULL;


--
-- Name: project_tasks project_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: project_departments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_departments ENABLE ROW LEVEL SECURITY;

--
-- Name: project_invites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_task_assignees; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_task_assignees ENABLE ROW LEVEL SECURITY;

--
-- Name: project_task_submissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_task_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: project_tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE project_departments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_departments TO anon;
GRANT ALL ON TABLE public.project_departments TO authenticated;
GRANT ALL ON TABLE public.project_departments TO service_role;


--
-- Name: TABLE project_invites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_invites TO anon;
GRANT ALL ON TABLE public.project_invites TO authenticated;
GRANT ALL ON TABLE public.project_invites TO service_role;


--
-- Name: TABLE project_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_members TO anon;
GRANT ALL ON TABLE public.project_members TO authenticated;
GRANT ALL ON TABLE public.project_members TO service_role;


--
-- Name: TABLE project_task_assignees; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_task_assignees TO anon;
GRANT ALL ON TABLE public.project_task_assignees TO authenticated;
GRANT ALL ON TABLE public.project_task_assignees TO service_role;


--
-- Name: TABLE project_task_submissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_task_submissions TO anon;
GRANT ALL ON TABLE public.project_task_submissions TO authenticated;
GRANT ALL ON TABLE public.project_task_submissions TO service_role;


--
-- Name: TABLE project_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_tasks TO anon;
GRANT ALL ON TABLE public.project_tasks TO authenticated;
GRANT ALL ON TABLE public.project_tasks TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict ITaGixC7edJqRniIMfL4QeQCLcvgE6O0ShEigcZSrAclQTSMl7pvUar2G8MyMtb

