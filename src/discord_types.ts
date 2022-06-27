export interface DiscordAccount {
	token: string; // OAuth Token
	type: string; // Bearer or Bot
}

export interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string;
	bot?: boolean;
	system?: boolean;
	mfa_enabled?: boolean;
	banner?: string;
	accent_color?: number;
	locale?: string;
	verified?: boolean;
	email?: string;
	flags: number;
	premium_type?: number;
	public_flags: number;
}