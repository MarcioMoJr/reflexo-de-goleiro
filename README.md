# Reflexo de Goleiro

Jogo de reflexo com Arduino: 3 sensores ultrassônicos (HC-SR04) e 3 LEDs. Um LED acende, o jogador passa a mão na frente do sensor correspondente, e o placar aparece numa página web, com nome do participante, nível de dificuldade, tempo de reação e ranking por nível.

## Arquivos

- `index.html` — estrutura da interface
- `style.css` — visual do placar, do seletor de nível e do ranking
- `script.js` — conexão via Web Serial, placar, níveis e ranking
- `reflexo_de_goleiro.ino` — código do Arduino

## Como jogar

1. Liga o Arduino no computador por USB.
2. Abre o `index.html` no **Chrome** ou no **Edge**.
3. Clica em **Conectar Arduino** e escolhe a porta na lista.
4. Digita o nome do participante.
5. Escolhe o **nível** (Fácil, Normal ou Difícil).
6. Clica em **Iniciar partida**.
7. A partida termina em **10 acertos**. Cada alvo fica aceso pelo tempo do nível; se o jogador não reagir a tempo, conta como erro e o alvo troca sozinho.
8. No fim, o resultado (acertos, erros e tempo médio de reação) é salvo no ranking do nível jogado.

## Níveis

| Nível   | Tempo por alvo |
|---------|----------------|
| Fácil   | 2 s            |
| Normal  | 1,5 s          |
| Difícil | 1 s            |

O nível fica travado durante a partida.

## Ranking

- Cada nível tem o seu próprio ranking, em abas separadas.
- A ordem é: mais acertos, menos erros e, no desempate, menor tempo médio de reação.
- O tempo de reação é medido pelo Arduino, do LED acender até a mão ser detectada.
- O ranking fica salvo no navegador.
- O botão **Limpar** apaga o ranking do nível que está aberto.

## Regra do sensor livre

O acerto só vale se o sensor ficou livre depois que o LED acendeu. Deixar a mão parada na frente do sensor não rende ponto. Dá pra desligar com `EXIGIR_SENSOR_LIVRE = false` no `.ino`.

## Comunicação serial

O site manda `START|tempo` pra começar a partida, onde `tempo` é o tempo de cada alvo em milissegundos (por exemplo, `START|1000`). Só `START` também funciona e usa 1500 ms. O Arduino responde:

- `JOGO_INICIADO|tempo` — confirma que a partida começou
- `PONTOS|n|reacao` — a cada acerto, com o total atual e o tempo de reação em ms
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
- Grave o `.ino` no Arduino antes de abrir o site.
- O projeto é feito pra uso em computador, sem versão pra celular.

## Ajustes rápidos

- **Tempo de cada nível:** `NIVEIS`, no início do `script.js` (em milissegundos). O Arduino aceita de 300 a 5000 ms (`TEMPO_MIN` e `TEMPO_MAX`, no `.ino`).
- **Distância que conta como "mão no sensor":** `DISTANCIA_ACERTO = 15` (cm), no `.ino`.
- **Meta de pontos:** `10`, repetida no `.ino` (`META_PONTOS`) e no `script.js` (`TOTAL_ACERTOS`). Pra mudar, troque nos dois arquivos, nos textos "META 10" e "/ 10" do `index.html` e na barra de progresso do `style.css` (`repeat(10, 1fr)`).
- **Limite do ranking por nível:** `LIMITE_POR_NIVEL`, no `script.js`.
