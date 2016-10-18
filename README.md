# Pete

Automatically download TV shows and movies using [themoviedb.org](https://www.themoviedb.org/ "TMdb") watchlists and Transmission.

This was made as sort of an opinionated alternative to Flexget automatically fetching TV shows and movies. Flexget is amazing and does so many things, but for the life of me could not get it configured to work well. So I made this instead.

I say opinionated because it uses TMdb, Transmission, and searches for torrents in an opinionated fashion without wiggle room or customization. Flexget gave me too much customization power, which is why I found it nearly impossible to get going properly to my liking.

Some of these 'opinions' could change in the future, but currently this is how it is.

Pete has been built to run on [OSMC](https://osmc.tv/) on a Raspberry Pi (because that's what I'm using), but will run with anything that has Node and Transmission installed (theoretically). I developed it on a Mac and it runs just fine. It can be configured to run automatically in the background or you can run in manually by using a few handy commands.

## Preparation

This guide makes some assumptions:

1. If you're intending to use a Pi with something OSMC, you're already installed OSMC and have it going. Installing OSMC is super easy and there are a ton of guides to assist you doing this.
2. You have SSH access (for something like OSMC) and/or you know how to use a console
3. If you're using a Pi, then you have an external drive ready and already mounted
4. If you're using something Kodi related (OSMC, XMBC), then sqlite will already be installed. If you're not using something Kodi related, you'll need to make sure that sqlite is installed.
5. You know who Pete Hornberger is

Installation and configuration can be a little tedious, but hopefully not too bad, since that's why I made this in the first place.

### themoviedb.org

Before we start the process of installing Pete, we need to set up a couple things. Pete uses [themoviedb.org](https://www.themoviedb.org/ "TMdb") TV and Movie watchlists to know what to download. Go there and create an account. Start adding stuff to your watchlists that you want to download.

Next we need to get an API key to access your watchlists and other information about TV shows and movies.

1. On your account page, to to API and follow the link to request a new API key.
2. Follow the link for the "Developer" key type.
3. Accept the terms.
4. This will open a form to fill out for obtain a key.
  - Application Name: anything you want, but probably something like "Pete"
  - Application URL: http://localhost
  - Summary: whatever you want, but it has a minimum character validation, so something like: "Pulls my watchlist information (tv and movies) and automatically downloads them."
  - Continue to fill out other personal information
5. Submit the form.

If all goes well, you should be brought back to the API page on your account. Pete needs the "API Key (v3 auth)" later during configuration, so keep that handy.

### Pushbullet

This step is **optional**. Pete can also tell you when it starts and finishes downloading something. This is handled through [Pushbullet](https://www.pushbullet.com/). Set up an account on Pushbullet, download the app or use a web browser extension. If you don't want to be notified when something is started or finished, ignore this step.

After account creation, go to Settings > Account and Create Access Token. Keep this token handy when we're configuring Pete.

### Transmission

If you're using OSMC, then install [Transmission](https://transmissionbt.com/) through its app store. Otherwise, install it by whatever means is appropriate for your OS. The important takeaway for this step is to make sure Remote RPC is on and you know the url (likely localhost), the username, and password for the remote user to give to Pete during configuration.


### Node

Now you need to install Node. If you're using OSMC on a Pi, installing Node depends on which Pi version you're using because of the different architecture. There are a couple ways to get Node installed. I followed the steps written by [Conall Laverty](https://blog.wia.io/installing-node-js-v4-0-0-on-a-raspberry-pi), which have been summarized below.

At the time of writing this, Node 6.8 is the latest. Version come out rather quickly so it won't take much time for this to become outdated. Pete will likely work with Node 4+ (untested, but an assumption), but was developed using version 6.4, so it's wise to use something in the 6's.

Raspberry Pi Model A, B, B+ and Compute Module:
```
wget https://nodejs.org/dist/v6.8.1/node-v6.8.1-linux-armv6l.tar.gz
tar -xvf node-v6.8.1-linux-armv6l.tar.gz
cd node-v6.8.1-linux-armv6l
```

Raspberry Pi 2 and 3 Model B
```
wget https://nodejs.org/dist/v6.8.1/node-v6.8.1-linux-armv7l.tar.gz
tar -xvf node-v6.8.1-linux-armv7l.tar.gz
cd node-v6.8.1-linux-armv7l
```

Copy to /usr/local
```
sudo cp -R * /usr/local/
```

To check Node.js is properly install and you have the right version, run the command `node -v`

## Installation and Configuration

After finishing all the preparation steps, install Pete with npm: `npm i -g pete`. This opens up using the `pete` command to manually run commands.

After npm finishes installation, Pete automatically launches its Configuration script where you provide various settings.

You can also clone the [repository](https://github.com/grantholle/pete) and run it locally (i.e. not using the `pete` command, just plain `node xxxx.js` or sometimes just running the script `./xxxx.js`). This requires that you have git installed, which I won't cover here, as there are also a ton of those guides already in existence.

You can put it anywhere, but I'd suggest putting it in your home directory.

```
cd ~
git clone https://github.com/grantholle/pete.git
cd pete
npm i
```

As mentioned above, if you installed it globally through npm the configuration script begins automatically after installation. If you followed the steps of cloning Pete, simply run `node install` (assuming you're already in the `pete` directory).

The questions and steps should be self explanatory, so I won't cover each question. As mentioned in the preparation steps above having your TMdb API key and (optionally) your Pushbullet access token ready is helpful.

Once configuration is finished, it will prompt you to set up your TV show watchlist. This step isn't necessary, but if you plan on getting episodes of seasons other than the most recent, then you might want to take the time to set up your watchlist TV shows.

All the configuration settings are stored in a json file in `~/.config/pete/config.json`. Feel free to either run `pete install` or `node install` in Pete's root directory. The settings are laid out as follows:

```
{
  "tmdb": {
    "apiKey": "" // TMdb API key
  },
  "pushbullet": {
    "token": "", // Pushbullet token
    "notifyOnFinish": true, // (boolean) Receive a notification when a download finishes
    "notifyOnStart": true // (boolean) Receive a notification when an item begins to download
  },
  "transmission": {
    "user": "osmc", // The Transmission RPC username
    "pw": "osmc", // The Transmission RPC password
    "host": "localhost", // The Transmission RPC host (usually localhost)
    "port": "9091" // The Transmission RPC port (usually 9091)
  },
  "dir": {
    "movies": "", // The base movie directory path
    "tv": "" // The base TV Show directory path
  },
  "movies": {
    "quality": "1080p", // Either 1080p or 720p
    "useYify": true, // (boolean) Whether to use YIFY movies (quality is sometimes a little... "IFY" *pdum dum tsh*)
    "fallback": true // (boolean) If the desired quality cannot be found, look for the alternative quality
  }
}
```

Each show's configuration is stored in a sqlite database at `~/.config/pete/shows.db`. Feel free to explore and/or modify the show settings manually, or use the TV setup script detailed below.

## Usage

The following commands can be run using the global module `pete` if you installed it with `npm i -g pete` or if you cloned the directory, run them inside the pete's root directory.

- `pete install` | `node install` - Goes through the installation process. If installation has already taken place, it will ask if you'd like to overwrite your settings.
- `pete tv-setup` | `node lib/tv-setup` - Goes through each show in your TMdb TV watchlist and sets up the season and episode you wish to start downloading and the desired quality (720p or HDTV). You can run this at any time to overwrite or skip shows you don't need to overwrite.
- `pete tv` - `node lib/tv` - Goes through each show in your TMdb TV watchlist and downloads the next appropriate episode(s) according to `tv-setup`, or if there is no existing configuration, the default setting is to start at the most recent season's episode 1 with HDTV quality.
- `pete movies` - `node lib/movies` - Goes through each movie in your TMdb Movie watchlist and adds it to Transmission. After adding it, it's removed from your watchlist.

If you've installed Pete on a Linux platform (such as OSMC), it will have prompted you to add a service file. This adds the ability to start Pete as a daemon on startup. It will check your TV show watchlist every hour and your movie watchlist every minute.

After installing the service file, reload the daemon with `sudo systemctl daemon-reload`, then start Pete's daemon with `sudo systemctl start pete`. It should automatically start on boot.

If you're not using Linux or you wish to not use the daemon, there are lots of alternatives to run commands at certain intervals. Feel free to use what you're comfortable with.

## Thanks

Like most open source projects, Pete stands on the shoulders of other open source projects:
- [OSMC](https://osmc.tv/)
- [moviedb](https://github.com/impronunciable/moviedb)
- [eztv-api-pt](https://github.com/ChrisAlderson/eztv-api-pt)
- [transmision](https://github.com/FLYBYME/node-transmission)
- [yify-search](https://github.com/davidyen1124/yify-search)
- [winston](https://github.com/winstonjs/winston)
- [prompt](https://github.com/flatiron/prompt)
- [pushbullet](https://github.com/alexwhitman/node-pushbullet-api)
- [moment](https://github.com/moment/moment)

## License

[MIT](https://opensource.org/licenses/MIT)
