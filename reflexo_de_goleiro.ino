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
// VARIÁVEIS DO JOGO
// ==========================================

int alvoAtual = 0;
int pontos = 0;
bool jogoAtivo = false;

const unsigned long TEMPO_ALVO = 1500;

unsigned long inicioAlvo;


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

void iniciarJogo()
{
    pontos = 0;
    jogoAtivo = true;

    alvoAtual = random(1, 4);

    acenderAlvo();

    Serial.println("JOGO_INICIADO");
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
// ==========================================

bool verificarAlvo(int trig, int echo)
{
    long distanciaAtual = distancia(trig, echo);

    if (distanciaAtual < 15)
    {
        apagarTodos();

        pontos++;

        if (pontos >= 10)
        {
            fimDoJogo();
        }

        else
        {
            Serial.print("PONTOS|");
            Serial.println(pontos);

            delay(300);

            escolherNovoAlvo();
        }

        return true;
    }

    return false;
}


// ==========================================
// RECEBE COMANDOS DA INTERFACE
// ==========================================

void verificarComandos()
{
    if (Serial.available())
    {
        String comando = Serial.readStringUntil('\n');

        comando.trim();
        comando.toUpperCase();

        if (comando == "START")
        {
            if (!jogoAtivo)
            {
                iniciarJogo();
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
    // dentro de verificarAlvo logo que chega a 10)
    // ========================================

    if (pontos >= 10)
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
    // PASSOU 1,5 SEGUNDO?
    // ========================================

    if (millis() - inicioAlvo >= TEMPO_ALVO)
    {
        Serial.println("TEMPO_ESGOTADO");

        apagarTodos();

        delay(100);

        escolherNovoAlvo();
    }
}