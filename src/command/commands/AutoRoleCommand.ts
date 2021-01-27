import {stripIndent} from 'common-tags';
import ms from 'ms';
import {AutoRoleAction, AutoRoleItemNotificationInterface} from '../../models/AutoRoleItem';
import {MentionType, parseMention} from '../../utility/discord';
import {ArgInput, Command, CommandContext, Commands} from '../index';
import {getInvalidCommandInvocationMessage, getUnexpectedMentionType, getUnrecognizedCommandMessage} from '../messages';

class AutoRoleCommand implements Command {
	public getKeywords(): string[] {
		return ['autorole', 'ar'];
	}

	public getUsage(): string[] {
		return [
			':prefix:autorole {add | remove} <@role> <delay> [notify <@user | #channel> [<message>]]',
			':prefix:autorole list',
			':prefix:autorole delete <id>',
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
				Lists all current autorole items. Each line is prefixed with the item's ID, which can be used with the **:prefix:autorole delete** command to delete an item.

			**delete**
				Deletes an item from the autorole settings. The ID can be obtained by using the **:prefix:autorole list** command.

			**clear**
				Deletes all items from the autorole configuration.
		`;
	}

	public async execute(args: ArgInput, context: CommandContext): Promise<void> {
		switch (args.current) {
			case AutoRoleAction.ADD:
			case AutoRoleAction.REMOVE:
				return this.executeAddOrRemove(args.next() as AutoRoleAction, args, context);

			// TODO Implement `list` subcommand
			// TODO Implement `delete` subcommand
			// TODO Implement `clear` subcommand

			default:
				await context.message.reply(getUnrecognizedCommandMessage(args.current));
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
		if (args.length <= 2) {
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

			let message = ':user: has been :action: to :role:.';

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
	}
}

export function register(commands: Commands) {
	commands.add(new AutoRoleCommand());
}
