const Discord = require('discord.js');
const flags = Discord.Intents.FLAGS;
const bot = new Discord.Client({
	intents: [
		flags.GUILDS,
		flags.GUILD_MESSAGES,
		flags.GUILD_MESSAGE_REACTIONS,
		flags.DIRECT_MESSAGES,
		flags.GUILD_EMOJIS_AND_STICKERS,
	],
	partials: [
		'CHANNEL',
	],
});

const fs = require('fs');

const CronJob = require('cron').CronJob;

bot.commands = new Discord.Collection();

const database = require('./src/database.js');

const { execute: megu } = require('./commands/megu.js');
const { curr } = require('./commands/current.js');
const { execute: backup } = require('./commands/backup.js');

const config = JSON.parse(fs.readFileSync('config.json'));

const token = config.token;
const PREFIX = config.prefix;

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

process.on('unhandledRejection', error => console.error('Uncaught Promise Rejection', error));

bot.once('ready', () => {
	console.log('Online!');
	database.init().then(() => curr(bot));
});

bot.on('error', console.error);

const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

bot.on('messageCreate', async msg => {
	const prefixRegex = new RegExp(`^(<@!?${bot.user.id}>|${escapeRegex(PREFIX)})\\s*`);

	if (!prefixRegex.test(msg.content)) return;

	const [, matchedPrefix] = msg.content.match(prefixRegex);
	const args = msg.content.slice(matchedPrefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command = bot.commands.get(commandName)
		|| bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.guildOnly && msg.channel.type === 'DM') {
		return msg.reply('I can\'t execute that command inside DMs!');
	}

	if (command.adminOnly) {
		const mem = await msg.guild.members.fetch(msg.author);
		if(mem.id !== config.ownerID && !mem.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) return;
	}


	if (command.args && (args.length < command.minArgLength)) {

		let reply = `You didn't provide sufficient arguments, ${msg.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${PREFIX}${command.name} ${command.usage}\``;
		}

		return msg.channel.send(reply);
	}

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(msg.author.id)) {
		const expirationTime = timestamps.get(msg.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return msg.reply(`Please wait ${timeLeft.toFixed()} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}
	else {
		timestamps.set(msg.author.id, now);
		setTimeout(() => timestamps.delete(msg.author.id), cooldownAmount);
	}

	try {
		command.execute(msg, args);
	}
	catch (error) {
		console.error(error);
		msg.reply('There was an error trying to execute that command!');
	}
});

const job = new CronJob('0 30 23 * * *', async function() {
	const channel = await bot.channels.fetch(config.channels.general);
	megu(channel.lastMessage, undefined);
}, null, false, 'Asia/Kolkata');
job.start();

const currJob = new CronJob('0 30 23 * * *', async function() {
	curr(bot);
}, null, false, 'Asia/Kolkata');
currJob.start();

const backupJob = new CronJob('0 0 0 * * 3', async function() {
	backup(undefined, bot);
}, null, false, 'Asia/Kolkata');
backupJob.start();

bot.login(token);