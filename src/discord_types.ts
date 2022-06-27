export interface DiscordAccount {
	token: string; // OAuth Token
	type: string; // Bearer or Bot
}

export interface DiscordUser {
	id: string; // Discord ID
	username: string; // Username
	discriminator: string; // Hash
	avatar: string; // Avatar ID
}