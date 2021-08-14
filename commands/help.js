const { prefix, ownerID } = require('../config.json');
const { FLAGS } = require('discord.js').Permissions;

module.exports = {
	name: 'help',
	args: true,
	guildOnly: false,
	adminOnly: false,
	description: 'List all of my commands or info about a specific command.',
	aliases: ['commands'],
	usage: '[command name]',
	cooldown: 3,
	minArgLength: 0,
	async execute(message, args) {
		const data = [];
		const { commands } = message.client;

		if (!args.length) {
			data.push('Here\'s a list of all my commands:');
			data.push('```');

			// Hides admin commands if in DM or if user isn't an administrator
			if(message.channel.type === 'GUILD_TEXT') {
				const mem = await message.guild.members.fetch(message.author);
				if(mem.id !== ownerID && !mem.permissions.has(FLAGS.ADMINISTRATOR)) {
					data.push(commands.filter(command => !command.adminOnly).map(command => command.name.charAt(0).toUpperCase() + command.name.substring(1)).join(', '));
				}
				else{
					data.push(commands.map(command => command.name.charAt(0).toUpperCase() + command.name.substring(1)).join(', '));
				}
			}
			else{
				data.push(commands.filter(command => !command.adminOnly).map(command => command.name.charAt(0).toUpperCase() + command.name.substring(1)).join(', '));
			}

			data.push('```');
			data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);

			return message.author.send({ content: data.join('') })
				.then(() => {
					if (message.channel.type === 'DM') return;
					message.reply('I\'ve sent you a DM with all my commands!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}

		const name = args[0].toLowerCase();
		const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

		if (!command) {
			return message.reply('that\'s not a valid command!');
		}

		data.push(`**Name:** ${command.name}`);

		if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
		if (command.description) data.push(`**Description:** ${command.description}`);
		if (command.usage) data.push(`**Usage:** \`${prefix}${command.name} ${command.usage}\``);

		data.push(`**Cooldown:** ${command.cooldown || 3} second(s)`);

		message.channel.send({ content: data.join('\n') });
	},
};