import {NewsChannel, TextChannel} from 'discord.js';

export enum MentionType {
	CHANNEL = 'channel',
	ROLE = 'role',
	USER = 'user',
	NONE = 'none',
}

/**
 * Mention parsing rules:
 * 		1) User AND role mentions both start with an '@'
 * 			1.1) User mentions MAY follow the '@' with an '!' if the user was mentioned by nickname (ex. <@123> or
 * 				 <@!123>)
 * 			1.2) Role mentions follow the '@' with an '&' (ex. <@&123>)
 * 		2) Channel mentions start with an '#' (ex. <#123>
 *
 * Type      Example(s)
 * ----      ----------
 * USER      <@123>, <@!123>
 * ROLE      <@&123>
 * CHANNEL   <#123>
 */
export function parseMention(input: string): [MentionType, string | undefined] {
	if (!input.startsWith('<') && !input.endsWith('>'))
		return [MentionType.NONE, undefined];

	let prefix = input.substring(1, 2);
	let id = input.slice(2, -1);

	if (prefix === '@') { // User and role mentions
		if (id.charAt(0) === '&') // Role mentions
			return [MentionType.ROLE, id.substring(1)];
		else { // User mentions
			if (id.charAt(0) === '!') // Users with nicknames have an extra char before the ID itself
				id = id.substring(1);

			return [MentionType.USER, id];
		}
	} else if (prefix === '#') // Channel mentions
		return [MentionType.CHANNEL, id];
	else
		throw new Error('Unrecognized mention prefix "' + prefix + '"');
}

export function isChannelWithGuild(channel: any): channel is TextChannel | NewsChannel {
	return typeof channel === 'object' && 'guild' in channel;
}

export const Emoji = {
	CHECKMARK: '✅',
};
