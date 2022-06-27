import * as ws from "ws";
import * as axios from "axios"
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import * as discord from "./discord_auth";
import type { DiscordAccount, DiscordUser } from "./discord_types";
import type { User, Message, Server, Party } from "./index_types";

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
	"deleteServer",
	"joinParty",
	"leaveParty",
	"ping"
];

const players: Map<string, User> = new Map();
const sockets: Map<string, ws.WebSocket> = new Map();

server.on("connection", (socket: ws.WebSocket) => {
	let authentication: DiscordAccount | undefined; // null = Guest
	let sessionID: string = randomUUID();
	let discordUser: DiscordUser | undefined;

	let user: User = {
		uuid: sessionID,
		partyHost: true,
		partyUUID: randomUUID()
	};

	players.set(sessionID, user);
	sockets.set(sessionID, socket);

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
		sockets.delete(sessionID);
		CCO.emit("exit", authentication, sessionID);
	});
});

CCO.on("error", (err: string, code: number | string): void => {
	console.log(`ERROR: ${err} (Code ${code})`);
});

// Third-Party Server Code

const thirdPartyServers: Map<string, Server> = new Map();
const playerStatus: Map<string, string> = new Map();

CCO.on("join", (gid: string, auth: DiscordAccount | undefined, sid: string, socket: ws.WebSocket) => {
	let server = thirdPartyServers.get(gid); // Get

	if (!server || gid.startsWith("matchmaking_")) {
		CCO.emit("error", `${sid} attempted to connect to an invalid server.`, "CLIENT_INVALID_REQUEST");
		return;
	}

	let user: User | undefined = players.get(sid);
	if (!user) return;

	if (!server.players.has(sid)) return;

	let s = server.host;
	if (s) s.send(JSON.stringify(
		{
			type: "playerJoin",
			body: user
		}
	));

	server.players.set(sid, user);

	thirdPartyServers.set(gid, server); // Set

	let message = { type: "success" };
	socket.send(JSON.stringify(message));
});

CCO.on("leave", (body: any, auth: DiscordAccount, sid: string, socket: ws.WebSocket | undefined) => {
	let gid = playerStatus.get(sid);
	if (!gid) return;

	let server = thirdPartyServers.get(gid); // Get
	if (!server) return;

	let user = server.players.get(sid);
	if (!user) return;

	// Delete all data.
	server.players.delete(sid);
	playerStatus.delete(sid);

	thirdPartyServers.set(gid, server); // Set

	if (socket) {
		let message = { type: "success" };
		socket.send(JSON.stringify(message));

		let s = server.host;
		if (s) s.send(JSON.stringify(
			{
				type: "playerLeave",
				body: user
			}
		));
	}
});

// If the socket closes, leave the server and delete all data associated with the player's session.
CCO.on("exit", (auth: DiscordAccount, sid: string) => {
	CCO.emit("leave", undefined, auth, sid, undefined); // Leave the server.
});

// Parties

const parties: Map<string, Party> = new Map();

CCO.on("joinParty", (pid: string, auth: DiscordAccount, sid: string, socket: ws.WebSocket) => {
	let party = parties.get(pid);
	if (!party) return;

	// Stop the function if player is already in the party or if the owner is joining their own party.
	if (party.players.has(sid)) return;
	if (party.host == socket) return;

	// Remove party host permission
	let player = players.get(sid);
	if (!player) return;

	player.partyHost = false;
	player.partyUUID = undefined;

	players.set(sid, player);

	// Add to party
	party.players.set(sid, player);

	// Send information to everyone in the party
	party.players.forEach((usr: User, id: string) => {
		if (id != sid) {
			let socket = sockets.get(id);
			if (socket) socket.send(JSON.stringify(
				{
					type: "partyJoin",
					body: player
				}
			))
		}
	});

	// Send success message
	let message = { type: "success" };
	socket.send(JSON.stringify(message));
});