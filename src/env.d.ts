import type { ColorResolvable } from 'discord.js';

export { };

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			DISCORD_TOKEN?: string;
			EMOJI?: string;
			COLOR?: ColorResolvable;
		}
	}
}
