drop publication if exists powersync;
create publication powersync for table profiles, contacts, groups, memberships, messages;
