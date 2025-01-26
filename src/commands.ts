import { SlashCommandBuilder } from 'discord.js';

export default [
	new SlashCommandBuilder()
		.setName('giveaway')
		.setDescription('Start a giveaway')
		.addStringOption(option =>
			option
				.setName('title')
				.setDescription('Embed title; what are you giving away?')
				.setRequired(true),
		)
		.addStringOption(option =>
			option
				.setName('duration')
				.setDescription('How long until the winner is chosen?')
				.setRequired(true),
		)
		.addStringOption(option =>
			option
				.setName('description')
				.setDescription('Embed description; more details. (default: none)'),
		)
		.addAttachmentOption(option =>
			option
				.setName('banner')
				.setDescription('Embed image. (default: none)'),
		)
		.addRoleOption(option =>
			option
				.setName('ping')
				.setDescription('Ping a role? (default: none)'),
		)
		.addUserOption(option =>
			option
				.setName('host')
				.setDescription('Who is the host? (default: you)'),
		)
		.addNumberOption(option =>
			option
				.setName('winners')
				.setDescription('How many winners? (default: 1)')
				.setMinValue(1)
				.setMaxValue(10),
		),
];