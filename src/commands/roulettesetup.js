import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function para guluhin o i-shuffle ang pagkakasunod-sunod ng mga pangalan sa listahan
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default {
    data: {
        name: 'roulettesetup',
        description: 'Magsimula ng isang Event Roulette na may mabilis na list shuffling text effect!',
        toJSON() {
            return { name: this.name, description: this.description };
        }
    },

    async execute(interaction) {
        try {
            const hostId = interaction.user.id;
            
            // PATAS NA LABAN: Naka-blanko na ang Set sa simula. Hindi na awtomatikong kasali ang Host!
            const participantsSet = new Set();

            const JOIN_BUTTON_ID = "roulette_join_btn";
            const START_BUTTON_ID = "roulette_start_btn";

            const getActionRow = () => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(JOIN_BUTTON_ID)
                        .setLabel(`Join Roulette (${participantsSet.size})`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("🎟️"),
                    new ButtonBuilder()
                        .setCustomId(START_BUTTON_ID)
                        .setLabel("Start Roulette 🚀")
                        .setStyle(ButtonStyle.Success)
                );
            };

            // 1. Unang Embed: Pagpapasali
            const setupEmbed = new EmbedBuilder()
                .setTitle("🎡 Anunsyo: Event Roulette")
                .setDescription(`Mag-click ng **Join Roulette** sa ibaba para mapasama ang pangalan mo sa umiikot na gulong!\n\n👑 **Host:** <@${hostId}>\n*Aantayin ng bot na pindutin ng Host ang Start button para mag-roll. Kahit ang Host ay kailangang mag-click ng Join kung gusto niyang sumali!*`)
                .setColor(0x5865F2)
                .setFooter({ text: "Iyong Bot Official | List Shuffler" });

            const message = await interaction.reply({ 
                embeds: [setupEmbed], 
                components: [getActionRow()], 
                fetchReply: true 
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 600000 // 10 minutes max waiting
            });

            collector.on('collect', async (btnInteraction) => {
                // KASO A: May nag-click ng "Join Roulette" (Pwede na ang Host dito kung gusto niya)
                if (btnInteraction.customId === JOIN_BUTTON_ID) {
                    if (participantsSet.has(btnInteraction.user)) {
                        return await btnInteraction.reply({ content: "❌ Kasali na ang pangalan mo!", ephemeral: true });
                    }
                    participantsSet.add(btnInteraction.user);
                    await btnInteraction.deferUpdate();
                    await interaction.editReply({ components: [getActionRow()] });
                }

                // KASO B: May nag-click ng "Start Roulette"
                if (btnInteraction.customId === START_BUTTON_ID) {
                    if (btnInteraction.user.id !== hostId) {
                        return await btnInteraction.reply({ content: "❌ **Bawal makialam:** Ang Host lamang ang pwedeng mag-start ng roleta.", ephemeral: true });
                    }
                    await btnInteraction.deferUpdate();
                    collector.stop("start_pressed");
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason !== "start_pressed") {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("🎡 Roulette Cancelled")
                        .setDescription("❌ Lumipas ang oras at hindi nasimulan ng host ang roulette.")
                        .setColor(0xED4245);
                    return await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                }

                const participants = Array.from(participantsSet);

                // Kung walang pumindot kahit isa ng Join button
                if (participants.length === 0) {
                    const noParticipantsEmbed = new EmbedBuilder()
                        .setTitle("🎡 Roulette Cancelled")
                        .setDescription("❌ Walang sumali sa listahan kaya hindi itinuloy ang pag-roll ng bot.")
                        .setColor(0xED4245);
                    return await interaction.editReply({ embeds: [noParticipantsEmbed], components: [] });
                }

                // 2. MISMONG LIST RANDOMIZING/SHUFFLING EFFECT PHASE (10 Seconds)
                const totalSeconds = 10;
                const animations = ["⚙️", "🎰", "🔮", "⚡", "🔥"];

                for (let i = totalSeconds; i > 0; i--) {
                    const randomizedList = shuffleArray(participants);
                    
                    const formattedListText = randomizedList
                        .map((user, index) => `\`[ ${index + 1} ]\` **${user.username}**`)
                        .join("\n");

                    const currentAnim = animations[i % animations.length];

                    const shuffleEmbed = new EmbedBuilder()
                        .setTitle(`${currentAnim} Ginugulo at Iniiikot ang Listahan... ${currentAnim}`)
                        .setDescription(
                            `### ⏳ Bumabagal na ang gulong sa loob ng: \`${i}s\`\n\n` +
                            `⚡ **Kasalukuyang Ayos ng mga Pangalan (Shuffling):**\n${formattedListText}\n\n` +
                            `*Ang pangalang hihinto sa Unang Pwesto [ 1 ] pagkatapos ng timer ang siyang mananalong Winner!*`
                        )
                        .setColor(0xFEE75C)
                        .setFooter({ text: "Sino kaya ang mapalad? | Iyong Bot Official" });

                    await interaction.editReply({ embeds: [shuffleEmbed], components: [] });
                    await sleep(
                        
