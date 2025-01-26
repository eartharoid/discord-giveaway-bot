import {
	Client,
	EmbedBuilder,
	Events,
	GatewayIntentBits,
	MessageFlags,
} from 'discord.js';
import log from './logger';
import commands from './commands';
import { createGiveaway } from './db';
import ms, { type StringValue } from 'ms';
import { start } from './scheduler';

export const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessageReactions,
	],
});

client.once(Events.ClientReady, async client => {
	log.success(`Connected to Discord as ${client.user.tag}`);

	try {
		log.info('Registering commands...');
		await client.application.commands.set(commands.map(cmd => cmd.toJSON()));
		log.success('Registered commands');
	} catch (error) {
		log.warn('Failed to register commands');
		log.error(error);
	}

	start(client);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

	if (interaction.commandName === 'giveaway') {
		try {
			const title = interaction.options.getString('title', true);
			const description = interaction.options.getString('description', true);
			const duration = ms(interaction.options.getString('duration', true) as StringValue);
			const banner = interaction.options.getAttachment('banner');
			const ping = interaction.options.getRole('ping');
			const winners = interaction.options.getNumber('winners') || 1;

			if (duration === undefined) {
				return await interaction.reply({
					content: 'The given `duration` is invalid (e.g. `6 hours`).',
					flags: MessageFlags.Ephemeral,
				});
			}

			if (duration < ms('1 minute')) {
				return await interaction.reply({
					content: 'The given `duration` is invalid (e.g. `6 hours`).',
					flags: MessageFlags.Ephemeral,
				});
			}

			const endsAt = Date.now() + duration;
			const endsAtSeconds = Math.floor(endsAt / 1000);

			await interaction.reply({
				content: 'Your giveaway will be created in a moment.',
				flags: MessageFlags.Ephemeral,
			});
			const embed = new EmbedBuilder()
				.setColor(process.env.COLOR || 'Blurple')
				.setTitle(title)
				.setDescription(description)
				.addFields([
					{
						inline: true,
						name: 'Ends',
						value: `<t:${endsAtSeconds}:F>\n<t:${endsAtSeconds}:R>`,
					},
					{
						inline: true,
						name: 'Winners',
						value: winners.toString(),
					},
				]);
			if (banner) embed.setImage(banner.url);
			const followUp = await interaction.followUp({
				allowedMentions: { roles: ping ? [ping.id] : [] },
				content: ping ? ping.toString() : undefined,
				embeds: [embed],
			});
			await followUp.react(process.env.EMOJI || '🎉');

			const giveawayProperties = {
				channelId: followUp.channelId,
				endsAt: endsAtSeconds,
				guildId: interaction.guildId,
				messageId: followUp.id,
				winners,
			};
			try {
				log.info('Creating giveaway', giveawayProperties);
				createGiveaway(giveawayProperties);
			} catch (error) {
				log.warn('Failed to create giveaway');
				log.error(error);
				await interaction.editReply({ content: 'Sorry, something went wrong.' });
				await followUp.delete();
			}
		} catch (error) {
			log.error(error);
		}
	}
});