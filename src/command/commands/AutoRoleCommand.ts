import {stripIndent} from 'common-tags';
import {MessageEmbed} from 'discord.js';
import ms from 'ms';
import {AutoRoleAction, AutoRoleItemNotificationInterface} from '../../models/AutoRoleItem';
import {Emoji, MentionType, parseMention} from '../../utility/discord';
import {ucfirst} from '../../utility/string';
import {ArgInput, Command, CommandContext, Commands, replaceCommandPrefixPlaceholder} from '../index';
import {getInvalidCommandInvocationMessage, getUnexpectedMentionType, getUnrecognizedCommandMessage} from '../messages';

class AutoRoleCommand implements Command {
	public getKeywords(): string[] {
		return ['autorole', 'ar'];
	}

	public getUsage(): string[] {
		return [
			':prefix:autorole {add | remove} <@role> <delay> [notify <@user | #channel> [<message>]]',
			':prefix:autorole list',
			':prefix:autorole delete <index | @role>',
			':prefix:autorole clear',
		];
	}

	public getSummary(): string {
		return 'Automatically adds or removes certain roles, based on how long a user has been a member of the server';
	}

	public getHelpText(): string {
		return stripIndent`
			**add, remove**
			Performs the requested action using the specified role. The \`<delay>\` argument can be any positive integer, followed by a unit (such as minutes, hours, etc).

			If the action should be performed immediately when the user joins the server, you can use "immediate" for the delay.

			**list**
			Lists all current autorole items. Each line is prefixed with the item's index, which can be used with the **:prefix:autorole delete** command to delete an item.

			**delete**
			Deletes an item from the autorole settings. The index can be obtained by using the **:prefix:autorole list** command. If a role is provided instead, all items that use that role will be deleted instead.

			Please be aware that deleting an item may cause the index of other items to change, so you should check the output of **:prefix:autorole list** each time you go to run this command.

			**clear**
			Deletes all items from the autorole configuration.
		`;
	}

	public async execute(args: ArgInput, context: CommandContext): Promise<void> {
		const current = args.next();

		switch (current) {
			case 'add':
			case 'remove':
				return this.executeAddOrRemove(current as AutoRoleAction, args, context);

			case 'list':
				return this.executeList(context);

			case 'delete':
				return this.executeDelete(args, context);

			case 'clear':
				return this.executeClear(context);

			default:
				await context.message.reply(replaceCommandPrefixPlaceholder([
					getUnrecognizedCommandMessage(this.getKeywords()[0]),
				], context.server.prefix));
		}
	}

	/**
	 * Sample invocations:
	 * 	add @role 10m
	 * 	remove @role 10 mins
	 * 	add @role 10m notify @user [some custom notification message]
	 * 	remove @role 10m notify #channel [some custom notification message]
	 *
	 * @param action
	 * @param args
	 * @param context
	 */
	public async executeAddOrRemove(action: AutoRoleAction, args: ArgInput, context: CommandContext): Promise<void> {
		if (args.remaining < 2) {
			await context.message.reply(getInvalidCommandInvocationMessage(context, this));

			return;
		}

		const [roleMentionType, roleMentionId] = parseMention(args.next());

		if (roleMentionType !== MentionType.ROLE) {
			await context.message.reply(getUnexpectedMentionType(args.position - 1, MentionType.ROLE, roleMentionType));

			return;
		}

		let delayText = args.next();

		// Handles invocations like `add @role 10 minutes` (as opposed to delay and units being merged into one arg,
		// e.g. `add @role 10mins`)
		if (args.remaining >= 1 && args.current !== 'notify')
			delayText += args.next();

		const delay = delayText === 'immediate' ? 0 : ms(delayText);

		if (delay < 0) {
			await context.message.reply('Autorole delay must be greater than or equal to zero.');

			return;
		}

		let notification: AutoRoleItemNotificationInterface | null = null;

		if (args.remaining >= 2 && args.next() === 'notify') {
			const [notifyMentionType, notifyMentionId] = parseMention(args.next());

			if (notifyMentionType !== MentionType.USER && notifyMentionType !== MentionType.CHANNEL) {
				await context.message.reply(getUnexpectedMentionType(
					args.position,
					[MentionType.CHANNEL, MentionType.USER],
					notifyMentionType,
				));

				return;
			}

			let message = null;

			if (args.remaining >= 1) {
				let parts: string[] = [];

				while (args.remaining > 0)
					parts.push(args.next());

				message = parts.join(' ');
			}

			notification = {
				message,
				target: notifyMentionId!,
				type: notifyMentionType,
			};
		}

		context.server.autoRoleItems.push({
			action,
			delay,
			notification,
			role: roleMentionId!,
		});

		await context.server.save();
		await context.message.react(Emoji.CHECKMARK);
	}

	protected async executeList(context: CommandContext) {
		if (context.server.autoRoleItems.length === 0) {
			await context.channel.send('There are no autorole items configured right now.');

			return;
		}

		const actions: string[] = [];
		const delays: string[] = [];

		for (const item of context.server.autoRoleItems) {
			actions.push(`${ucfirst(item.action)} <@&${item.role}>`);
			delays.push(item.delay === 0 ? 'Immediate' : ms(item.delay, {long: true}));
		}

		const message = new MessageEmbed();
		message
			.setTitle('Autorole Items')
			.addField('Index', actions.map((_, index) => index + 1), true)
			.addField('Action', actions, true)
			.addField('Delay', delays, true);

		await context.channel.send(message);
	}

	protected async executeDelete(args: ArgInput, context: CommandContext) {
		console.log(args);
		if (args.remaining < 1) {
			await context.message.reply(getInvalidCommandInvocationMessage(context, this, 'delete'));

			return;
		}

		const input = args.next();
		const [mentionType, mentionId] = parseMention(input);

		if (mentionType !== MentionType.NONE) {
			if (mentionType !== MentionType.ROLE) {
				await context.message.reply(getUnexpectedMentionType(args.position - 1, MentionType.ROLE, mentionType));

				return;
			}

			const remove = context.server.autoRoleItems.filter(item => item.role === mentionId);

			for (const item of remove)
				item.remove();
		} else {
			const index = parseInt(input, 10);

			if (isNaN(index)) {
				await context.message.reply(
					'You need to provide either a role or an item index in order to delete items from the autorole configuration.',
				);

				return;
			} else if (index < 1) {
				await context.message.reply('Index must be a positive integer.');

				return;
			} else if (index > context.server.autoRoleItems.length) {
				await context.message.reply('Index cannot be greater than the number of auto role items.');

				return;
			}

			context.server.autoRoleItems[index - 1].remove();
		}

		await context.server.save();

		await context.message.react(Emoji.CHECKMARK);

		if (context.server.autoRoleItems.length > 0)
			await this.executeList(context);
	}

	protected async executeClear(context: CommandContext): Promise<void> {
		context.server.autoRoleItems.remove();
		await context.server.save();

		await context.message.react(Emoji.CHECKMARK);
		await context.channel.send('All auto role items have been deleted.');
	}
}

export function register(commands: Commands) {
	commands.add(new AutoRoleCommand());
}
