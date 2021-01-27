import {ArgInput, Command, CommandContext, Commands, replaceCommandPrefixPlaceholder} from '../index';

class PrefixCommand implements Command {
	public getKeywords(): string[] {
		return ['prefix'];
	}

	public getUsage(): string[] {
		return [':prefix:prefix [<new prefix>]'];
	}

	public getSummary(): string {
		return 'Changes the prefix used by Midgardsormr bot. Useful if you have another bot that conflicts with the default prefix.';
	}

	public getHelpText(): string {
		return '';
	}

	public async execute(args: ArgInput, context: CommandContext): Promise<void> {
		if (args.remaining === 0) {
			await context.channel.send(replaceCommandPrefixPlaceholder([
				'My command prefix is currently `:prefix:`.',
			], context.server.prefix));

			return;
		}

		const prefix = args.next();

		if (prefix.length > 1) {
			await context.message.reply('Sorry, a command prefix must be only one character.');

			return;
		}

		context.server.prefix = prefix;
		await context.server.save();

		await context.channel.send(replaceCommandPrefixPlaceholder([
			'Command prefix has been updated to `:prefix:`.',
		], context.server.prefix));
	}
}

export function register(commands: Commands) {
	commands.add(new PrefixCommand());
}
