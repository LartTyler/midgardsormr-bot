import {Client} from 'discord.js';
import fs from 'fs';
import path from 'path';
import {logger} from '../logger';

interface Module {
	init: (client: Client) => Promise<void>;
}

export async function init(client: Client) {
	let count = 0;

	for (const item of fs.readdirSync(path.join(__dirname, 'modules'))) {
		const module: Module = await import(path.join(__dirname, 'modules', path.parse(item).name));

		if (typeof module.init !== 'function')
			throw new Error('Could not register module in ' + item);

		module.init(client);

		++count;
	}

	logger.info(`Loaded ${count} module(s)`);
}
