import {Client, Message, NewsChannel, TextChannel} from 'discord.js';
import * as commands from './command';
import {ArgInput, CommandContext} from './command';
import {logger} from './logger';
import {Server, ServerInterface} from './models/Server';
import * as mongoose from './mongoose';
import * as autoroleTimer from './timers/autorole';

if (!process.env.MONGO_URI) {
	logger.error('You must define a Mongo connection via the MONGO_URI environment variable');

	process.exit(1);
}

mongoose.connect(process.env.MONGO_URI).catch(() => {
	logger.error('Database connection failed, exiting');

	process.exit(1);
});

if (!process.env.DISCORD_APP_TOKEN) {
	logger.error('You must define a Discord app token via the DISCORD_APP_TOKEN environment variable');

	process.exit(1);
}

commands.init().catch(error => {
	logger.error('Could not initialize commands; reason: ' + error);

	process.exit(1);
});

const client = new Client();

client.on('message', async message => {
	const channel = message.channel;

	if (!isChannelWithGuild(channel)) {
		await channel.send('Sorry, I can only respond to commands sent from within a server.');

		return;
	} else if (message.author === client.user) // ignore messages sent by the bot user
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

	if (!server) {
		server = await new Server({
			guildId: channel.guild.id,
		}).save();
	}

	const [prefix, args] = parseArgsInput(server, message);

	if (prefix !== server.prefix || args.empty)
		return;

	await commands.execute(args, new CommandContext(message, channel, server));
});

client.login(process.env.DISCORD_APP_TOKEN)
	.then(() => {
		logger.info('Bot logged in to Discord servers');

		autoroleTimer.start(client);
	})
	.catch(error => {
		logger.error('Could not log in to Discord servers; reason: ' + error);

		process.exit(1);
	});

export function isChannelWithGuild(channel: any): channel is TextChannel | NewsChannel {
	return typeof channel === 'object' && 'guild' in channel;
}

export function parseArgsInput(server: ServerInterface, message: Message): [string, ArgInput] {
	if (!client.user)
		throw new Error('Bot has not fully started yet');

	let prefix = message.content.charAt(0);
	const args = new ArgInput(message.content.substring(1).split(/\s+/));

	if (prefix === '<' && args.current.charAt(0) === '@' && args.current.charAt(args.current.length - 1) === '>') {
		let mention = args.next().slice(1, -1);

		// An exclamation point immediately after the <@ portion of a mention indicates that the mention itself was
		// for a user's nickname. We don't care about that, so we just need to drop it.
		if (mention.charAt(0) === '!')
			mention = mention.substring(1);

		// If we were able to parse a mention out of the first position of the message that matches our bot's user, then
		// the command input should be parsed as if it started with the proper prefix.
		if (client.users.cache.get(mention) === client.user)
			prefix = server.prefix;
	}

	return [prefix, args];
}
