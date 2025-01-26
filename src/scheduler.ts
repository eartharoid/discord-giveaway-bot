import ms  from 'ms';
import log from './logger';
import { getOverdueGiveaways } from './db';
import { type Client } from 'discord.js';
import roll from './roll';

async function runGiveaways(client: Client<true>) {
	const giveaways = getOverdueGiveaways();
	for (const giveaway of giveaways) {
		log.info('Rolling', giveaway);
		await roll(client, giveaway);
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