import {Client, Guild, GuildMember} from 'discord.js';
import {QueryCursor} from 'mongoose';
import {logger} from '../logger';
import {AutoRoleAction, AutoRoleItemInterface} from '../models/AutoRoleItem';
import {Server, ServerInterface} from '../models/Server';

export function start(client: Client) {
	logger.info('Started auto role timer');

	let delay = 30_000;

	if (process.env.MIDDY_AUTO_ROLE_LOOP_DELAY) {
		const input = parseInt(process.env.MIDDY_AUTO_ROLE_LOOP_DELAY, 10);

		if (!isNaN(input))
			delay = input;
		else {
			logger.warn(
				'Value of MIDDY_AUTO_ROLE_LOOP_DELAY could not be parsed to an integer, defaulting to ' + delay,
			);
		}
	}

	loop(client, delay);
}

function loop(client: Client, delay: number) {
	client.setTimeout(async () => {
		const cursor: QueryCursor<ServerInterface> = Server.find({
			$where: 'this.autoRoleItems.length > 0',
		}).cursor();

		await cursor.eachAsync(async item => {
			const guild = await client.guilds.fetch(item.guildId);

			return tick(item, guild);
		});

		loop(client, delay);
	}, delay);
}

async function tick(server: ServerInterface, guild: Guild) {
	const members = await guild.members.fetch();

	for (const member of members.values()) {
		// No idea why this might be `null`, but since the docs say it's possible, it seems safest to check for it
		if (!member.joinedTimestamp)
			return;

		const age = Date.now() - member.joinedTimestamp;

		const invalidItems: Array<ServerInterface['autoRoleItems'][0]> = [];

		const add: AutoRoleItemInterface[] = [];
		const remove: AutoRoleItemInterface[] = [];

		for (const item of server.autoRoleItems) {
			if (age < item.delay)
				continue;

			const role = await guild.roles.fetch(item.role);

			// If a role has been deleted, queue it for removal so we don't process it after this member is done being
			// processed.
			if (!role) {
				invalidItems.push(item);

				continue;
			}

			if (item.action === AutoRoleAction.ADD)
				add.push(item);
			else
				remove.push(item);
		}

		if (add.length > 0) {
			await member.roles.add(add.map(item => item.role));

		if (remove.length > 0) {
			await member.roles.remove(remove.map(item => item.role));
	}
}

async function notify(items: AutoRoleItemInterface[], member: GuildMember) {

}
