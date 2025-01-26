import log from './logger';
import { client } from './discord';

process.env.COLOR ||= 'Blurple';
process.env.EMOJI ||= '🎉';

function exit(signal: string) {
	log.notice(`Received ${signal}`);
	client.destroy();
	process.exit(0);
}

process.on('SIGTERM', () => exit('SIGTERM'));

process.on('SIGINT', () => exit('SIGINT'));

process.on('unhandledRejection', error => {
	if (error instanceof Error) log.warn(`Uncaught ${error.name}`);
	log.error(error);
});

client.login();