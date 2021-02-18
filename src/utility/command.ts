import ms from 'ms';
import {ArgInput} from '../command';

export class DelayParseError extends Error {
	public constructor(input: string) {
		super(`Could not parse \`${input}\` to a valid delay`);
	}
}

export function parseDelay(args: ArgInput, stopOnArg: string[] = []): number {
	let delayText = args.next();

	if (args.remaining > 0 && !stopOnArg.includes(args.current))
		delayText += ' ' + args.next();

	const delay = ms(delayText);

	if (delay === undefined)
		throw new DelayParseError(delayText);

	return delay;
}
