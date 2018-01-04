```bash
$$$$$$$\             $$\
$$  __$$\            $$ |
$$ |  $$ | $$$$$$\ $$$$$$\    $$$$$$\
$$$$$$$  |$$  __$$\\_$$  _|  $$  __$$\
$$  ____/ $$$$$$$$ | $$ |    $$$$$$$$ |
$$ |      $$   ____| $$ |$$\ $$   ____|
$$ |      \$$$$$$$\  \$$$$  |\$$$$$$$\
\__|       \_______|  \____/  \_______|
```

Pete is a Nodejs CLI and daemon that automatically downloads TV show episodes and movies using [themoviedb.org](https://www.themoviedb.org/ "TMdb") watchlists and [Transmission](https://transmissionbt.com/).

This was made as sort of an opinionated alternative to Flexget automatically fetching TV shows and movies. Flexget is amazing and does so many things, but for the life of me could not get it configured to work well and predictably.

I say opinionated because it uses TMdb to track what you want to watch and Transmission as a BitTorrent client and finds magnets using certain static sources (RARBG and EZTV). Some of these 'opinions' could change in the future, but currently this is how it is.

## Features

- Hands-off - automatically find show episodes without searching yourself
- Easy configuration - set it and forget it!
- You can tell Pete what you want to download from anywhere using your TMdb watchlists
- Download a movie or episodes of a show independently
- Automatically rename movies and episodes in a media server-friendly format
- Receive notifications when things start and finish via Pushbullet

## Installation

See the wiki pages about [preparation](https://github.com/grantholle/pete/wiki/Preparation) and [installation](https://github.com/grantholle/pete/wiki/Installation-instructions).

## Usage

All the commands:

```bash
pete -h

  Usage: pete [options] [command]


  Options:

    -V, --version  output the version number
    -h, --help     output usage information


  Commands:

    install|i                           Sets up the local filesystem, authorizes TMdb api credentials, and other misc installation requirements
    tv [options]                        Fetches your TMdb TV watchlist and finds new episodes of your shows
    show [options] [tmdb_id|show_name]  Fetches episodes for a show based on the TMdb ID or show name. If no show is provided, choose from your watchlist.
    movies                              Download the movies in your TMdb movie watchlist
    movie|m <tmdb_id|title>             Search for a movie to start downloading based on title or TMdb ID
    tv-setup|s                          Runs the configuation setup for the shows in your TV watchlist
    add-service-file|f                  Saves a service file to run Pete as a service on boot
    clean-torrents|c                    Removes torrents that have met or exceeded the configured ratio limit
```

Example usage of the commands.

### `tv-setup|s`

After adding shows in your TV watchlist, run this if you don't want the default configuration: most recent season, episode 1, HDTV quality.

```bash
# Will fetch your TV watchlist and ask you which shows you want to configure
pete tv-setup

# or
pete s
```

### `tv`

Fetches the shows in your tv watchlist, checks if there's any new episodes that you need download. It will use the starting season, episode and quality that was configured when running `pete tv-setup`. If no existing configuration is found, it will start at the most current season episode 1 in HDTV quality.

There's also a flag, `-c|--choose`, that enables you to be selective of the shows you want to check.

```bash
# Checks everything, useful for crons and things because it isn't interactive
pete tv

# Interactively choose the shows you want to check
pete tv -c
```

### `show`

Download all the episodes (or just one) of a show. You can search by show name or TMdb id. Names need to be wrapped in quotes. If more than one show is found for your search string you'll be prompted to confirm which show you want to download. See below for the options that are available. If you don't define a quality, HDTV will be used automatically, but will search for other qualities if it can't find HDTV. This is the easiest way to find an episode of _any_ show to download. 💯

```bash
# Searches for all episodes of all the seasons for a show
pete show 'last man on earth' # or pete show 61888

# Searches for all episodes starting at season 3
pete show 'last man on earth' --season 3

# Searches for all episodes starting at season 3
# and ignores if you've already downloaded them
pete show 'last man on earth' --season 3 --force

# Searches for all episodes starting at season 3
# with a desired quality of 1080p but will fallback if that quality can't be found
# and ignores if you've already downloaded them
pete show 'last man on earth' --season 3 --quality 1080p --force

# Searches for all episodes starting at episode 6 of season 3
# with a desired quality of 1080p but will fallback if that quality can't be found
# and ignores if you've already downloaded them
pete show 'last man on earth' --season 3 --episode 6 --quality 1080p --force

# Searches for episode 6 of season 3 ONLY
# with a desired quality of 1080p but will fallback if that quality can't be found
# and ignores if you've already downloaded it
pete show 'last man on earth' --season 3 --episode 6 --quality 1080p --force --one
```

### `movies`

```bash
# Checks your movie watchlist and downloads them using configuration from installation
pete movies
```

### `movie|m`

Download a movie from a movie title or TMdb id if you have it. Uses the configuration for quality.

```bash
# Searches for all episodes of all the seasons for a show
pete movie 'top gun'
# or
pete movie 744
```

### `add-service-file|f`

Creates a systemd file for Linux. Only applies to Linux platforms. It will prompt you for your sudo password.

```bash
pete f
```

### `clean-torrents|c`

Checks your torrents in Transmission and removes the torrents that have met or exceeded your Transmission ratio limit. This is just a utility function.

```bash
pete clean-torrents
```

## License

[MIT](LICENSE.md)
