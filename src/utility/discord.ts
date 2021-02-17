export enum MentionType {
	CHANNEL = 'channel',
	ROLE = 'role',
	USER = 'user',
	NONE = 'none',
}

export function parseMention(input: string): [MentionType, string | undefined] {
	if (!input.startsWith('<@') && !input.endsWith('>'))
		return [MentionType.NONE, undefined];

	let id = input.slice(2, -1);

	if (id.charCodeAt(0) >= 48 && id.charCodeAt(0) <= 57)
		return [MentionType.USER, id];

	const prefix = id.charAt(0);
	id = id.substring(1);

	switch (prefix) {
		case '!':
			return [MentionType.USER, id];

		case '&':
			return [MentionType.ROLE, id];

		case '#':
			return [MentionType.CHANNEL, id];

		default:
			throw new Error('Unrecognized mention prefix "' + prefix + '"');
	}
}

export const Emoji = {
	CHECKMARK: '✅',
};
