import {Client, Guild, GuildMember, Message, NewsChannel, TextChannel} from 'discord.js';
import * as fs from 'fs';
import path from 'path';
import {parseArgsInput} from '../index';
import {logger} from '../logger';
import {Server, ServerInterface} from '../models/Server';
import {isChannelWithGuild} from '../utility/discord';
import {interpolate} from '../utility/string';
import {getUnrecognizedCommandMessage} from './messages';

export class ArgInput {
	protected index = 0;

	public constructor(
		public readonly input: string[],
	) {
	}

	/**
	 * Returns the current position in the argument list.
	 */
	public get position() {
		return this.index;
	}

	/**
	 * Returns the length of the argument list.
	 */
	public get length() {
		return this.input.length;
	}

	/**
	 * Returns the number of elements remaining the argument list, including the current argument.
	 */
	public get remaining() {
		return this.length - this.position;
	}

	/**
	 * Returns the value at the current position in the argument list, then advances the position to the next element.
	 */
	public next() {
		return this.input[this.index++];
	}

	/**
	 * Advances the position to the next element, then returns the value at the new position in the argument list.
	 */
	public skip() {
		return this.input[++this.index];
	}

	/**
	 * Returns the value at the current position in the argument list. Does not change which position the argument list
	 * is currently at.
	 */
	public get current() {
		return this.input[this.index];
	}

	public get empty() {
		return this.remaining < 0 || this.current.length === 0;
	}
}

export class CommandContext {
	public readonly guild: Guild;
	public readonly sender: GuildMember;

	public constructor(
		public readonly message: Message,
		public readonly channel: TextChannel | NewsChannel,
		public readonly server: ServerInterface,
	) {
		this.guild = channel.guild;
		this.sender = message.member!;
	}
}

export interface Command {
	/**
	 * Returns an array of keywords that should cause this command to be executed.
	 *
	 * The first item in this array should be the primary keyword, and any after are used as aliases.
	 */
	getKeywords(): string[];

	/**
	 * Returns one or more usage strings that should define the arguments this command accepts.
	 *
	 * For example, let's say you have a command that sends "Hello, <user>!" to a user, which accepts an optional
	 * message to use in place of the default. The usage string for that might look like `greet @user [message]`.
	 */
	getUsage(): string[];

	/**
	 * Returns a brief summary of what the command does. This should not be longer than a few sentences.
	 */
	getSummary(): string;

	/**
	 * A verbose explanation of what the command does or how it works.
	 */
	getHelpText(): string;

	/**
	 * Executes the command. Most implementations should implement this method using async-await.
	 *
	 * @param args
	 * @param context
	 */
	execute(args: ArgInput, context: CommandContext): Promise<void>;
}

export class Commands {
	public readonly commands: Command[] = [];
	protected keywords: { [key: string]: Command } = {};
	protected helpCommand: Command | null = null;

	public add(command: Command) {
		if (this.commands.indexOf(command) !== -1)
			return;

		this.commands.push(command);

		for (const keyword of command.getKeywords())
			this.keywords[keyword] = command;
	}

	public find(keyword: string) {
		return this.keywords[keyword] ?? null;
	}

	public getHelpCommand() {
		return this.helpCommand;
	}

	public setHelpCommand(command: Command) {
		this.helpCommand = command;
	}

	public get length() {
		return this.commands.length;
	}
}

export const registeredCommands = new Commands();

type CommandModule = {
	[key: string]: any;
	register: (commands: Commands) => void;
};

export async function init(client: Client) {
	for (const item of fs.readdirSync(path.join(__dirname, 'commands'))) {
		const module: CommandModule = await import('./commands/' + path.parse(item).name);

		if (typeof module.register !== 'function')
			throw new Error('Could not register command module in ' + item);

		module.register(registeredCommands);
	}

	logger.info(`Registered ${registeredCommands.length} command(s)`);

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

		logger.debug('Parsed input args', {
			prefix,
			args,
		});

		await execute(args, new CommandContext(message, channel, server));
	});
}

async function execute(args: ArgInput, context: CommandContext): Promise<void> {
	const keyword = args.next();

	if (!keyword)
		return;

	const command = registeredCommands.find(keyword);

	if (!command) {
		await context.message.reply(replaceCommandPrefixPlaceholder([
			getUnrecognizedCommandMessage(),
		], context.server.prefix));

		return;
	}

	return command.execute(args, context);
}

export function replaceCommandPrefixPlaceholder(strings: string[], prefix: string): string[] {
	for (let i = 0; i < strings.length; i++) {
		strings[i] = interpolate(strings[i], {
			prefix,
		});
	}

	return strings;
}
