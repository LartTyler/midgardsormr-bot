import {Client, Message} from 'discord.js';
import * as commands from './command';
import {ArgInput} from './command';
import {logger} from './logger';
import {ServerInterface} from './models/Server';
import * as modules from './module';
import * as mongoose from './mongoose';

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

const client = new Client();

// Client startup is delayed for 5 seconds to prevent login spam if the program needs to reboot early on (usually only
// an issue for development environments).
client.setTimeout(() => {
	client.login(process.env.DISCORD_APP_TOKEN)
		.then(() => {
			logger.info('Bot logged in to Discord servers');

			commands.init(client).catch(error => {
				logger.error('Could not initialize commands; reason: ' + error);

				process.exit(1);
			});

			modules.init(client).catch(error => {
				logger.error('Could not initialize modules; reason: ' + error);

				process.exit(1);
			});
		})
		.catch(error => {
			logger.error('Could not log in to Discord servers; reason: ' + error);

			process.exit(1);
		});
}, 5_000);

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
