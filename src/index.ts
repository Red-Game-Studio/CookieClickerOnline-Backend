import * as ws from "ws";
import * as axios from "axios"
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import * as discord from "./discord_auth";
import type { DiscordAccount, DiscordUser } from "./discord_types";
import type { User, Message } from "./index_types";

// @ts-ignore: parseInt should not raise an error when given undefined.
const PORT: number = 3000 || parseInt(process.env.PORT);

// Create Server
const server: ws.Server = new ws.Server({ port: PORT });

// Base Code (login and events)
const CCO: EventEmitter = new EventEmitter();

const allowedEvents: string[] = [
	"join",
	"leave",
	"host",
];

const players = new Map();

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
						} else {
							CCO.emit("loginError", authentication, sessionID);
							authentication = undefined;
							discordUser = undefined;
							user.discord = undefined;
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
				break;
			default:
				if (allowedEvents.includes(message.type)) CCO.emit(message.type, authentication, sessionID);
				else console.log(`LOG: ${sessionID} attempted an invalid message of type "${message.type}" with body "${message.body}".`);
		}
	});

	socket.on("close", () => {
		console.log(`LOG: ${sessionID} disconnected.`);
	});
});
