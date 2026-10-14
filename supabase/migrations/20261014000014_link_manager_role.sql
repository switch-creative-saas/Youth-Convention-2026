-- New staff role that may only create and manage registration links.
-- (Added in its own migration: a new enum value cannot be used in the transaction that adds it.)
alter type public.workspace_role add value if not exists 'link_manager' after 'registration_desk';
