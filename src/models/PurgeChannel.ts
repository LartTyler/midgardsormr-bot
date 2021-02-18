import {Snowflake} from 'discord.js';
import {Schema, SchemaTypes} from 'mongoose';

export interface PurgeChannelInterface {
	target: Snowflake;
	maxAge: number;
}

export const PurgeChannelSchema = new Schema({
	target: {
		type: SchemaTypes.String,
		required: true,
	},
	maxAge: {
		type: SchemaTypes.Number,
		required: true,
	},
});
