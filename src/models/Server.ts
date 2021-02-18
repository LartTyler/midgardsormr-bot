import {Snowflake} from 'discord.js';
import {Document, model, Schema, SchemaTypes, Types} from 'mongoose';
import {AutoRoleItemInterface, AutoRoleItemSchema} from './AutoRoleItem';
import {PurgeChannelInterface, PurgeChannelSchema} from './PurgeChannel';

interface AutoRoleItemDocument extends AutoRoleItemInterface, Document {
}

interface PurgeChannelDocument extends PurgeChannelInterface, Document {
}

export interface ServerInterface extends Document {
	guildId: Snowflake;
	prefix: string;
	autoRoleItems: Types.DocumentArray<AutoRoleItemDocument>;
	purgeChannels: Types.DocumentArray<PurgeChannelDocument>;
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
	purgeChannels: [PurgeChannelSchema],
});

export const Server = model<ServerInterface>('Server', ServerSchema, 'servers');
