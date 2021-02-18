import {Snowflake} from 'discord.js';
import {Document, model, Schema, SchemaTypes} from 'mongoose';

export interface PurgeQueueItemInterface extends Document {
	guild: Snowflake;
	channel: Snowflake;
	message: Snowflake;
	expiration: Date;
}

const PurgeQueueItemSchema = new Schema({
	guild: {
		type: SchemaTypes.String,
		required: true,
	},
	channel: {
		type: SchemaTypes.String,
		required: true,
	},
	message: {
		type: SchemaTypes.String,
		required: true,
	},
	expiration: {
		type: SchemaTypes.Date,
		required: true,
	},
});

export const PurgeQueueItem = model<PurgeQueueItemInterface>(
	'PurgeQueueItem',
	PurgeQueueItemSchema,
	'purge_queue_items',
);
