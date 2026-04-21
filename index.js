require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

const discordTranscripts = require("discord-html-transcripts");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===================== CONFIGURACIÓN =====================
const PREFIX = "!ludo";
const CREAR_FILA_ROLE_ID = "1486959938038136912";
const STAFF_ROLE_ID = "1476541425263968391";
const EXTRA_MOD_ROLE_ID = "1211760228673257524"; 
const LOG_CHANNEL_ID = "1486176116413825206";
const LOGO_LUDO_VG = "https://i.ibb.co/3ykMvRz/logo-ludo-vg.png";

const estadosFilas = new Map();

// ===================== EMOJIS =====================
const EMOJI_DADO_TITULO = "🎲";
const EMOJI_DINERO = "<a:money_sign:1350926754331627640>";
const EMOJI_DADO_FILA = "<:dados:1496079805060354119>";

// ===================== EMBEDS =====================
function embedPagos() {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("💰 MÉTODOS DE PAGO - LUDO APUESTAS")
    .setDescription(`━━━━━━━━━━━━━━━━━━\n**MÉTODOS DISPONIBLES**\n\n🏦 **Naranja X**\n┗ 👤 Alejo German Tolosa\n┗ 🔗 Alias: \`vg.apos\`\n\n🌐 **AstroPay**\n┗ 🔗 [Pagar aquí](https://onetouch.astropay.com/payment?external_reference_id=8lIV0oqyplqnZulPqVirFZbTf2rkhLsR)\n\n💎 **Binance**\n┗ 🆔 ID: \`729592524\`\n\n━━━━━━━━━━━━━━━━━━\n**COMISIONES DE MESA**\n\n🎲 Comisión de **200 ARS** en Discord\n🟢 Partidas menores a **2.500 ARS** → **SIN comisión**\n⚠️ Jugadas fuera de Discord → **10% del monto**\n\n━━━━━━━━━━━━━━━━━━\n**VAGANCIA LUDO SYSTEM**`)
    .setFooter({ text: "VAGANCIA • LUDO CLUB", iconURL: LOGO_LUDO_VG });
}

function crearEmbedFila(data = { f1: null, f2: null, f3: null }) {
  const p1 = data.f1 ? `<@${data.f1}>` : "*Esperando rival...*";
  const p2 = data.f2 ? `<@${data.f2}>` : "*Esperando rival...*";
  const p3 = data.f3 ? `<@${data.f3}>` : "*Esperando rival...*";

  return new EmbedBuilder()
    .setColor(0xFACC15)
    .setTitle(`${EMOJI_DADO_TITULO} | ¡FILA DE LUDO ACTIVA!`)
    .setDescription(`**Modalidad:** Apostado ${EMOJI_DINERO}\n**Juego:** Ludo Club / King\n\n**Mesas disponibles:**\n${EMOJI_DADO_FILA} **Mesa 1:** ${p1}\n${EMOJI_DADO_FILA} **Mesa 2:** ${p2}\n${EMOJI_DADO_FILA} **Mesa 3:** ${p3}\n\n*¡Entra a una mesa para coordinar el monto!*`)
    .setThumbnail(LOGO_LUDO_VG) 
    .setFooter({ text: "VAGANCIA • EL REY DE LOS DADOS" });
}

function botonesTripleFila() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_f1").setLabel("Mesa 1").setEmoji("🎲").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("btn_f2").setLabel("Mesa 2").setEmoji("🎲").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("btn_f3").setLabel("Mesa 3").setEmoji("🎲").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("salir_fila").setLabel("Salir").setEmoji("✖️").setStyle(ButtonStyle.Danger)
  );
}

// ===================== LOGICA =====================
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.content !== PREFIX) return;
  const esAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const tieneRol = message.member.roles.cache.has(CREAR_FILA_ROLE_ID);
  if (!esAdmin && !tieneRol) return;

  const msg = await message.channel.send({
    embeds: [crearEmbedFila()],
    components: [botonesTripleFila()],
  });
  estadosFilas.set(msg.id, { f1: null, f2: null, f3: null });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "cerrar_partida") {
    const puedeCerrar = interaction.member.roles.cache.has(STAFF_ROLE_ID) || interaction.member.roles.cache.has(EXTRA_MOD_ROLE_ID) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!puedeCerrar) return interaction.reply({ content: "❌ Solo Staff.", ephemeral: true });
    
    const canalDestino = interaction.channel;
    await interaction.reply({ content: "💾 Guardando registro...", ephemeral: true });
    
    try {
      const attachment = await discordTranscripts.createTranscript(canalDestino, { limit: -1, fileName: `ludo-${canalDestino.name}.html`, saveImages: true, poweredBy: false });
      const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) await logChannel.send({ content: `📝 **Reporte Ludo**\nCerrado por: <@${interaction.user.id}>`, files: [attachment] });
    } catch (e) { console.error(e); }
    setTimeout(() => canalDestino.delete().catch(() => {}), 2000);
    return;
  }

  // SI LA FILA NO EXISTE EN MEMORIA, LA CREAMOS DE NUEVO
  if (!estadosFilas.has(interaction.message.id)) {
    estadosFilas.set(interaction.message.id, { f1: null, f2: null, f3: null });
  }

  const data = estadosFilas.get(interaction.message.id);
  const userId = interaction.user.id;

  if (interaction.customId === "salir_fila") {
    if (data.f1 === userId) data.f1 = null;
    if (data.f2 === userId) data.f2 = null;
    if (data.f3 === userId) data.f3 = null;
    return await interaction.update({ embeds: [crearEmbedFila(data)] });
  }

  const mapping = { "btn_f1": "f1", "btn_f2": "f2", "btn_f3": "f3" };
  const filaKey = mapping[interaction.customId];
  if (!filaKey) return;

  if (data.f1 === userId || data.f2 === userId || data.f3 === userId) {
    if (data[filaKey] !== userId) return interaction.reply({ content: "⚠️ Ya estás en una mesa.", ephemeral: true });
  }

  if (!data[filaKey]) {
    data[filaKey] = userId;
    await interaction.update({ embeds: [crearEmbedFila(data)] });
  } else {
    if (data[filaKey] === userId) return interaction.reply({ content: "⚠️ Ya estás anotado.", ephemeral: true });
    const rivalId = data[filaKey];
    data[filaKey] = null; 
    await interaction.update({ embeds: [crearEmbedFila(data)] });
    
    // Crear canal privado
    const guild = interaction.guild;
    const parent = interaction.channel.parent;
    const nombres = [rivalId, userId].map(id => guild.members.cache.get(id)?.user.username || "jugador").join("-vs-").toLowerCase();
    
    const canal = await guild.channels.create({
      name: `🎲┃${nombres}`,
      type: ChannelType.GuildText,
      parent,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: rivalId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    const embedMatch = new EmbedBuilder().setColor(0x3b82f6).setTitle("🏁 PARTIDA LISTA").setDescription(`**DUELO DE DADOS**\n<@${rivalId}> **VS** <@${userId}>\n\n━━━━━━━━━━━━━━━━━━\n💰 **PASEN CAPTURA DE PAGO AQUÍ**\n━━━━━━━━━━━━━━━━━━`).setThumbnail(LOGO_LUDO_VG);
    await canal.send({ content: `<@${rivalId}> <@${userId}> <@&${STAFF_ROLE_ID}>`, embeds: [embedMatch, embedPagos()], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("cerrar_partida").setLabel("FINALIZAR").setEmoji("🛑").setStyle(ButtonStyle.Danger))] });
  }
});

client.once("ready", () => console.log("🎲 Bot de Ludo Online"));
client.login(process.env.TOKEN);