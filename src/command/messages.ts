import {oneLine} from 'common-tags';
import exp from 'constants';
import {MentionType} from '../utility/discord';
import {getIndefiniteArticle, joinWithConjunction} from '../utility/string';
import {Command, CommandContext, registeredCommands, replaceCommandPrefixPlaceholder} from './index';

export function getHelpCommandText(command: string = ''): string | undefined {
	const helpCommand = registeredCommands.getHelpCommand();

	if (!helpCommand)
		return undefined;

	return `:prefix:${helpCommand.getKeywords()[0]} ${command}`.trim();
}

export function getUnrecognizedCommandMessage(command: string = '') {
	const output = ['Command not recognized.'];
	const helpCommandText = getHelpCommandText(command);

	if (helpCommandText)
		output.push(` For help, try \`${helpCommandText}\`.`);

	return output.join('');
}

export function getInvalidCommandInvocationMessage(context: CommandContext, command: Command, subcommand: string = '') {
	const commandText = `:prefix:${command.getKeywords()[0]} ${subcommand}`.trim();
	const output = [`Too few arguments provided to the \`${commandText}\` command.`];

	const helpCommandText = getHelpCommandText(command.getKeywords()[0]);

	if (helpCommandText)
		output.push(` For help, try \`${helpCommandText}\`.`);

	return replaceCommandPrefixPlaceholder(output, context.server.prefix).join('');
}

export function getUnexpectedMentionType(
	argumentIndex: number,
	expected: MentionType | MentionType[],
	actual: MentionType,
) {
	if (!Array.isArray(expected))
		expected = [expected];
	else if (expected.length === 0)
		throw new Error('You must provide at least one expected value');

	const actualText = `${getIndefiniteArticle(actual)} ${actual}`;
	const expectedText = `${getIndefiniteArticle(expected[0])} ${joinWithConjunction('or', expected)}`;

	return oneLine`
		Unexpected mention provided for argument ${argumentIndex + 1}. You mentioned ${actualText}, but the command
		expected ${expectedText}.
	`;
}
