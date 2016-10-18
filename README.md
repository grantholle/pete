# Pete

Automatically download TV shows and movies using [themoviedb.org](https://www.themoviedb.org/ "TMdb") watchlists and Transmission.

This was made as sort of an opinionated alternative to Flexget automatically fetching TV shows and movies. Flexget is amazing and does so many things, but for the life of me could not get it configured to work well. So I made this instead.

Pete has been built to be run with [OSMC](https://osmc.tv/) on a Raspberry Pi (because that's what I'm using), but will run with anything that has Node and Transmission installed (theoretically). It can be configured to run automatically in the background or you can run in manually by using a few handy commands.

## Installation

This guide makes some assumptions:
1. If you're intending to use a Pi with something OSMC, you're already installed OSMC and have it going. Installing OSMC is super easy and there are a ton of guides to assist you doing this.
2. You have SSH access (for something like OSMC) and/or you know how to use a console

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
```bash
wget https://nodejs.org/dist/latest-v6.x/node-v6.8.1-linux-armv6l.tar.gz
tar -xvf node-v6.8.1-linux-armv6l.tar.gz
cd node-v6.8.1-linux-armv6l
```

Raspberry Pi 2 and 3 Model B
```bash
wget https://nodejs.org/dist/latest-v6.x/node-v6.8.1-linux-armv7l.tar.gz
tar -xvf node-v6.8.1-linux-armv7l.tar.gz
cd node-v6.8.1-linux-armv7l
```

Copy to /usr/local
```bash
sudo cp -R * /usr/local/
```

To check Node.js is properly install and you have the right version, run the command `node -v`

### Pete

After finishing all these steps, install it with npm: `npm i -g pete`. This opens up using the `pete` command to manually run commands.

You can also clone the [repository](https://github.com/grantholle/pete) and run it locally (i.e. not using the `pete` command, just plain `node xxxx.js`). This requires that you have git installed, which I won't cover here, as there are also a ton of those guides already in existence.
