import {Client} from 'discord.js';
import {logger} from '../../../logger';
import {PurgeQueueItem} from '../../../models/PurgeQueueItem';
import {Server, ServerInterface} from '../../../models/Server';
import {isChannelWithGuild} from '../../../utility/discord';
import * as timer from './timer';

export async function init(client: Client) {
	client.on('message', async message => {
		const channel = message.channel;

		if (!isChannelWithGuild(channel))
			return;

		let server: ServerInterface;

		try {
			server = await Server.findOne({
				guildId: channel.guild.id,
			}).exec();
		} catch (error) {
			logger.error('Could not load guild data from database; reason: ' + error);

			await message.channel.send('Something went wrong, please try again later.');

			return;
		}

		if (!server)
			return;

		const purge = server.purgeChannels.find(item => item.target === channel.id);

		if (!purge)
			return;

		const item = new PurgeQueueItem({
			guild: server.guildId,
			channel: channel.id,
			message: message.id,
			expiration: new Date(Date.now() + purge.maxAge),
		});

		await item.save();
	});

	timer.start(client);
}
