import type { DiscordAccount, DiscordUser } from "./discord_types";
import * as axios from "axios";

export async function getUserDetails(account: DiscordAccount): Promise<DiscordUser | undefined> {
	if (account.type && account.token) {
		// @ts-ignore
		axios.get("https://discord.com/api/users/@me", {
			headers: {
				authorization: `${account.type} ${account.token}`
			}
		})

			// @ts-ignore
			.then(message => {
				return JSON.parse(message);
			})

			// @ts-ignore
			.catch(resp => {
				return undefined;
			});
		
	} else {
		return undefined;
	}
}