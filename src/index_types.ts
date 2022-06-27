import { DiscordUser } from "./discord_types";
import { WebSocket } from "ws";

export interface Message {
	type: string; // Message type
	body?: any; // Message body
}

export interface User {
	uuid: string;
	discord?: DiscordUser; // Discord username, hash, avatar and user id.
	partyHost?: boolean;
	partyUUID?: string;
}

export interface Server {
	name: string;
	uuid: string;
	modded?: boolean;
	players: Map<string, User>;
	host: WebSocket;
}

export interface Party {
	players: Map<string, User>;
	uuid: string;
	host: WebSocket;
}