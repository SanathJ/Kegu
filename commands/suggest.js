const config = require('../config.json');
const { MessageEmbed } = require('discord.js');

module.exports = {
	name: 'suggest',
	args: true,
	guildOnly: true,
	adminOnly: false,
	description: 'List all of my commands or info about a specific command.',
	aliases: ['suggestion'],
	usage: '<suggestion>',
	minArgLength: 1,
	cooldown: 3,
	async execute(message, args) {
		// copy message into embed
		const embed = new MessageEmbed()
			.setAuthor(message.author.tag, message.author.displayAvatarURL())
			.setDescription(args.join(' '));
		const sentMsg = await message.client.channels.fetch(config.channels.suggestions)
			.then(channel => channel.send({ embeds: [embed] }));
		await sentMsg.react('749195645658726481');
		await sentMsg.react('749195645902127224');

		await message.delete().catch(() => {});
	},
};