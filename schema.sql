BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS shows (id integer primary key, tmdb_id integer unique, name varchar(255), start_season integer, start_episode integer, desired_quality varchar(10), eztv text);
CREATE TABLE IF NOT EXISTS downloads (id integer primary key, tmdb_id integer, show varchar(255), name varchar(255), episode integer, season integer, transmission_id integer, download_dir varchar(255), renamed boolean default false, foreign key (tmdb_id) references shows(tmdb_id) on delete set null);
DROP TABLE IF EXISTS attempts;
CREATE TABLE IF NOT EXISTS attempts (id integer primary key, tmdb_id integer, season integer, episode integer, attempts integer, foreign key (tmdb_id) references shows(tmdb_id));
COMMIT;
