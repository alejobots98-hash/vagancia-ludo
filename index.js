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

const estadosFilas = new Map();

// ===================== EMOJIS TEMÁTICOS =====================
const EMOJI_DADO_TITULO = "🎲";
const EMOJI_TABLERO = "🏁";
const EMOJI_DINERO = "<a:money_sign:1350926754331627640>";
const EMOJI_DADO_FILA = "<:dados:1496079805060354119>"; // Tu emoji personalizado

// ===================== EMBED PAGOS (LUDO VER.) =====================
function embedPagos() {
  return new EmbedBuilder()
    .setColor(0x22c55e) // Verde
    .setTitle("💰 MÉTODOS DE PAGO - LUDO APUESTAS")
    .setDescription(
`━━━━━━━━━━━━━━━━━━
**MÉTODOS DISPONIBLES**

🏦 **Naranja X**
┗ 👤 Alejo German Tolosa  
┗ 🔗 Alias: \`vg.apos\`

🌐 **AstroPay**
┗ 🔗 [Pagar aquí](https://onetouch.astropay.com/payment?external_reference_id=8lIV0oqyplqnZulPqVirFZbTf2rkhLsR)

💎 **Binance**
┗ 🆔 ID: \`729592524\`

━━━━━━━━━━━━━━━━━━
**COMISIONES DE MESA**

🎲 Comisión de **200 ARS** en Discord
🟢 Partidas menores a **2.500 ARS** → **SIN comisión**
⚠️ Jugadas fuera de Discord → **10% del monto**

━━━━━━━━━━━━━━━━━━
**VAGANCIA LUDO SYSTEM**
🛡️ **Garantía de pago y transparencia**`
    )
    .setFooter({ 
      text: "VAGANCIA • LUDO CLUB",
      iconURL: "https://i.imgur.com/NAKqQ4W.jpeg" 
    });
}

// ===================== EMBED FILA (LUDO VER.) CORREGIDO =====================
function crearEmbedFila(data = { f1: null, f2: null, f3: null }) {
  const p1 = data.f1 ? `<@${data.f1}>` : "*Esperando rival...*";
  const p2 = data.f2 ? `<@${data.f2}>` : "*Esperando rival...*";
  const p3 = data.f3 ? `<@${data.f3}>` : "*Esperando rival...*";

  return new EmbedBuilder()
    .setColor(0xFACC15) // Amarillo
    .setTitle(`${EMOJI_DADO_TITULO} | ¡FILA DE LUDO ACTIVA!`)
    .setDescription(
`**Modalidad:** Apostado ${EMOJI_DINERO}
**Juego:** Ludo Club / King

**Mesas disponibles:**
${EMOJI_DADO_FILA} **Mesa 1:** ${p1}
${EMOJI_DADO_FILA} **Mesa 2:** ${p2}
${EMOJI_DADO_FILA} **Mesa 3:** ${p3}

*¡Entra a una mesa para coordinar el monto!*`
    )
    // Logo de Ludo VG puesto como Thumbnail (al costadito arriba)
    .setThumbnail("https://i.imgur.com/8m5XN3u.png") 
    .setFooter({ text: "VAGANCIA • EL REY DE LOS DADOS" });
}

// ===================== BOTONES =====================
function botonesTripleFila() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_f1").setLabel("Mesa 1").setEmoji("🎲").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("btn_f2").setLabel("Mesa 2").setEmoji("🎲").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("btn_f3").setLabel("Mesa 3").setEmoji("🎲").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("salir_fila").setLabel("Salir").setEmoji("✖️").setStyle(ButtonStyle.Danger)
  );
}

// ===================== EVENTO MENSAJE =====================
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.content !== PREFIX) return;

  const esAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const tieneRol = message.member.roles.cache.has(CREAR_FILA_ROLE_ID);

  if (!esAdmin && !tieneRol) return message.reply("❌ No tenés permisos.");

  const msg = await message.channel.send({
    embeds: [crearEmbedFila()],
    components: [botonesTripleFila()],
  });

  estadosFilas.set(msg.id, { f1: null, f2: null, f3: null });
});

// ===================== EVENTO INTERACCIÓN =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "cerrar_partida") {
    const puedeCerrar = interaction.member.roles.cache.has(STAFF_ROLE_ID) || 
                        interaction.member.roles.cache.has(EXTRA_MOD_ROLE_ID) ||
                        interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!puedeCerrar) {
      return interaction.reply({ content: "❌ Solo el staff cierra la mesa.", ephemeral: true });
    }
    
    const canalDestino = interaction.channel;
    await interaction.reply({ content: "💾 Guardando registro de la partida...", ephemeral: true });
    
    try {
      const attachment = await discordTranscripts.createTranscript(canalDestino, {
        limit: -1, fileName: `ludo-${canalDestino.name}.html`, saveImages: true, poweredBy: false,
      });
      const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        await logChannel.send({
          content: `📝 **Reporte de Mesa Ludo**\nCanal: \`${canalDestino.name}\`\nCerrado por: <@${interaction.user.id}>`,
          files: [attachment],
        });
      }
    } catch (e) { console.error("Error transcript:", e); }

    setTimeout(async () => {
      try { if (canalDestino?.deletable) await canalDestino.delete(); } catch (err) {}
    }, 2000);
    return;
  }

  const data = estadosFilas.get(interaction.message.id);
  if (!data) return interaction.reply({ content: "❌ Fila expirada.", ephemeral: true });

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
    if (data[filaKey] === userId) return interaction.reply({ content: "⚠️ Ya estás anotado aquí.", ephemeral: true });
    
    const rivalId = data[filaKey];
    data[filaKey] = null; 

    await interaction.update({ embeds: [crearEmbedFila(data)] });
    await crearCanalPrivado(interaction, [rivalId, userId]);
  }
});

// ===================== CANAL PRIVADO (SÓLO PAGOS Y COMISIÓN) =====================
async function crearCanalPrivado(interaction, jugadores) {
  const guild = interaction.guild;
  const parent = interaction.channel.parent;

  const nombres = jugadores
    .map((id) => guild.members.cache.get(id)?.user.username || "player")
    .join("-vs-")
    .toLowerCase().replace(/[^a-z0-9\-]/g, "").slice(0, 80);

  const canal = await guild.channels.create({
    name: `🎲┃${nombres}`,
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ...jugadores.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] })),
    ],
  });

  const embedMatch = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle("🏁 PARTIDA LISTA")
    .setDescription(
`**DUELO DE DADOS**
<@${jugadores[0]}> **VS** <@${jugadores[1]}>

━━━━━━━━━━━━━━━━━━
💰 **PASEN CAPTURA DE PAGO AQUÍ**
⚠️ No inicien sin el OK del Staff.
━━━━━━━━━━━━━━━━━━`
    );

  await canal.send({ 
    content: `${jugadores.map(id => `<@${id}>`).join(" ")} <@&${STAFF_ROLE_ID}>`, 
    embeds: [embedMatch, embedPagos()], 
    components: [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("cerrar_partida").setLabel("FINALIZAR Y BORRAR").setEmoji("🛑").setStyle(ButtonStyle.Danger)
        )
    ]
  });
}

client.once("ready", () => console.log(`🎲 Ludo Bot listo como ${client.user.tag}`));
client.login(process.env.TOKEN);