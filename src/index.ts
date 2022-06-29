import * as ws from "ws";

// @ts-ignore
import * as axios from "axios";

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import * as discord from "./discord_auth";

// @ts-ignore
import express from "express";

import type { DiscordAccount, DiscordUser } from "./discord_types";
import type { User, Message, Server, Party } from "./index_types";

// @ts-ignore: parseInt should not raise an error when given undefined.
const PORT: number = 3000 || parseInt(process.env.PORT);

// Create Server
const app = express();

const wsServer: ws.Server = new ws.Server({
	noServer: true,
	path: "/socket"
});

// @ts-ignore
app.on("upgrade", (req: any, sock: any, head: any) => {
	wsServer.handleUpgrade(req, sock, head, (socket: ws.WebSocket) => {
		wsServer.emit("connection", socket, req);
	});
});

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

// Websocket Code
{
	wsServer.on("connection", (socket: ws.WebSocket) => {
		let authentication: DiscordAccount | undefined; // null = Guest
		let sessionID: string = randomUUID();
		let discordUser: DiscordUser | undefined;

		let user: User = {
			uuid: sessionID
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
}

// Third-Party Servers
{
	const thirdPartyServers: Map<string, Server> = new Map();
	const playerStatus: Map<string, string> = new Map();

	CCO.on("join", (gid: string, auth: DiscordAccount | undefined, sid: string, socket: ws.WebSocket) => {
		let server = thirdPartyServers.get(gid); // Get

		if (!server || gid.startsWith("matchmaking_")) {
			CCO.emit("error", `${sid} attempted to connect to an invalid server.`, "CLIENT_INVALID_REQUEST");
			return;
		}

		let user: User | undefined = players.get(sid);
		if (!user) {
			if (socket) socket.send(JSON.stringify(
				{
					type: "error",
					body: "User does not exist."
				}
			));
			return;
		}

		if (server.players.has(sid)) {
			if (socket) socket.send(JSON.stringify(
				{
					type: "error",
					body: "User is already playing on the specified server."
				}
			));
			return;
		}

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
		if (!gid) {
			if (socket) socket.send(JSON.stringify(
				{
					type: "error",
					body: "User is not currently in a game/match."
				}
			));
			return;
		}

		let server = thirdPartyServers.get(gid); // Get
		if (!server) {
			if (socket) socket.send(JSON.stringify(
				{
					type: "error",
					body: "Server does not exist."
				}
			));
			return;
		};

		let user = server.players.get(sid);
		if (!user) {
			if (socket) socket.send(JSON.stringify(
				{
					type: "error",
					body: "User is not currently in a game/match."
				}
			));
			return;
		}

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
}

// Parties
{
	const parties: Map<string, Party> = new Map();

	CCO.on("login", (auth: DiscordAccount, sid: string) => {

	});

	// Party Joining
	CCO.on("joinParty", (pid: string, auth: DiscordAccount, sid: string, socket: ws.WebSocket) => {
		let party = parties.get(pid);
		if (!party) {
			if (socket) socket.send(JSON.stringify(
				{
					type: "error",
					body: "Party does not exist."
				}
			));
			return;
		}

		// Stop the function if player is already in the party..
		if (party.players.has(sid)) {
			if (socket) socket.send(JSON.stringify(
				{
					type: "error",
					body: "User is already in the party."
				}
			));
			return;
		}
		if (party.host == socket) {
			if (socket) socket.send(JSON.stringify(
				{
					type: "error",
					body: "User is already in the party."
				}
			));
			return;
		};

		// Stop the function if the user does not exist (just in case)
		let player = players.get(sid);
		if (!player) return;

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
}

// Ping
{
	CCO.on("ping", (pid: string, auth: DiscordAccount, sid: string, socket: ws.WebSocket) => {
		socket.send(JSON.stringify(
			{
				"type": "ping"
			}
		));
	});
}

// HTTP API
{
	app.get("/", (req: any, res: any) => {
		
	});
}

app.listen(PORT);