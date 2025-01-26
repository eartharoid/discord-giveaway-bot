import ms  from 'ms';
import log from './logger';
import {
	endGiveaway,
	getOverdueGiveaways,
} from './db';
import type { Client } from 'discord.js';

async function runGiveaways(client: Client<true>) {
	const giveaways = getOverdueGiveaways();
	for (const giveaway of giveaways) {
		log.info(giveaway);
		try {
			const channel = await client.channels.fetch(giveaway.channelId);
			if (!channel || !channel.isSendable()) {
				log.warn(`Channel ${giveaway.channelId} not found, skipping giveaway ${giveaway.giveawayId}`);
				continue;
			}
			const message = await channel.messages.fetch(giveaway.messageId);
			const reactions = message.reactions.cache.get(process.env.EMOJI || '🎉');
			const users = await reactions?.users.fetch();
			if (!users || users.size < giveaway.winners) {
				log.warn(`Not enough participants for giveaway ${giveaway.giveawayId}`);
				continue;
			}
			// Thanks Copilot! I didn't even know Collection#random existed
			const winners = users.filter(user => !user.bot).random(giveaway.winners);
			const formatter = new Intl.ListFormat('en', {
				style: 'long',
				type: 'conjunction',
			});
			await message.reply({ content: `**Winners:** ${formatter.format(winners.map(winner => winner.toString()))}` });
		} catch (error) {
			log.error(error);
		} finally {
			log.info(`Setting giveaway ${giveaway.giveawayId} as ended`);
			endGiveaway(giveaway.giveawayId);
		}
	}
}


export let interval: Timer;

export function start(client: Client<true>) {
	runGiveaways(client);
	interval = setInterval(() => runGiveaways(client), ms('1 minute'));
	return interval;
}

export function stop() {
	clearInterval(interval);
}