# 🌊 Ocean & Weather API Hub

> Condições do mar e do tempo em um só lugar. Uma aplicação poliglota para monitorar regiões costeiras, consumir dados abertos e transformar previsões em informação acessível.

O **Ocean & Weather API Hub** combina uma API REST em Java com Spring Boot, um serviço de análise diária em Python e um dashboard responsivo em JavaScript. A aplicação consulta as APIs públicas da [Open-Meteo](https://open-meteo.com/), sem chave de API.

> **Uso responsável:** recomendações são indicadores informativos gerados por regras simples, não avisos oficiais nem orientação de segurança. Consulte salva-vidas, bandeiras e autoridades locais antes de entrar no mar. Os modelos da Open-Meteo têm limitações, especialmente junto à costa.

## Arquitetura

```text
┌────────────────────────┐        ┌──────────────────────────┐
│ Dashboard HTML/CSS/JS  │ ─────▶ │ Spring Boot REST API     │
│ frontend/              │        │ backend/                 │
└────────────────────────┘        │ Controller → Service → DTO│
                                  └────────────┬─────────────┘
                                               │ HTTPS
                     ┌─────────────────────────┴────────────────────┐
                     ▼                                              ▼
          ┌──────────────────────┐                      ┌──────────────────────┐
          │ Open-Meteo Forecast  │                      │ Open-Meteo Marine    │
          │ temperatura, vento   │                      │ ondas, temp. do mar  │
          └──────────────────────┘                      └──────────────────────┘
                     ▲
                     │ HTTP /api/v1/coastal/forecast
          ┌──────────┴───────────┐
          │ Análise diária Python│ ─────▶ analytics/reports/*.json
          └──────────────────────┘
```

## Tecnologias

![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=222)
![Open-Meteo](https://img.shields.io/badge/Data-Open--Meteo-1676A3)

- **Backend:** Java 21, Spring Boot, Spring Web, Bean Validation, RestTemplate, springdoc-openapi / Swagger UI.
- **Análises:** Python 3.10+, `requests`, agregações diárias e exportação JSON.
- **Frontend:** HTML semântico, CSS responsivo com alternância de tema, JavaScript sem framework.
- **Dados:** Open-Meteo Weather Forecast API e Marine API.

## Estrutura do repositório

```text
ocean-weather-api-hub/
├── analytics/
│   ├── daily_report.py
│   ├── requirements.txt
│   └── .env.example
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/dev/oceanhub/
│       │   ├── config/       # Cliente HTTP e OpenAPI
│       │   ├── controller/  # Endpoints REST
│       │   ├── dto/         # Contratos de resposta
│       │   ├── service/     # Integração e regras de recomendação
│       │   └── OceanWeatherApplication.java
│       └── resources/application.yml
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .gitignore
└── README.md
```

## Requisitos

- JDK 21 ou superior
- Maven 3.9+ (ou use o Maven Wrapper, se o adicionar ao seu clone)
- Python 3.10+
- Navegador moderno
- Acesso à internet para buscar as previsões públicas da Open-Meteo

## Como executar localmente

### 1. Inicie a API Java

Em um terminal:

```bash
cd backend
mvn spring-boot:run
```

A API ficará em `http://localhost:8080`. Para alterar a porta, defina `SERVER_PORT`, por exemplo `SERVER_PORT=8090` (PowerShell: `$env:SERVER_PORT=8090`).

### 2. Abra o dashboard

Sirva a pasta `frontend` por HTTP. Por exemplo, com Python:

```bash
cd frontend
python -m http.server 5500
```

Abra `http://localhost:5500`. O dashboard chama o backend em `http://localhost:8080`. Para usar outro endereço, informe-o como query string: `http://localhost:5500/?api=http://localhost:8090`.

Como o frontend é estático, sirva-o por HTTP em vez de abrir `index.html` diretamente. O backend já habilita requisições CORS do navegador.

### 3. Gere o relatório Python

Em outro terminal, com o backend ativo:

```bash
cd analytics
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python daily_report.py
```

O resumo será criado em `analytics/reports/daily-summary.json`. Configure local, coordenadas e destino com as variáveis `LOCATION`, `LATITUDE`, `LONGITUDE`, `FORECAST_DAYS`, `API_BASE_URL` e `OUTPUT_FILE`; consulte `.env.example` para os valores iniciais. O script lê essas variáveis do ambiente, sem dependência de pacote dotenv.

## Endpoints

Todos os endpoints usam coordenadas WGS84 e retornam JSON. As temperaturas estão em °C, ondas em metros e vento em km/h.

### Condições atuais

```http
GET /api/v1/coastal/conditions?location=Copacabana&latitude=-22.9711&longitude=-43.1822
```

Exemplo de resposta (valores ilustrativos):

```json
{
  "location": "Copacabana",
  "latitude": -22.9711,
  "longitude": -43.1822,
  "observedAt": "2026-10-19T12:00:00-03:00",
  "airTemperatureC": 26.4,
  "waterTemperatureC": 22.8,
  "waveHeightM": 0.7,
  "windSpeedKmh": 14.2,
  "relativeHumidityPercent": 71,
  "recommendation": "Condições favoráveis",
  "recommendationDetail": "Mar relativamente calmo e água amena. Verifique as bandeiras da praia.",
  "source": "Open-Meteo (Weather Forecast + Marine API)"
}
```

### Previsão horária para análise

```http
GET /api/v1/coastal/forecast?location=Copacabana&latitude=-22.9711&longitude=-43.1822&days=1
```

`days` aceita de 1 a 7. A resposta contém `hourly`, uma lista com hora local, temperatura superficial da água e altura de onda; o script Python usa essas séries para calcular médias e pico diário. Campos podem ser `null` se o modelo não fornecer um valor.

### Documentação interativa

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/api-docs`

## Regras de recomendação

Os rótulos são heurísticas demonstrativas baseadas na altura da onda e, para condições favoráveis, na temperatura da água. Ondas a partir de 2,5 m geram alerta de mar agitado; a partir de 1,2 m sugerem boas condições para surf. Esses limites não consideram correntes, maré, vento local ou alertas oficiais.

## Dados e atribuição

Os dados meteorológicos e marinhos vêm dos serviços [Open-Meteo](https://open-meteo.com/). Consulte a [documentação da Weather Forecast API](https://open-meteo.com/en/docs) e da [Marine API](https://open-meteo.com/en/docs/marine-weather-api), além dos termos e requisitos de atribuição aplicáveis ao seu uso. A disponibilidade de variáveis depende da região e do modelo selecionado.

## Próximas evoluções

- Cadastro de múltiplas praias e busca por nome/geocodificação.
- Histórico próprio em banco de dados e alertas configuráveis.
- Testes automatizados de serviço, API e agregações.
- Containerização e pipeline de integração contínua.

## Licença

Este projeto é uma demonstração educacional de portfólio. Adicione um arquivo `LICENSE` com a licença escolhida antes de distribuir o código.
