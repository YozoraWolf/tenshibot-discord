const { EmbedBuilder } = require('discord.js');
const Utils = require('../Utils.js');

class Poll {

    constructor(interaction, multi, question, options, timeLimit) {
        this.interaction = interaction;
        this.question = question;
        this.multi = multi;
        this.options = options;
        this.timeLimit = timeLimit;
        this.timeRemaining = timeLimit;
        this.pollMessage = null;
        this.embedPoll = null;
        this.embedResult = null;
        this.countdownInterval = null;
        this.collected = null;
    }

    async start() {
        Poll.activePolls.push(this);
        // Create the poll embed and send the message
        this.embedPoll = new EmbedBuilder()
            .setTitle(`📊 Poll: ${this.question}`)
            .setDescription(this.options.map((option, index) => `${Poll.OPTION_EMOJIS[index]} ${option}`).join('\n'))
            .setFooter({ text: `🕒 You have ${Utils.convertSecondsToTime(this.timeLimit)} seconds to vote!` });
        this.pollMessage = await this.interaction.reply({ embeds: [this.embedPoll], fetchReply: true });

        // Set up the countdown timer
        this.countdownInterval = setInterval(() => {
            this.timeRemaining--;
            this.embedPoll.setFooter({ text: `🕒 You have ${Utils.convertSecondsToTime(this.timeRemaining)} to vote!` });
            this.pollMessage.edit({ embeds: [this.embedPoll] });

            if (this.timeRemaining <= 0) {
                clearInterval(this.countdownInterval);
            }
        }, 950);

        // Add reactions to the poll message
        for (let i = 0; i < this.options.length; i++) {
            await this.pollMessage.react(Poll.OPTION_EMOJIS[i]);
        }

        // Set up a filter to collect reactions from users
        const usersReactions = new Map();
        const filter = (reaction, user) => {
            if (!Poll.OPTION_EMOJIS.includes(reaction.emoji.name) || user.bot) {
                return false;
            }

            const previousReaction = usersReactions.get(user.id);
            if (previousReaction && !this.multi) {
                this.pollMessage.reactions.resolve(previousReaction)?.users.remove(user.id);
            }
            usersReactions.set(user.id, reaction);
            return true;
        };

        // Wait for reactions
        this.collected = await this.pollMessage.awaitReactions({
            filter,
            time: this.timeLimit * 1000,
        });

        this.showResults();
    }


    async showResults() {
        // Create a results embed and send the message
        this.embedResult = new EmbedBuilder()
            .setTitle(`✅ Poll Results: ${this.question}`)
            .setDescription(
                this.options
                    .map((option, index) => {
                        const count = this.collected.get(Poll.OPTION_EMOJIS[index])?.count - 1 || 0;
                        return `${Poll.OPTION_EMOJIS[index]} ${option}: ${count}`;
                    }, this) // pass `this` as the second argument
                    .join('\n')
            );
        await this.pollMessage.edit({ embeds: [this.embedResult] });

        // Remove the poll from the active polls list
        const index = Poll.activePolls.findIndex((poll) => poll === this);
        if (index >= 0) {
            Poll.activePolls.splice(index, 1);
        }
    }
}

Poll.activePolls = [];
Poll.MAX_OPTIONS = 4;
Poll.OPTION_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

module.exports = Poll;