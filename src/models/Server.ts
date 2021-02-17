import {Snowflake} from 'discord.js';
import {Document, model, Schema, SchemaTypes, Types} from 'mongoose';
import {AutoRoleItemInterface, AutoRoleItemSchema} from './AutoRoleItem';

interface AutoRoleItemDocument extends AutoRoleItemInterface, Document {
}

export interface ServerInterface extends Document {
	guildId: Snowflake;
	prefix: string;
	autoRoleItems: Types.DocumentArray<AutoRoleItemDocument>;
}

const ServerSchema = new Schema({
	guildId: {
		type: SchemaTypes.String,
		required: true,
	},
	prefix: {
		type: SchemaTypes.String,
		default: '!',
	},
	autoRoleItems: [AutoRoleItemSchema],
});

export const Server = model<ServerInterface>('Server', ServerSchema, 'servers');
