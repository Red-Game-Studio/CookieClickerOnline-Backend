import * as ws from "ws";
import * as axios from "axios"
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import * as discord from "./discord_auth";
import type { DiscordAccount, DiscordUser } from "./discord_types";
import type { User, Message, Server } from "./index_types";

// @ts-ignore: parseInt should not raise an error when given undefined.
const PORT: number = 3000 || parseInt(process.env.PORT);

// Create Server
const server: ws.Server = new ws.Server({ port: PORT });

// Base Code
const CCO: EventEmitter = new EventEmitter();

const events: string[] = [
	"join",
	"leave",
	"host",
	"matchsearch",
	"cancelmatchsearch",
	"sendGameData",
];

const players: Map<string, User> = new Map()

server.on("connection", (socket: ws.WebSocket) => {
	let authentication: DiscordAccount | undefined; // null = Guest
	let sessionID: string = randomUUID();
	let discordUser: DiscordUser | undefined;

	let user: User = { uuid: sessionID };

	players.set(sessionID, user);

	console.log(`LOG: ${sessionID} connected.`);

	socket.on("message", (_message: Buffer) => {
		let message: Message = JSON.parse(_message.toString());

		switch (message.type) {
			case "login":
				authentication = message.body;
				if (authentication) {
					discord.getUserDetails(authentication).then(res => {
						if (res) {
							discordUser = res;
							user.discord = discordUser;
							CCO.emit("login", authentication, sessionID);

							let message = { type: "success" };
							socket.send(JSON.stringify(message));
						} else {
							CCO.emit("loginError", authentication, sessionID);
							authentication = undefined;
							discordUser = undefined;
							user.discord = undefined;

							let message = { type: "loginError" };
							socket.send(JSON.stringify(message));
						}
						players.set(sessionID, user);
					});
				}
				break;
			case "logout":
				CCO.emit("logout", authentication, sessionID);
				authentication = undefined;
				discordUser = undefined;
				user.discord = undefined;
				players.set(sessionID, user);

				let _message = { type: "success" };
				socket.send(JSON.stringify(_message));
				break;
			default:
				if (events.includes(message.type)) CCO.emit(message.type, message.body, authentication, sessionID, socket);
				else console.log(`LOG: ${sessionID} attempted an invalid message of type "${message.type}" with body "${message.body}".`);
		}
	});

	socket.on("close", (): void => {
		console.log(`LOG: ${sessionID} disconnected.`);
		players.delete(sessionID);
		CCO.emit("exit", authentication, sessionID);
	});
});

CCO.on("error", (err: string, code: number | string): void => {
	console.log(`ERROR: ${err} (Code ${code})`);
})

// Third-Party Server Code

const thirdPartyServers: Map<string, Server> = new Map();
const playerStatus: Map<string, string | null> = new Map();

CCO.on("join", (gid: string, auth: DiscordAccount | undefined, sid: string, socket: ws.WebSocket) => {
	let server = thirdPartyServers.get(gid); // Get

	if (!server || gid.startsWith("matchmaking_")) {
		CCO.emit("error", `${sid} attempted to connect to an invalid server.`, "CLIENT_INVALID_REQUEST");
		return;
	}

	let user: User | undefined = players.get(sid);
	if (!user) return;

	if (!server.players.has(sid)) {
		server.players.set(sid, user);
	}

	thirdPartyServers.set(gid, server); // Set

	let message = { type: "success" };
	socket.send(JSON.stringify(message));
});

CCO.on("leave", (body: any, auth: DiscordAccount, sid: string, socket: ws.WebSocket | undefined) => {
	let gid = playerStatus.get(sid);
	if (!gid) return;

	let server = thirdPartyServers.get(gid); // Get
	if (!server) return;

	if (!server.players.has(sid)) return;

	server.players.delete(sid);

	thirdPartyServers.set(gid, server); // Set

	playerStatus.set(gid, null);

	if (socket) {
		let message = { type: "success" };
		socket.send(JSON.stringify(message));
	}
});

// If socket closes
CCO.on("exit", (auth: DiscordAccount, sid: string) => {
	CCO.emit("leave", undefined, auth, sid, undefined);
})