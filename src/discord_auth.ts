import type { DiscordAccount, DiscordUser } from "./discord_types";
import * as axios from "axios";

function sanitiseUser(user: DiscordUser): DiscordUser {
	// Removes sensitive data.

	let newUser: DiscordUser = {
		id: user.id,
		username: user.username,
		discriminator: user.discriminator,
		avatar: user.avatar
	};

	return newUser
}

export async function getUserDetails(account: DiscordAccount): Promise<DiscordUser | undefined> {
	if (account.type && account.token) { // Checking if account type and token exist
		// @ts-ignore
		axios.get("https://discord.com/api/users/@me", { // Discord API: Get a user's details.
			headers: {
				authorization: `${account.type} ${account.token}`
			}
		})

			// @ts-ignore
			.then(message => {
				return sanitiseUser(JSON.parse(message));
			})

			// @ts-ignore
			.catch(resp => {
				return undefined;
			});
		
	} else {
		return undefined;
	}
}