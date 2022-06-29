`Warning: This version of the backend is unfinished.`

# Cookie Clicker Online Backend
Cookie Clicker Online is a mod for Cookie Clicker with extended mod support and co-operative play. The backend is used for clans, servers, and logging in through Discord. You can change the current backend in Cookie Clicker Online's settings.

`Major Warning: Never log into a custom backend unless you trust the owner.`

# Installation
## From the latest GitHub release.
Go to the [releases page](https://github.com/Red-Game-Studio/CookieClickerOnline-Backend/releases/) and download the `backend.zip` file. Extract the archive and open the extracted contents.
### Linux
If you're on Linux, open a terminal and run `sudo chmod +x ./backend.linux` to allow execution. To run the program, type `./backend.linux`. Press CTRL+C to close the program.

### Windows (without Git Bash)
To run the program, double click the `backend.cmd` file. Press CTRL+C to close the program.

### Windows (with Git Bash)
To run the program, open Git Bash and type `./backend.win`

## Compiling from source
### Requirements
You must have the following programs installed on your computer before you can compile and run this app:
- Node.js ([Download](https://nodejs.org/en/download))
- Git ([Download](https://git-scm.com/downloads))

### Instructions
Type the following commands into your command line to compile the source code:
```bash
git clone https://github.com/Red-Game-Studio/CookieClickerOnline-Backend.git cco_backend
cd cco_backend
npm install
```

### Running
To run the backend, type the following command into your command line:
```sh
npm start
```

## On Glitch/Heroku
Click the button below to deploy to Glitch:


[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/import/github/glitchdotcom/starter-discord)


To deploy to Heroku, click the button below:


[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/Red-Game-Studio/CookieClickerOnline-Backend/tree/main/)