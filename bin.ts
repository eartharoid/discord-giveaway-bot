// itty-time needs a space between the number and the unit
const numberLength = /\d+/.exec(duration)?.[0].length;
if (!numberLength) return await interaction.reply(invalidDuration);
const durationInMS = ms(duration.split('').toSpliced(numberLength, 0, ' ').join(''));
if (Number.isNaN(durationInMS) || durationInMS < ms('1 minute')) return await interaction.reply(invalidDuration);
