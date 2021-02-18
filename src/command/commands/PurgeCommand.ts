import {MessageEmbed, Snowflake, TextChannel} from 'discord.js';
import ms from 'ms';
import {DelayParseError, parseDelay} from '../../utility/command';
import {Emoji, MentionType, parseMention} from '../../utility/discord';
import {sections} from '../../utility/string';
import {ArgInput, Command, CommandContext, Commands, replaceCommandPrefixPlaceholder} from '../index';
import {getInvalidCommandInvocationMessage, getUnexpectedMentionType, getUnrecognizedCommandMessage} from '../messages';

class PurgeCommand implements Command {
	public getKeywords() {
		return ['purge', 'p'];
	}

	public getUsage() {
		return [
			'purge set <#channel> <delay>',
			'purge delete <#channel>',
			'purge list',
		];
	}

	public getSummary() {
		return 'Deletes messages from specified channels that are older than a certain threshold.';
	}

	public getHelpText() {
		return sections([
			{
				title: 'set',
				contents: `
					Adds a new channel to the purge watch list. Messages in this channel will be deleted once they pass
					a certain age (as defined by the \`<delay>\` argument). The \`<delay>\` argument must be a positive
					integer, followed by a unit of time (such as minutes, hours, etc.). 
				`,
			},
			{
				title: 'delete',
				contents: 'Removes a channel from the purge watch list.',
			},
			{
				title: 'list',
				contents: 'Lists all channels that are currently marked to be purged.',
			}
		]);
	}

	/**
	 * Invocations:
	 * 		!purge set <#channel> <delay>
	 * 		!purge delete <#channel>
	 * 		!purge list
	 */
	public async execute(args: ArgInput, context: CommandContext) {
		if (!context.sender.hasPermission('MANAGE_MESSAGES')) {
			await context.message.reply('You must have the `MANAGE_MESSAGES` permission to use this command.');

			return;
		}

		const subcommand = args.next();

		if (subcommand === 'list')
			return this.executeList(context);
		else if (subcommand !== 'set' && subcommand !== 'delete') {
			await context.message.reply(replaceCommandPrefixPlaceholder([
				getUnrecognizedCommandMessage(this.getKeywords()[0]),
			], context.server.prefix));

			return;
		} else if (args.remaining < 1) {
			await context.message.reply(getInvalidCommandInvocationMessage(context, this, subcommand));

			return;
		}

		const [channelMentionType, channelMentionId] = parseMention(args.next());

		if (channelMentionType !== MentionType.CHANNEL) {
			await context.message.reply(getUnexpectedMentionType(
				args.position - 1,
				MentionType.CHANNEL,
				channelMentionType,
			));

			return;
		}

		const channel = context.guild.channels.resolve(channelMentionId!);

		if (!channel) {
			await context.message.reply('The channel you mentioned does not exist.');

			return;
		} else if (!(channel instanceof TextChannel)) {
			await context.message.reply('Only text channels can be purged.');

			return;
		}

		if (subcommand === 'set')
			return this.executeSet(channel, args, context);
		else
			return this.executeDelete(channel, context);
	}

	protected async executeSet(channel: TextChannel, args: ArgInput, context: CommandContext) {
		let purgeChannel = context.server.purgeChannels.find(item => item.target === channel.id);

		let maxAge: number;

		try {
			maxAge = parseDelay(args);
		} catch (error) {
			if (error instanceof DelayParseError) {
				await context.message.reply(error.message + '.');

				return;
			}

			throw error;
		}

		if (maxAge > 86_400 * 14) {
			await context.message.reply('Sorry, Discord doesn\'t allow bots to delete messages older than 2 weeks.');

			return;
		}

		if (!purgeChannel) {
			context.server.purgeChannels.push({
				maxAge,
				target: channel.id,
			});
		} else
			purgeChannel.maxAge = maxAge;

		await context.server.save();
		await context.message.react(Emoji.CHECKMARK);
	}

	protected async executeDelete(channel: TextChannel, context: CommandContext) {
		const purgeChannel = context.server.purgeChannels.find(item => item.target === channel.id);

		if (!purgeChannel) {
			await context.message.reply('That channel is not currently marked to be purged.');

			return;
		}

		await purgeChannel.remove();
		await context.server.save();

		await context.message.react(Emoji.CHECKMARK);
	}

	protected async executeList(context: CommandContext) {
		if (context.server.purgeChannels.length === 0) {
			await context.channel.send('There are currently no channels configured to be purged.');

			return;
		}

		const channels: string[] = [];
		const delays: string[] = [];

		for (const item of context.server.purgeChannels) {
			channels.push(`<#${item.target}>`);
			delays.push(ms(item.maxAge, {long: true}));
		}

		const message = new MessageEmbed();
		message
			.setTitle('Purge Channel Items')
			.addField('Channel', channels, true)
			.addField('Max Age', delays, true);

		await context.channel.send(message);
	}
}

export function register(commands: Commands) {
	commands.add(new PurgeCommand());
}
