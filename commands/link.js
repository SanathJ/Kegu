const db = require('../src/database.js');
const { prefix } = require('../config.json');

const usage = 'add <link> <name>` or `' + prefix + 'link <remove | delete> <name>';
const name = 'link';

module.exports = {
	name,
	args: true,
	guildOnly: true,
	adminOnly: true,
	description: 'adds link to be referred by a shorter name with `show`, or removes it',
	aliases: ['links'],
	usage,
	minArgLength: 1,
	cooldown: 0,
	async execute(message, args) {
		const subcommand = args.shift();
		if(subcommand === 'add') {
			if (args.length < 2) {
				let reply = `You didn't provide the correct arguments, ${message.author}!`;
				reply += `\nThe proper usage would be: \`${prefix}${name} ${usage}\``;

				return message.channel.send({ content: reply });
			}

			const link = args.shift();
			const linkName = args.join(' ').toLowerCase();
			if (linkName === 'all') {
				message.channel.send('Link name cannot be `all`');
				await message.delete().catch(() => {});
				return;
			}
			const data = await db.rawInsert('links', [linkName, link]);
			// non unique
			if (data === 19) {
				const sentMsg = await message.channel.send('A link by this name already exists. Would you like to edit it?');
				const filter = (reaction, user) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎') && user.id === message.author.id;
				sentMsg.react('👍');
				sentMsg.react('👎');

				// 2.5 min timeout
				const collector = sentMsg.createReactionCollector({ filter, time: 150000 });
				collector.on('collect', async function(r) {
					if(r.emoji.name === '👍') {
						await db.runner('run', 'DELETE FROM links WHERE name=?', linkName);
						await db.rawInsert('links', [linkName, link]);
						collector.stop();
						message.channel.send('An entry was edited.');
					}
					else if (r.emoji.name === '👎') {
						collector.stop();
					}
				});
			}

			await message.delete().catch(() => {});
		}
		else if(subcommand === 'remove' || subcommand === 'delete') {
			if (args.length < 1) {
				let reply = `You didn't provide the correct arguments, ${message.author}!`;
				reply += `\nThe proper usage would be: \`${prefix}${name} ${usage}\``;

				return message.channel.send(reply);
			}

			const linkName = args.join(' ').toLowerCase();
			try {
				const result = await db.runner('run', 'DELETE FROM links WHERE name=?', linkName);
				if(result.changes !== 0) {
					message.channel.send('Deleted an entry. 👍');
				}
			}
			catch (error) {
				message.channel.send('There was an error. Make sure a link with such a name exists');
			}
			await message.delete().catch(() => {});
		}
		else {
			const reply = `\nThe proper usage would be: \`${prefix}${name} ${usage}\``;
			return message.channel.send(reply);
		}
	},
};