import {Client, TextChannel} from 'discord.js';
import {QueryCursor} from 'mongoose';
import {logger} from '../../../logger';
import {PurgeQueueItem, PurgeQueueItemInterface} from '../../../models/PurgeQueueItem';
import {Server, ServerInterface} from '../../../models/Server';

export function start(client: Client) {
	logger.info('Starting channel purge timer');

	let delay = 300_000; // default 5 minutes

	if (process.env.MIDDY_CHANNEL_PURGE_LOOP_DELAY) {
		const input = parseInt(process.env.MIDDY_CHANNEL_PURGE_LOOP_DELAY, 10);

		if (!isNaN(input))
			delay = input;
		else {
			logger.warn(
				'Value of MIDDY_CHANNEL_PURGE_LOOP_DELAY could not be parsed to an integer, defaulting to ' + delay,
			);
		}
	}

	logger.debug('Channel purge delay set to ' + delay + 'ms');

	loop(client, delay);
}

let sequentialErrorCount = 0;

function loop(client: Client, delay: number) {
	tick(client)
		.then(() => {
			sequentialErrorCount = 0;
		})
		.catch(error => {
			logger.error(`Caught error while running purge timer loop (count: ${++sequentialErrorCount}); ${error}`);
			logger.info('Attempting to restart purge timer loop');
		})
		.finally(() => {
			if (sequentialErrorCount > 10) {
				logger.error('Sequential error count for purge timer loop >= 10, timer will not be restarted.');

				return;
			}

			client.setTimeout(() => {
				loop(client, delay)
			}, delay);
		});
}

async function tick(client: Client) {
	logger.debug('Running channel purge loop');

	const cursor: QueryCursor<ServerInterface> = Server.find({
		$where: 'this.purgeChannels.length > 0',
	}).cursor();

	await cursor.eachAsync(async server => {
		const guild = await client.guilds.fetch(server.guildId);

		for (const purgeChannel of server.purgeChannels) {
			const channel = guild.channels.resolve(purgeChannel.target);

			if (!channel || !(channel instanceof TextChannel))
				continue;

			const items: PurgeQueueItemInterface[] = await PurgeQueueItem.find({
				guild: guild.id,
				channel: channel.id,
				expiration: {
					$lte: new Date(),
				},
			}).exec();

			if (items.length === 0)
				continue;

			await channel.bulkDelete(items.map(item => item.message));

			for (const item of items)
				await item.remove();

			logger.debug(`Purged ${items.length} items from #${channel.name} in ${channel.guild.name}`);
		}
	});
}
