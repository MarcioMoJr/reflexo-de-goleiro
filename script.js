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

const segmentosProgresso = buscar("segmentosProgresso");

const corpoRanking = buscar("corpoRanking");
const rankingVazio = buscar("rankingVazio");

const botaoLimparRanking = buscar("botaoLimparRanking");
const aviso = buscar("aviso");


const TOTAL_ACERTOS = 10;

const CHAVE_RANKING = "reflexo-goleiro-ranking-v1";


let porta = null;

let leitor = null;

let conectado = false;

let partidaAtiva = false;

let participanteAtual = "";

let acertos = 0;

let erros = 0;

let tempoAviso;


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


function atualizarBotaoIniciar() {

    botaoIniciar.disabled =
        !nomeParticipante.value.trim() ||
        partidaAtiva ||
        !conectado;

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

    mostrarProgresso();

}


function zerarPlacar() {

    acertos = 0;

    erros = 0;

    atualizarPlacar();

}


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

    atualizarBotaoIniciar();

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


function tratarLinhaSerial(linha) {

    if (!linha) return;


    if (linha === "JOGO_INICIADO") {

        // O placar e a mensagem com o nome do
        // participante já foram definidos em
        // iniciarPartida(); aqui só confirmamos
        // o estado, sem sobrescrever nada.

        partidaAtiva = true;

        botaoIniciar.disabled = true;

        definirEstadoJogo(
            "PARTIDA EM ANDAMENTO",
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

        const valor =
            Number(
                linha.split("|")[1]
            );

        if (!Number.isNaN(valor)) {

            acertos =
                Math.min(
                    Math.max(valor, 0),
                    TOTAL_ACERTOS
                );

            atualizarPlacar();

        }

    }


    else if (linha.startsWith("FIM|")) {

        const valor =
            Number(
                linha.split("|")[1]
            );

        if (!Number.isNaN(valor)) {

            acertos =
                Math.min(
                    Math.max(valor, 0),
                    TOTAL_ACERTOS
                );

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


    if (partidaAtiva) return;


    if (!conectado) {

        mostrarAviso(
            "Conecte o Arduino primeiro."
        );

        return;

    }


    participanteAtual = nome;

    zerarPlacar();


    try {

        await enviarComando("START");

        partidaAtiva = true;

        botaoIniciar.disabled = true;

        definirEstadoJogo(
            "PARTIDA EM ANDAMENTO",
            "live"
        );

        definirStatus(
            `Valendo, ${participanteAtual}!`,
            "live"
        );

    } catch (erro) {

        console.error(erro);

        partidaAtiva = false;

        atualizarBotaoIniciar();

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


function salvarResultado(
    nome,
    acertos,
    erros
) {

    const ranking =
        obterRanking();

    ranking.push({
        nome,
        acertos,
        erros
    });

    ranking.sort(
        (a, b) =>
            b.acertos - a.acertos ||
            a.erros - b.erros
    );

    localStorage.setItem(
        CHAVE_RANKING,
        JSON.stringify(
            ranking.slice(0, 10)
        )
    );

}


function mostrarRanking() {

    const ranking =
        obterRanking();

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

    salvarResultado(
        participanteAtual || "Participante",
        acertos,
        erros
    );

    mostrarRanking();

    definirEstadoJogo(
        "PARTIDA FINALIZADA",
        "finished"
    );

    definirStatus(
        `${participanteAtual || "Participante"}: ` +
        `${acertos} acertos e ` +
        `${erros} erros. Resultado salvo.`,
        "live"
    );

    mostrarAviso(
        "Partida encerrada e salva no ranking."
    );

    atualizarBotaoIniciar();


    setTimeout(() => {

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

        atualizarBotaoIniciar();

    }, 1200);

}


botaoLimparRanking.addEventListener(
    "click",
    () => {

        if (!obterRanking().length) {

            mostrarAviso(
                "O ranking já está vazio."
            );

            return;
        }


        if (
            !window.confirm(
                "Apagar todos os resultados salvos neste navegador?"
            )
        ) {
            return;
        }


        localStorage.removeItem(
            CHAVE_RANKING
        );

        mostrarRanking();

        mostrarAviso(
            "Ranking apagado."
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
    atualizarBotaoIniciar
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


atualizarPlacar();

mostrarRanking();

atualizarBotaoIniciar();