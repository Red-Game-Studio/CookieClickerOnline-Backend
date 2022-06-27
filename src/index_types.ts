import { DiscordUser } from "./discord_types";

export interface Message {
	type: string; // Message type
	body?: any; // Message body
}

export interface User {
	uuid: string; // Shown on screen if you're a guest. Example: Guest#b390b50a
	discord?: DiscordUser; // Discord account details (username, hash, id, your email address). Some details are displayed on screen. Example: RedBigz#1337
}

export interface Server {
	name: string;
	uuid: string;
	modded?: boolean;
	players: Map<string, User>;
}