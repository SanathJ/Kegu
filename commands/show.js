const db = require('../src/database.js');

module.exports = {
	name: 'show',
	args: true,
	guildOnly: true,
	adminOnly: false,
	description: 'shows a named link',
	aliases: ['links'],
	usage: '[name or \'all\']',
	minArgLength: 0,
	cooldown: 10,
	async execute(message, args) {
		let data;
		if (args.length === 0 || args[0].toLowerCase() === 'all') {
			data = await db.runner('all', 'SELECT * FROM links');
		}
		else {
			const linkName = args.join(' ').toLowerCase();
			data = [await db.runner('get', 'SELECT * FROM links WHERE name=?', linkName)];
		}
		if (data === undefined) {
			message.channel.send('No such link name exists.');
		}
		else {
			const text = [];
			for (const datum of data) {
				const entry = `**${datum.name}:** ${datum.link}`;
				text.push(entry);
			}
			const msg = await message.channel.send(text.join('\n'));
			if (data.length > 1) {
				msg.suppressEmbeds(true);
			}
		}
		await message.delete().catch(() => {});
	},
};
