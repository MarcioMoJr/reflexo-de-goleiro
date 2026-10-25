// ==========================================
// REFLEXO DE GOLEIRO — ARDUINO
// ==========================================

// ==========================================
// LEDs
// ==========================================

const int LED_DIREITA = 8;
const int LED_CENTRO = 9;
const int LED_ESQUERDA = 10;

// ==========================================
// SENSORES
// ==========================================

const int TRIG_DIREITA = 2;
const int ECHO_DIREITA = 3;

const int TRIG_CENTRO = 4;
const int ECHO_CENTRO = 5;

const int TRIG_ESQUERDA = 6;
const int ECHO_ESQUERDA = 7;

// ==========================================
// AJUSTES DO JOGO
// ==========================================

// Pontos para encerrar a partida (o site tem o mesmo
// valor em TOTAL_ACERTOS, no script.js)
const int META_PONTOS = 10;

// Distância (cm) que conta como "mão no sensor"
const int DISTANCIA_ACERTO = 15;

// Tempo que cada alvo fica aceso, em ms.
// Normalmente quem define é o site, pelo comando
// START|tempo. Se vier só "START", usa o padrão.
// Valores fora de MIN/MAX também caem no padrão.
const unsigned long TEMPO_PADRAO = 1500;
const unsigned long TEMPO_MIN = 300;
const unsigned long TEMPO_MAX = 5000;

// true  = o acerto só vale se o sensor estava livre
//         depois que o LED acendeu (evita deixar a
//         mão parada no sensor e "acertar" com 0 ms)
// false = comportamento antigo
const bool EXIGIR_SENSOR_LIVRE = true;

// ==========================================
// VARIÁVEIS DO JOGO
// ==========================================

int alvoAtual = 0;
int pontos = 0;
bool jogoAtivo = false;

unsigned long tempoAlvo = TEMPO_PADRAO;
unsigned long inicioAlvo;

bool sensorLivre = false;

// ==========================================
// LEITURA DO SENSOR ULTRASSÔNICO
// ==========================================

long distancia(int trig, int echo)
{
  digitalWrite(trig, LOW);
  delayMicroseconds(2);

  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  long tempo = pulseIn(echo, HIGH, 30000);

  if (tempo == 0)
  {
    return 999;
  }

  return tempo * 0.01723;
}

// ==========================================
// APAGA TODOS OS LEDs
// ==========================================

void apagarTodos()
{
  digitalWrite(LED_DIREITA, LOW);
  digitalWrite(LED_CENTRO, LOW);
  digitalWrite(LED_ESQUERDA, LOW);
}

// ==========================================
// ACENDE O LED DO ALVO
// ==========================================

void acenderAlvo()
{
  apagarTodos();

  if (alvoAtual == 1)
  {
    digitalWrite(LED_DIREITA, HIGH);
  }
  else if (alvoAtual == 2)
  {
    digitalWrite(LED_CENTRO, HIGH);
  }
  else if (alvoAtual == 3)
  {
    digitalWrite(LED_ESQUERDA, HIGH);
  }

  // Se a regra do sensor livre estiver desligada,
  // o sensor já conta como livre desde o início.
  sensorLivre = !EXIGIR_SENSOR_LIVRE;

  inicioAlvo = millis();
}

// ==========================================
// ESCOLHE OUTRO LED
// ==========================================

void escolherNovoAlvo()
{
  int alvoAnterior = alvoAtual;

  do
  {
    alvoAtual = random(1, 4);
  }
  while (alvoAtual == alvoAnterior);

  acenderAlvo();
}

// ==========================================
// INICIA O JOGO
// ==========================================

void iniciarJogo(unsigned long tempo)
{
  pontos = 0;
  jogoAtivo = true;
  tempoAlvo = tempo;

  alvoAtual = random(1, 4);
  acenderAlvo();

  Serial.print("JOGO_INICIADO|");
  Serial.println(tempoAlvo);
}

// ==========================================
// FIM DO JOGO
// ==========================================

void fimDoJogo()
{
  jogoAtivo = false;

  apagarTodos();

  Serial.print("FIM|");
  Serial.println(pontos);

  for (int i = 0; i < 3; i++)
  {
    digitalWrite(LED_DIREITA, HIGH);
    digitalWrite(LED_CENTRO, HIGH);
    digitalWrite(LED_ESQUERDA, HIGH);

    delay(300);

    apagarTodos();

    delay(300);
  }

  digitalWrite(LED_DIREITA, HIGH);
  digitalWrite(LED_CENTRO, HIGH);
  digitalWrite(LED_ESQUERDA, HIGH);

  alvoAtual = 0;
}

// ==========================================
// VERIFICA SE A MÃO CHEGOU NO SENSOR DO ALVO
// Devolve true se contou ponto (acertou), pra
// o loop() saber que pode pular a checagem de
// tempo nesta volta.
//
// A cada acerto manda PONTOS|total|tempo, onde
// tempo é o tempo de reação em ms (do LED acender
// até a mão ser detectada). Isso vale também para
// o último acerto: o PONTOS sempre sai antes do FIM.
// ==========================================

bool verificarAlvo(int trig, int echo)
{
  long distanciaAtual = distancia(trig, echo);

  // Marca o instante logo depois da leitura, antes de
  // qualquer Serial/delay, pra não inflar o tempo.
  unsigned long agora = millis();

  if (distanciaAtual >= DISTANCIA_ACERTO)
  {
    // Sensor livre: a partir de agora, mão detectada vale ponto.
    sensorLivre = true;
    return false;
  }

  if (!sensorLivre)
  {
    // A mão já estava no sensor quando o LED acendeu.
    // Não conta; precisa tirar a mão e colocar de novo.
    return false;
  }

  unsigned long reacao = agora - inicioAlvo;

  apagarTodos();

  pontos++;

  Serial.print("PONTOS|");
  Serial.print(pontos);
  Serial.print("|");
  Serial.println(reacao);

  if (pontos >= META_PONTOS)
  {
    fimDoJogo();
  }
  else
  {
    delay(300);
    escolherNovoAlvo();
  }

  return true;
}

// ==========================================
// RECEBE COMANDOS DA INTERFACE
//
// START          -> começa com o tempo padrão
// START|tempo    -> começa com o tempo em ms
// ==========================================

void verificarComandos()
{
  if (Serial.available())
  {
    String comando = Serial.readStringUntil('\n');

    comando.trim();
    comando.toUpperCase();

    if (comando == "START" || comando.startsWith("START|"))
    {
      if (!jogoAtivo)
      {
        unsigned long tempo = TEMPO_PADRAO;

        int barra = comando.indexOf('|');

        if (barra >= 0)
        {
          long pedido = comando.substring(barra + 1).toInt();

          if (pedido >= (long)TEMPO_MIN && pedido <= (long)TEMPO_MAX)
          {
            tempo = (unsigned long)pedido;
          }
        }

        iniciarJogo(tempo);
      }
    }
  }
}

// ==========================================
// SETUP
// ==========================================

void setup()
{
  pinMode(LED_DIREITA, OUTPUT);
  pinMode(LED_CENTRO, OUTPUT);
  pinMode(LED_ESQUERDA, OUTPUT);

  pinMode(TRIG_DIREITA, OUTPUT);
  pinMode(ECHO_DIREITA, INPUT);

  pinMode(TRIG_CENTRO, OUTPUT);
  pinMode(ECHO_CENTRO, INPUT);

  pinMode(TRIG_ESQUERDA, OUTPUT);
  pinMode(ECHO_ESQUERDA, INPUT);

  Serial.begin(9600);

  randomSeed(analogRead(A0));

  pontos = 0;
  jogoAtivo = false;
  alvoAtual = 0;

  apagarTodos();
}

// ==========================================
// LOOP
// ==========================================

void loop()
{
  verificarComandos();

  if (!jogoAtivo)
  {
    delay(5);
    return;
  }

  // ========================================
  // FIM DA PARTIDA (segurança, já tratado
  // dentro de verificarAlvo logo que chega
  // na meta)
  // ========================================

  if (pontos >= META_PONTOS)
  {
    fimDoJogo();
    return;
  }

  // ========================================
  // VERIFICA O SENSOR DO ALVO ATUAL
  // ========================================

  bool acertou = false;

  if (alvoAtual == 1)
  {
    acertou = verificarAlvo(TRIG_DIREITA, ECHO_DIREITA);
  }
  else if (alvoAtual == 2)
  {
    acertou = verificarAlvo(TRIG_CENTRO, ECHO_CENTRO);
  }
  else if (alvoAtual == 3)
  {
    acertou = verificarAlvo(TRIG_ESQUERDA, ECHO_ESQUERDA);
  }

  if (acertou)
  {
    return;
  }

  // ========================================
  // PASSOU O TEMPO DO ALVO?
  // ========================================

  if (millis() - inicioAlvo >= tempoAlvo)
  {
    Serial.println("TEMPO_ESGOTADO");

    apagarTodos();

    delay(100);

    escolherNovoAlvo();
  }
}