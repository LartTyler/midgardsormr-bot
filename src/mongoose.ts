import mongoose from 'mongoose';
import {logger} from './logger';

export async function connect(uri: string) {
	try {
		await mongoose.connect(uri, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
	} catch (error) {
		logger.error('Could not establish database connection; reason: ' + error);

		throw error;
	}

	logger.info('Database connection established');

	mongoose.connection.on('disconnected', () => {
		logger.info('Database connection lost, attempting to reconnect...');

		connect(uri);
	});
}
