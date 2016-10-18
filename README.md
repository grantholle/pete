# Pete

Automatically download TV shows and movies using [themoviedb.org](https://www.themoviedb.org/ "TMdb") watchlists and Transmission.

This was made as sort of an opinionated alternative to Flexget automatically fetching TV shows and movies. Flexget is amazing and does so many things, but for the life of me could not get it configured to work well. So I made this instead.

Pete has been built to be run with [OSMC](https://osmc.tv/) on a Raspberry Pi (because that's what I'm using), but will run with anything that has Node and Transmission installed (theoretically). It can be configured to run automatically in the background or you can run in manually by using a few handy commands.

## Installation

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
  - Summary: whatever you want, but it a minimum character validation, so something like: "Pulls my watchlist information (tv and movies) and automatically downloads them."
  - Continue to fill out other personal information
5. Submit the form.

If all goes well, you should be brought back to the API page on your account. Pete needs the "API Key (v3 auth)" later during configuration, so keep that handy.

### Pushbullet

This step is **optional**. Pete can also tell you when it starts and finishes downloading something. This is handled through [Pushbullet](https://www.pushbullet.com/). Set up an account on Pushbullet, download the app or use a web browser extension. If you don't want to be notified when something is started or finished, ignore this step.

After account creation, go to Settings > Account and Create Access Token. Keep this token handy when we're configuring Pete.

### Transmission

If you're using OSMC, then install [Transmission](https://transmissionbt.com/) through its app store. Otherwise, install it by whatever means is appropriate for your OS. The important takeaway for this step is to make sure Remote RPC is on and you know the url (likely localhost), the username, and password for the remote user to give to Pete during configuration.


### Node

Now you need to install Node. If you're using OSMC on a Pi, installing Node depends on which Pi version you're using because of the different architecture.

I followed the steps written by [Conall Laverty](https://blog.wia.io/installing-node-js-v4-0-0-on-a-raspberry-pi), which have been summarized below:

Download Node.js source Raspberry Pi Model A, B, B+ and Compute Module:

```bash
wget https://nodejs.org/dist/v4.0.0/node-v4.0.0-linux-armv6l.tar.gz
tar -xvf node-v4.0.0-linux-armv6l.tar.gz
cd node-v4.0.0-linux-armv6l
```

Raspberry Pi 2 Model B

```bash
wget https://nodejs.org/dist/v4.0.0/node-v4.0.0-linux-armv7l.tar.gz
tar -xvf node-v4.0.0-linux-armv7l.tar.gz
cd node-v4.0.0-linux-armv7l
```

Copy to /usr/local

```bash
sudo cp -R * /usr/local/
```

To check Node.js is properly install and you have the right version, run the command `node -v`


After getting Node installed
