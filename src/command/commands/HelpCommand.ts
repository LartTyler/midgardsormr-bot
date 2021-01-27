import {plural} from '../../utility/string';
import {
	ArgInput,
	Command,
	CommandContext,
	Commands,
	registeredCommands,
	replaceCommandPrefixPlaceholder,
} from '../index';

class HelpCommand implements Command {
	public getKeywords(): string[] {
		return ['help', 'h'];
	}

	public getUsage(): string[] {
		return [':prefix:help [<command>]'];
	}

	public getSummary(): string {
		return 'This command. Can be used to list all available commands, or to get more information about a command.';
	}

	public getHelpText(): string {
		return 'You want help... with the help command?';
	}

	public async execute(args: ArgInput, context: CommandContext): Promise<void> {
		if (args.remaining >= 1)
			return this.executeDetails(args.next(), context);
		else
			return this.executeList(context);
	}

	protected async executeList(context: CommandContext): Promise<void> {
		const lines = [
			'For more information on any of the commands listed below, you can type `:prefix:help <command>`.\n',
			'**Commands:**',
		];

		for (const command of registeredCommands.commands) {
			lines.push(
				`_:prefix:${command.getKeywords()[0]}_`,
				`\t${command.getSummary()}\n`,
			);
		}

		await context.channel.send(replaceCommandPrefixPlaceholder(lines, context.server.prefix));
	}

	protected async executeDetails(keyword: string, context: CommandContext): Promise<void> {
		const command = registeredCommands.find(keyword);

		if (!command) {
			await context.channel.send(`Unrecognized command keyword: ${keyword}`);

			return;
		}

		const lines: string[] = [];

		const aliases = command.getKeywords().slice(1);

		if (aliases.length > 0)
			lines.push(`**${plural(aliases.length, 'Alias', 'Aliases')}:** _${aliases.join(', ')}_`);

		lines.push(
			'**Usage:**',
			'```',
			...command.getUsage(),
			'```',
			command.getSummary(),
		);

		if (command.getHelpText().length > 0)
			lines.push('\n' + command.getHelpText());

		await context.channel.send(replaceCommandPrefixPlaceholder(lines, context.server.prefix));
	}
}

export function register(commands: Commands) {
	const command = new HelpCommand();

	commands.add(command);
	commands.setHelpCommand(command);
}
