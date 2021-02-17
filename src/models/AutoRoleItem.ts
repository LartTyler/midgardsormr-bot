import {Snowflake} from 'discord.js';
import {Schema, SchemaTypes} from 'mongoose';
import {MentionType} from '../utility/discord';

export enum AutoRoleAction {
	ADD = 'add',
	REMOVE = 'remove',
}

export interface AutoRoleItemNotificationInterface {
	type: MentionType.CHANNEL | MentionType.USER;
	target: Snowflake;
	message: string | null;
}

export interface AutoRoleItemInterface {
	action: AutoRoleAction;
	delay: number;
	role: Snowflake;
	notification: AutoRoleItemNotificationInterface | null;
}

export const AutoRoleItemSchema = new Schema({
	action: {
		type: SchemaTypes.String,
		required: true,
	},
	delay: {
		type: SchemaTypes.Number,
		required: true,
	},
	role: {
		type: SchemaTypes.String,
		required: true,
	},
	notification: new Schema({
		type: {
			type: SchemaTypes.String,
			required: true,
		},
		target: {
			type: SchemaTypes.String,
			required: true,
		},
		message: {
			type: SchemaTypes.String,
			default: null,
		},
	}),
});
