import log from './logger';
import {
	endGiveaway,
	Giveaway,
} from './db';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type Client,
} from 'discord.js';

export default async function roll(client: Client<true>, giveaway: Giveaway) {
	try {
		const channel = await client.channels.fetch(giveaway.channelId);
		if (!channel || !channel.isSendable()) {
			log.warn(`Channel ${giveaway.channelId} not found, skipping giveaway ${giveaway.giveawayId}`);
			return;
		}
		const message = await channel.messages.fetch(giveaway.messageId);
		const reaction = message.reactions.cache.get(process.env.EMOJI);
		const users = (await reaction?.users.fetch())?.filter(user => !user.bot);
		if (!users || users.size < giveaway.winners) {
			throw `Not enough participants for giveaway ${giveaway.giveawayId}`;
		}
		const winners = users.random(giveaway.winners);
		const formatter = new Intl.ListFormat('en', {
			style: 'long',
			type: 'conjunction',
		});
		const winnerList = formatter.format(winners.map(winner => winner.toString()));
		const embed = new EmbedBuilder(message.embeds[0].data);

		embed.data.fields![0].name = 'Ended';
		embed.data.fields![1] = {
			name: giveaway.winners === 1 ? 'Winner' : 'Winners',
			value: winnerList,
		};

		await message.edit({
			components: [
				new ActionRowBuilder<ButtonBuilder>()
					.addComponents(
						new ButtonBuilder()
							// the giveaway could alternatively be found in the database using the message ID
							.setCustomId(`reroll,${giveaway.giveawayId}`)
							.setStyle(ButtonStyle.Secondary)
							.setLabel('Reroll')
							.setEmoji('🎲'),
					),
			],
			embeds: [embed],
		});
		await message.reply({
			content: `Congratulations to ${winnerList}`,
			embeds: [
				new EmbedBuilder()
					.setColor(process.env.COLOR)
					.setDescription(`${winnerList} won [${embed.data.title!}](${message.url})!`)
					.addFields([
						{
							inline: false,
							name: 'Hosted by',
							value: message.embeds[0].data.fields![2].value,
						},
					]),
			],
		});
		// ! not in `finally` because that runs even if we return early
		log.info(`Setting giveaway ${giveaway.giveawayId} as ended`);
		endGiveaway(giveaway.giveawayId);
	} catch (error) {
		if (typeof error === 'string') {
			throw error;
		} else {
			log.error(error);
			log.info(`Setting giveaway ${giveaway.giveawayId} as ended`);
			endGiveaway(giveaway.giveawayId);
		}
	}
}