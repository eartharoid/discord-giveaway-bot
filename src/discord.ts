import {
	Client,
	EmbedBuilder,
	Events,
	GatewayIntentBits,
	MessageFlags,
	PermissionFlagsBits,
} from 'discord.js';
import log from './logger';
import commands from './commands';
import {
	createGiveaway,
	getGiveaway,
} from './db';
import ms, { type StringValue } from 'ms';
import { start } from './scheduler';
import roll from './roll';

export const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessageReactions,
	],
});

client.once(Events.ClientReady, async client => {
	log.success(`Connected to Discord as ${client.user.tag}`);

	if (process.env.NODE_ENV === 'production') {
		try {
			log.info('Registering commands...');
			await client.application.commands.set(commands.map(cmd => cmd.toJSON()));
			log.success('Registered commands');
		} catch (error) {
			log.warn('Failed to register commands');
			log.error(error);
		}
	 } else {
		log.warn('Skipping command registration in development mode');
	 }

	start(client);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.inGuild()) return;

	if (interaction.isChatInputCommand()  && interaction.commandName === 'giveaway') {
		try {
			const title = interaction.options.getString('title', true);
			const description = interaction.options.getString('description');
			const duration = ms(interaction.options.getString('duration', true) as StringValue);
			const banner = interaction.options.getAttachment('banner');
			const ping = interaction.options.getRole('ping');
			const winners = interaction.options.getNumber('winners') || 1;
			const host = interaction.options.getUser('host') || interaction.user;
			const channel = client.channels.cache.get(interaction.options.getChannel('channel')?.id || interaction.channelId);

			if (!channel?.isSendable()) {
				return await interaction.reply({
					content: 'Unable to send messages to channel.',
					flags: MessageFlags.Ephemeral,
				});
			}

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
				.setColor(process.env.COLOR)
				.setTitle(title)
				.setDescription(description)
				.addFields([
					{
						inline: false,
						name: 'Ends',
						value: `<t:${endsAtSeconds}:F>, <t:${endsAtSeconds}:R>`,
					},
					{
						inline: true,
						name: 'Winners',
						value: winners.toString(),
					},
					{
						inline: true,
						name: 'Hosted by',
						value: host.toString(),
					},
				]);

			if (banner) embed.setImage(banner.url);

			const sent = await channel.send({
				allowedMentions: { roles: ping ? [ping.id] : [] },
				content: ping ? ping.toString() : undefined,
				embeds: [embed],
			});
			await sent.react(process.env.EMOJI);

			const giveawayProperties = {
				channelId: sent.channelId,
				endsAt: endsAtSeconds,
				guildId: interaction.guildId,
				messageId: sent.id,
				winners,
			};

			try {
				log.info('Creating giveaway', giveawayProperties);
				createGiveaway(giveawayProperties);
			} catch (error) {
				log.warn('Failed to create giveaway');
				log.error(error);
				await interaction.editReply({ content: 'Sorry, something went wrong.' });
				await sent.delete();
			}
		} catch (error) {
			log.error(error);
		}
	} else if (interaction.isButton()) {
		const [action, ...args] = interaction.customId.split(',');
		if (action === 'reroll') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const member = await client.guilds.cache.get(interaction.guildId)?.members.fetch(interaction.user.id);
			if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) return await interaction.editReply({ content: 'You don\'t have permission to do this.' });
			const giveawayId = parseInt(args[0]);
			const giveaway = getGiveaway(giveawayId);
			if (!giveaway) return await interaction.editReply({ content: 'Sorry, something went wrong.' });
			try {
				log.info('Re-rolling at the request of', member.user.username, giveaway);
				await roll(client as Client<true>, giveaway);
				await interaction.editReply({ content: 'The giveaway has been re-rolled.' });
			} catch (error) {
				if (typeof error === 'string') {
					log.warn(error);
					await interaction.editReply({ content: error });
				} else {
					log.error(error);
					await interaction.editReply({ content: 'Sorry, something went wrong.' });
				}
			}
		}
	}
});