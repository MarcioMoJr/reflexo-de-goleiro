# Reflexo de Goleiro

Jogo de reflexo com Arduino: 3 sensores ultrassônicos (HC-SR04) e 3 LEDs. Um LED acende, o jogador passa a mão na frente do sensor correspondente, e o placar aparece numa página web, com nome do participante e ranking das partidas.

## Arquivos

- `index.html` — estrutura da interface
- `style.css` — visual do placar e do histórico
- `script.js` — conexão via Web Serial, placar e ranking
- `reflexo_de_goleiro.ino` — código do Arduino

## Como jogar

1. Liga o Arduino no computador por USB.
2. Abre o `index.html` no **Chrome** ou no **Edge**.
3. Clica em **Conectar Arduino** e escolhe a porta na lista.
4. Digita o nome do participante.
5. Clica em **Iniciar partida**.
6. A partida termina em **10 acertos**. Cada alvo fica aceso por **1,5 segundo**; se não reagir a tempo, conta como erro e troca o alvo sozinho.
7. No fim, o resultado (acertos e erros) é salvo no ranking, guardado no navegador.

## Comunicação serial

O site manda `START` pra começar a partida. O Arduino responde:

- `JOGO_INICIADO` — confirma que a partida começou
- `PONTOS|n` — a cada acerto, com o total atual
- `TEMPO_ESGOTADO` — quando o alvo não é tocado a tempo
- `FIM|n` — ao chegar em 10 acertos, com o total final

O alvo (qual LED está aceso) é decidido só pelo Arduino e não é enviado ao site.

## Pinos

- **LEDs:** direita = 8, centro = 9, esquerda = 10
- **Sensores (TRIG/ECHO):** direita = 2/3, centro = 4/5, esquerda = 6/7
- **A0** precisa ficar sem nada ligado, é usado só pra variar o primeiro sorteio (`randomSeed`)

## Execução

- Use **Chrome** ou **Edge** — é o que tem suporte a Web Serial.
- **Fecha o Monitor Serial do Arduino IDE** antes de conectar pelo site; os dois não conseguem usar a porta ao mesmo tempo.
- O projeto é feito pra uso em computador, sem CSS de responsividade pra celular.

## Ajustes rápidos

- **Distância que conta como "mão no sensor":** `15` cm, no `.ino` (procure por `< 15`).
- **Tempo de reação:** `TEMPO_ALVO = 1500` (em milissegundos), no início do `.ino`.
- **Meta de pontos:** `10`, repetida no `.ino` (`pontos >= 10`) e no `script.js` (`TOTAL_ACERTOS`). Pra mudar, precisa trocar nos dois arquivos.