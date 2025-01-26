import { Database } from 'bun:sqlite';

/**
 * This does nothing but allows using the `sql` tag for syntax highlighting
 */
export const sql = (strings: TemplateStringsArray, ...values: unknown[]) => String.raw({ raw: strings }, ...values);

export const db = new Database('database.sqlite', {
	create: true,
	strict: true,
});

db.exec(sql`PRAGMA journal_mode = WAL;`);

db.exec(sql`
CREATE TABLE IF NOT EXISTS giveaways (
    giveawayId  INTEGER PRIMARY KEY, /* alias of rowid, auto */
    guildId     TEXT    NOT NULL,
    channelId   TEXT    NOT NULL,
    messageId   TEXT    NOT NULL,
    endsAt      INTEGER NOT NULL,
    ended       INTEGER NOT NULL DEFAULT 0,
    winners     INTEGER NOT NULL
);

-- CREATE TABLE IF NOT EXISTS entries (
--     giveawayId  INTEGER NOT NULL,
--     userId      TEXT    NOT NULL,
--     enteredAt   INTEGER NOT NULL,
--     PRIMARY KEY (giveawayId, userId),
--     FOREIGN KEY (giveawayId) REFERENCES giveaways(giveawayId)
-- );

-- CREATE TABLE IF NOT EXISTS winners (
--     giveawayId  INTEGER NOT NULL,
--     userId      TEXT    NOT NULL,
--     PRIMARY KEY (giveawayId, userId),
--     FOREIGN KEY (giveawayId) REFERENCES giveaways(giveawayId)
-- );
`);

export class Giveaway {
	giveawayId!: number;
	guildId!: string;
	channelId!: string;
	messageId!: string;
	endsAt!: number;
	ended!: number;
	winners!: number;
}

export type InsertGiveawayProperties = Omit<Giveaway, 'giveawayId' | 'ended'>;

export const queries = {
	createGiveaway: db.query(sql`
        INSERT INTO giveaways   (guildId,   channelId,  messageId,  endsAt,  winners)
        VALUES                  ($guildId,  $channelId, $messageId, $endsAt, $winners);
    `).as(Giveaway),
	endGiveaway: db.query(sql`
        UPDATE giveaways SET ended = 1 WHERE giveawayId = $giveawayId;
    `).as(Giveaway),
	getOverdueGiveaways: db.query(sql`
        SELECT * FROM giveaways WHERE NOT ended AND endsAt < $now;
    `).as(Giveaway),
};

export const endGiveaway = (giveawayId: number) => queries.endGiveaway.run({ giveawayId });

export const createGiveaway = (giveaway: InsertGiveawayProperties) => queries.createGiveaway.run(giveaway);

export const getOverdueGiveaways = () => queries.getOverdueGiveaways.all({ now: Math.floor(Date.now() / 1000) });