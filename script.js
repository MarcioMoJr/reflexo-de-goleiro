const buscar = (id) => document.getElementById(id);

const botaoConectar = buscar("botaoConectar");
const botaoIniciar = buscar("botaoIniciar");

const nomeParticipante = buscar("nomeParticipante");

const pontoConexao = buscar("pontoConexao");
const textoConexao = buscar("textoConexao");

const estadoJogo = buscar("estadoJogo");
const statusJogo = buscar("statusJogo");

const acertosElemento = buscar("acertos");
const errosElemento = buscar("erros");
const restantesElemento = buscar("restantes");

const ultimoTempoElemento = buscar("ultimoTempo");
const mediaTempoElemento = buscar("mediaTempo");

const segmentosProgresso = buscar("segmentosProgresso");

const seletorNivel = buscar("seletorNivel");

const abasRanking = buscar("abasRanking");
const corpoRanking = buscar("corpoRanking");
const rankingVazio = buscar("rankingVazio");

const botaoLimparRanking = buscar("botaoLimparRanking");
const aviso = buscar("aviso");


// Precisa ser igual ao META_PONTOS do .ino
const TOTAL_ACERTOS = 10;

// v2: o ranking agora guarda nível e tempo médio.
// O ranking antigo (v1) fica esquecido no navegador,
// sem atrapalhar.
const CHAVE_RANKING = "reflexo-goleiro-ranking-v2";

// Teto de segurança por nível. É bem alto de propósito
// (o localStorage aguenta bem mais que isso).
const LIMITE_POR_NIVEL = 1000;

// Quanto tempo esperar o Arduino confirmar o início
const TEMPO_ESPERA_ARDUINO = 4000;

// Usado só pra ordenar resultados sem tempo
const SEM_TEMPO = 1e9;

// Tempo (ms) que cada alvo fica aceso em cada nível.
// É aqui que se muda a dificuldade; o Arduino recebe o
// valor no comando START|tempo e só valida o intervalo.
// Os botões do seletor e as abas do ranking nascem desta lista.
const NIVEIS = {
    facil:   { nome: "Fácil",   tempo: 2000 },
    normal:  { nome: "Normal",  tempo: 1500 },
    dificil: { nome: "Difícil", tempo: 500}
};

const NIVEL_PADRAO = "normal";


let porta = null;

let leitor = null;

let conectado = false;

let partidaAtiva = false;

// Comando START enviado, ainda sem JOGO_INICIADO de volta
let aguardandoArduino = false;

let participanteAtual = "";

let acertos = 0;

let erros = 0;

// Tempos de reação (ms) dos acertos da partida atual
let temposAcertos = [];

// Nível escolhido no seletor
let nivelSelecionado = NIVEL_PADRAO;

// Nível travado no momento em que a partida começa
let nivelPartida = NIVEL_PADRAO;

// Nível cujo ranking está aparecendo
let nivelRanking = NIVEL_PADRAO;

let tempoAviso;

let tempoEspera;


function emPartida() {

    return partidaAtiva || aguardandoArduino;

}


function formatarTempo(ms) {

    if (
        typeof ms !== "number" ||
        !Number.isFinite(ms)
    ) {
        return "—";
    }

    return (
        (ms / 1000)
            .toFixed(2)
            .replace(".", ",") +
        " s"
    );

}


function formatarSegundos(ms) {

    return (
        (ms / 1000).toLocaleString("pt-BR") +
        " s"
    );

}


function calcularMedia() {

    if (!temposAcertos.length) return null;

    const soma =
        temposAcertos.reduce(
            (total, tempo) => total + tempo,
            0
        );

    return Math.round(
        soma / temposAcertos.length
    );

}


function mostrarAviso(mensagem) {

    aviso.textContent = mensagem;

    aviso.classList.add("show");

    clearTimeout(tempoAviso);

    tempoAviso = setTimeout(
        () => aviso.classList.remove("show"),
        2200
    );

}


function definirStatus(mensagem, tipo = "") {

    statusJogo.textContent = mensagem;

    statusJogo.className =
        `status-jogo ${tipo}`.trim();

}


function definirEstadoJogo(mensagem, tipo = "") {

    estadoJogo.textContent = mensagem;

    estadoJogo.className =
        `estado-jogo ${tipo}`.trim();

}


// Habilita/desabilita o botão de iniciar e trava o
// seletor de nível enquanto a partida está rolando.
function atualizarControles() {

    const ocupado = emPartida();

    botaoIniciar.disabled =
        !nomeParticipante.value.trim() ||
        ocupado ||
        !conectado;

    seletorNivel
        .querySelectorAll("button")
        .forEach((botao) => {
            botao.disabled = ocupado;
        });

}


function mostrarProgresso() {

    segmentosProgresso.innerHTML = "";

    for (
        let i = 1;
        i <= TOTAL_ACERTOS;
        i++
    ) {

        const segmento =
            document.createElement("span");

        segmento.className =
            `segmento-progresso${
                i <= acertos ? " ativo" : ""
            }`;

        segmentosProgresso.appendChild(segmento);

    }

}


function atualizarPlacar() {

    acertosElemento.textContent = acertos;

    errosElemento.textContent = erros;

    restantesElemento.textContent =
        Math.max(TOTAL_ACERTOS - acertos, 0);

    const ultimo =
        temposAcertos.length
            ? temposAcertos[temposAcertos.length - 1]
            : null;

    ultimoTempoElemento.textContent =
        formatarTempo(ultimo);

    mediaTempoElemento.textContent =
        formatarTempo(calcularMedia());

    mostrarProgresso();

}


function zerarPlacar() {

    acertos = 0;

    erros = 0;

    temposAcertos = [];

    atualizarPlacar();

}


// ==========================================
// NÍVEIS
// ==========================================

function atualizarNiveis() {

    seletorNivel
        .querySelectorAll("button")
        .forEach((botao) => {

            const ativo =
                botao.dataset.nivel === nivelSelecionado;

            botao.classList.toggle("ativo", ativo);

            botao.setAttribute(
                "aria-pressed",
                String(ativo)
            );

        });

    abasRanking
        .querySelectorAll("button")
        .forEach((aba) => {

            const ativa =
                aba.dataset.nivel === nivelRanking;

            aba.classList.toggle("ativa", ativa);

            aba.setAttribute(
                "aria-pressed",
                String(ativa)
            );

        });

}


function selecionarNivel(id) {

    if (emPartida()) return;

    nivelSelecionado = id;

    // O ranking acompanha o nível escolhido
    nivelRanking = id;

    atualizarNiveis();

    mostrarRanking();

}


function selecionarAbaRanking(id) {

    nivelRanking = id;

    atualizarNiveis();

    mostrarRanking();

}


function montarNiveis() {

    seletorNivel.innerHTML = "";

    abasRanking.innerHTML = "";

    Object.entries(NIVEIS).forEach(
        ([id, nivel]) => {

            const botao =
                document.createElement("button");

            botao.type = "button";

            botao.className = "botao-nivel";

            botao.dataset.nivel = id;

            // Nome do nível + tempo de cada alvo
            botao.innerHTML =
                `${nivel.nome} ` +
                `<span class="tempo-nivel">` +
                `${formatarSegundos(nivel.tempo)}</span>`;

            botao.addEventListener(
                "click",
                () => selecionarNivel(id)
            );

            seletorNivel.appendChild(botao);


            const aba =
                document.createElement("button");

            aba.type = "button";

            aba.className = "aba-ranking";

            aba.dataset.nivel = id;

            aba.textContent = nivel.nome;

            aba.addEventListener(
                "click",
                () => selecionarAbaRanking(id)
            );

            abasRanking.appendChild(aba);

        }
    );

    atualizarNiveis();

}


// ==========================================
// CONEXÃO
// ==========================================

function definirEstadoConexao(estado) {

    conectado = estado;

    pontoConexao.classList.toggle(
        "conectado",
        estado
    );

    textoConexao.textContent =
        estado
            ? "Conectado"
            : "Desconectado";

    botaoConectar.textContent =
        estado
            ? "Desconectar"
            : "Conectar Arduino";

    atualizarControles();

}


async function conectarArduino() {

    if (!("serial" in navigator)) {

        definirStatus(
            "Web Serial não está disponível neste navegador.",
            "error"
        );

        mostrarAviso(
            "Use o Chrome em localhost ou HTTPS."
        );

        return;
    }


    if (conectado) {

        await desconectarArduino(true);

        return;
    }


    try {

        porta =
            await navigator.serial.requestPort();

        await porta.open({
            baudRate: 9600
        });

        definirEstadoConexao(true);

        definirStatus(
            "Arduino conectado. Digite o nome para iniciar."
        );

        mostrarAviso(
            "Arduino conectado."
        );

        lerSerial();

    } catch (erro) {

        console.error(erro);

        porta = null;

        definirEstadoConexao(false);

        definirStatus(
            erro.name === "NotFoundError"
                ? "Conexão cancelada."
                : "Não foi possível conectar ao Arduino.",
            erro.name === "NotFoundError"
                ? ""
                : "error"
        );

    }

}


async function desconectarArduino(mensagem = false) {

    partidaAtiva = false;

    aguardandoArduino = false;

    clearTimeout(tempoEspera);

    try {

        if (leitor) {
            await leitor.cancel();
        }

    } catch (_) {}

    leitor = null;

    try {

        if (porta) {
            await porta.close();
        }

    } catch (_) {}

    porta = null;

    definirEstadoConexao(false);

    definirEstadoJogo(
        "AGUARDANDO PARTIDA"
    );

    if (mensagem) {
        definirStatus(
            "Arduino desconectado."
        );
    }

}


async function lerSerial() {

    if (!porta?.readable) return;

    const decodificador =
        new TextDecoderStream();

    const fechamento =
        porta.readable.pipeTo(
            decodificador.writable
        );

    leitor =
        decodificador.readable.getReader();

    let buffer = "";


    try {

        while (true) {

            const { value, done } =
                await leitor.read();

            if (done) break;

            buffer += value || "";

            const linhas =
                buffer.split(/\r?\n/);

            buffer =
                linhas.pop() || "";

            linhas.forEach((linha) => {

                tratarLinhaSerial(
                    linha.trim()
                );

            });

        }

    } catch (erro) {

        console.error(
            "Serial:",
            erro
        );

        if (conectado) {

            definirStatus(
                "A conexão com o Arduino foi interrompida.",
                "error"
            );

            mostrarAviso(
                "Arduino desconectado."
            );

        }

    } finally {

        leitor = null;

        try {
            await fechamento;
        } catch (_) {}

    }

}


// ==========================================
// MENSAGENS DO ARDUINO
//
// JOGO_INICIADO|tempoMs
// PONTOS|total|reacaoMs
// TEMPO_ESGOTADO
// FIM|total
// ==========================================

function limitarAcertos(valor) {

    return Math.min(
        Math.max(valor, 0),
        TOTAL_ACERTOS
    );

}


function tratarLinhaSerial(linha) {

    if (!linha) return;


    if (
        linha === "JOGO_INICIADO" ||
        linha.startsWith("JOGO_INICIADO|")
    ) {

        // O Arduino confirmou: agora a partida vale.
        // O placar e o nome já foram definidos em
        // iniciarPartida().

        clearTimeout(tempoEspera);

        aguardandoArduino = false;

        partidaAtiva = true;

        atualizarControles();

        definirEstadoJogo(
            "PARTIDA EM ANDAMENTO",
            "live"
        );

        definirStatus(
            `Valendo, ${participanteAtual}! ` +
            `Nível ${NIVEIS[nivelPartida].nome}.`,
            "live"
        );

    }


    else if (linha === "TEMPO_ESGOTADO") {

        erros++;

        atualizarPlacar();

        definirStatus(
            "Tempo esgotado.",
            "error"
        );

    }


    else if (linha.startsWith("PONTOS|")) {

        const partes = linha.split("|");

        const valor = Number(partes[1]);

        if (!Number.isNaN(valor)) {

            acertos = limitarAcertos(valor);

            // Tempo de reação (ms) deste acerto.
            // Se o Arduino for uma versão antiga e não
            // mandar o tempo, a partida segue sem ele.
            if (
                partes.length > 2 &&
                partes[2] !== ""
            ) {

                const tempo = Number(partes[2]);

                if (
                    Number.isFinite(tempo) &&
                    tempo >= 0
                ) {
                    temposAcertos.push(tempo);
                }

            }

            atualizarPlacar();

        }

    }


    else if (linha.startsWith("FIM|")) {

        const valor =
            Number(
                linha.split("|")[1]
            );

        if (!Number.isNaN(valor)) {

            acertos = limitarAcertos(valor);

        }

        atualizarPlacar();

        finalizarPartida();

    }

}


async function enviarComando(comando) {

    if (!porta?.writable) {

        throw new Error(
            "Arduino não conectado."
        );

    }

    const escritor =
        porta.writable.getWriter();


    try {

        await escritor.write(
            new TextEncoder().encode(
                `${comando}\n`
            )
        );

    } finally {

        escritor.releaseLock();

    }

}


function arduinoNaoRespondeu() {

    // Se o JOGO_INICIADO chegou nesse meio tempo,
    // não há o que avisar.
    if (!aguardandoArduino) return;

    aguardandoArduino = false;

    definirEstadoJogo(
        "AGUARDANDO PARTIDA"
    );

    definirStatus(
        "O Arduino não respondeu. Confira se o código " +
        "novo foi gravado ou reinicie o Arduino.",
        "error"
    );

    mostrarAviso(
        "Arduino sem resposta."
    );

    atualizarControles();

}


async function iniciarPartida() {

    const nome =
        nomeParticipante.value.trim();


    if (!nome) {

        nomeParticipante.focus();

        mostrarAviso(
            "Digite o nome do participante."
        );

        return;

    }


    if (emPartida()) return;


    if (!conectado) {

        mostrarAviso(
            "Conecte o Arduino primeiro."
        );

        return;

    }


    participanteAtual = nome;

    // O nível fica travado desde o início da partida
    nivelPartida = nivelSelecionado;

    zerarPlacar();

    aguardandoArduino = true;

    atualizarControles();

    definirEstadoJogo(
        "INICIANDO..."
    );

    definirStatus(
        "Aguardando o Arduino..."
    );


    try {

        await enviarComando(
            `START|${NIVEIS[nivelPartida].tempo}`
        );

        tempoEspera = setTimeout(
            arduinoNaoRespondeu,
            TEMPO_ESPERA_ARDUINO
        );

    } catch (erro) {

        console.error(erro);

        aguardandoArduino = false;

        partidaAtiva = false;

        atualizarControles();

        definirEstadoJogo(
            "AGUARDANDO PARTIDA"
        );

        definirStatus(
            "Não foi possível iniciar a partida.",
            "error"
        );

        mostrarAviso(
            "Falha ao enviar START."
        );

    }

}


// ==========================================
// RANKING
//
// Cada resultado é guardado assim:
// { nome, nivel, acertos, erros, tempoMedio }
// Ordem: mais acertos, menos erros e, no desempate,
// menor tempo médio de reação.
// ==========================================

function obterRanking() {

    try {

        const dados =
            JSON.parse(
                localStorage.getItem(
                    CHAVE_RANKING
                )
            );

        return Array.isArray(dados)
            ? dados
            : [];

    } catch {

        return [];

    }

}


function gravarRanking(lista) {

    try {

        localStorage.setItem(
            CHAVE_RANKING,
            JSON.stringify(lista)
        );

        return true;

    } catch (erro) {

        console.error(erro);

        mostrarAviso(
            "Não foi possível salvar o ranking."
        );

        return false;

    }

}


function compararResultados(a, b) {

    return (
        b.acertos - a.acertos ||
        a.erros - b.erros ||
        (a.tempoMedio ?? SEM_TEMPO) -
        (b.tempoMedio ?? SEM_TEMPO)
    );

}


function salvarResultado(resultado) {

    const todos = obterRanking();

    todos.push(resultado);

    // Aplica o teto de cada nível separadamente,
    // mantendo os melhores resultados.
    const mantidos =
        Object.keys(NIVEIS).flatMap(
            (id) =>
                todos
                    .filter((item) => item.nivel === id)
                    .sort(compararResultados)
                    .slice(0, LIMITE_POR_NIVEL)
        );

    gravarRanking(mantidos);

}


function mostrarRanking() {

    const ranking =
        obterRanking()
            .filter(
                (item) => item.nivel === nivelRanking
            )
            .sort(compararResultados);

    corpoRanking.innerHTML = "";

    rankingVazio.hidden =
        ranking.length > 0;


    ranking.forEach(
        (item, indice) => {

            const linha =
                document.createElement("tr");

            linha.innerHTML = `
                <td>${indice + 1}º</td>
                <td>${escaparHTML(item.nome)}</td>
                <td>${item.acertos}</td>
                <td>${item.erros}</td>
                <td>${formatarTempo(item.tempoMedio)}</td>
            `;

            corpoRanking.appendChild(
                linha
            );

        }
    );

}


function escaparHTML(valor) {

    const elemento =
        document.createElement("div");

    elemento.textContent = valor;

    return elemento.innerHTML;

}


function finalizarPartida() {

    partidaAtiva = false;

    aguardandoArduino = false;

    clearTimeout(tempoEspera);

    const nome =
        participanteAtual || "Participante";

    const tempoMedio = calcularMedia();

    salvarResultado({
        nome,
        nivel: nivelPartida,
        acertos,
        erros,
        tempoMedio
    });

    // Mostra o ranking do nível que acabou de ser jogado
    nivelRanking = nivelPartida;

    atualizarNiveis();

    mostrarRanking();

    definirEstadoJogo(
        "PARTIDA FINALIZADA",
        "finished"
    );

    definirStatus(
        `${nome} (${NIVEIS[nivelPartida].nome}): ` +
        `${acertos} acertos e ${erros} erros` +
        (
            tempoMedio === null
                ? ""
                : `, tempo médio ${formatarTempo(tempoMedio)}`
        ) +
        `. Resultado salvo.`,
        "live"
    );

    mostrarAviso(
        "Partida encerrada e salva no ranking."
    );

    atualizarControles();


    setTimeout(() => {

        // Se já começou outra partida nesse meio tempo,
        // não mexe no placar dela.
        if (emPartida()) return;

        participanteAtual = "";

        nomeParticipante.value = "";

        zerarPlacar();

        definirEstadoJogo(
            "AGUARDANDO PRÓXIMO PARTICIPANTE"
        );

        definirStatus(
            conectado
                ? "Pronto para o próximo participante."
                : "Conecte o Arduino para começar."
        );

        atualizarControles();

    }, 1200);

}


botaoLimparRanking.addEventListener(
    "click",
    () => {

        const nomeNivel =
            NIVEIS[nivelRanking].nome;

        const todos = obterRanking();

        const restantes =
            todos.filter(
                (item) => item.nivel !== nivelRanking
            );

        if (restantes.length === todos.length) {

            mostrarAviso(
                `O ranking do nível ${nomeNivel} já está vazio.`
            );

            return;
        }


        if (
            !window.confirm(
                `Apagar todos os resultados do nível ${nomeNivel}?`
            )
        ) {
            return;
        }


        if (!gravarRanking(restantes)) return;

        mostrarRanking();

        mostrarAviso(
            `Ranking do nível ${nomeNivel} apagado.`
        );

    }
);


botaoConectar.addEventListener(
    "click",
    conectarArduino
);

botaoIniciar.addEventListener(
    "click",
    iniciarPartida
);


nomeParticipante.addEventListener(
    "input",
    atualizarControles
);


nomeParticipante.addEventListener(
    "keydown",
    (evento) => {

        if (
            evento.key === "Enter" &&
            !botaoIniciar.disabled
        ) {
            iniciarPartida();
        }

    }
);


if ("serial" in navigator) {

    navigator.serial.addEventListener(
        "disconnect",
        async () => {

            if (porta) {

                await desconectarArduino();

                definirStatus(
                    "Arduino desconectado.",
                    "error"
                );

                mostrarAviso(
                    "Arduino desconectado."
                );

            }

        }
    );

} else {

    botaoConectar.disabled = true;

    definirStatus(
        "Web Serial não está disponível. " +
        "Use Chrome em localhost ou HTTPS.",
        "error"
    );

}


montarNiveis();

atualizarPlacar();

mostrarRanking();

atualizarControles();
