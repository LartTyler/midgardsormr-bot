import {createLogger, format, transports} from 'winston';

export const logger = createLogger({
	transports: [
		new transports.Console(),
	],
	format: format.combine(
		format.colorize(),
		format.splat(),
		format.metadata(),
		format.timestamp(),
		format.printf(info => {
			let message = `${info.timestamp} [${info.level}] ${info.message}`;

			if (typeof info.metadata == 'object' && Object.keys(info.metadata).length > 0)
				message += ' ' + JSON.stringify(info.metadata);

			return message;
		})
	),
	level: process.env.LOG_LEVEL ?? 'info',
});
