const db = require('../src/database.js');
const fs = require('fs');
const { MessageAttachment } = require('discord.js');


module.exports = {
	name: 'backup',
	args: false,
	cooldown: 5,
	guildOnly: true,
	adminOnly: true,
	usage: ' ',
	description: 'Takes a backup of database and DMs the file',
	async execute(message, argsIgnore) {
		await db.backup();

		const file = new MessageAttachment(
			__dirname + '/../backup.db',
		);

		message.author.send('Backup of the database:', file)
			.then(() => {
				if (message.channel.type === 'dm') return;
				message.reply('I\'ve sent you a DM with the backup');
			})
			.catch(error => {
				console.error(`Could not send DM to ${message.author.tag}.\n`, error);
				message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
			})
			.finally(() =>{
				fs.unlinkSync(__dirname + '/../backup.db');
			});


		// clean up bootstrapping evidence
		message.delete().catch(() => {});
	},
};