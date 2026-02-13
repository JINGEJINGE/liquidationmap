# Crypto TA Coach Agent (Starter)

Beginner-friendly web app for near real-time crypto technical analysis on one ticker (USDT pairs), with educational explanations and scenario-based trade plans.

## What this includes
- Binance market data (4H, 1D, 1W)
- Indicators: EMA 20/50/200, RSI 14, MACD 12/26/9, Bollinger 20/2, ATR 14, volume SMA20
- Quant summary + rule-based trade plans (Conservative/Base/Aggressive)
- AI report generation (beginner + pro analysis + scenarios)
- Fallback mode if `OPENAI_API_KEY` is not configured

## 1) Install
```bash
npm install
```

## 2) Configure environment (optional but recommended)
```bash
cp .env.example .env.local
```
Then set:
```bash
OPENAI_API_KEY=your_key_here
```

## 3) Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## API endpoints
- `GET /api/market-data?symbol=BTCUSDT`
- `POST /api/analyze`
  - body:
  ```json
  {
    "symbol": "BTCUSDT",
    "accountEquity": 10000
  }
  ```

## Notes
- Symbol must end with `USDT` (example: `ETHUSDT`).
- This app is educational and includes a fixed disclaimer.
- Spot-only assumptions are enforced in the plan logic.
