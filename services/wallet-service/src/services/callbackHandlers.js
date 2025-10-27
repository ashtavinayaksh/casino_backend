const Wallet = require("../models/Wallet");
const GameTransaction = require("../models/Transaction");
const { getUsdRates } = require("../lib/price"); // ✅ your existing live price fetcher

/**
 * Ensure wallet exists and has currency entry
 */
async function ensureWallet(userId, currency) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      balances: [{ currency: currency.toLowerCase(), amount: 0 }],
    });
  }

  if (!Array.isArray(wallet.balances)) wallet.balances = [];

  let entry = wallet.balances.find(
    (b) => b.currency.toLowerCase() === currency.toLowerCase()
  );
  if (!entry) {
    entry = { currency: currency.toLowerCase(), amount: 0 };
    wallet.balances.push(entry);
  }

  return wallet;
}

/**
 * Get total wallet balance in USD (aggregated)
 */
exports.getUserBalance = async (player_id, requestedCurrency = "USD") => {
  const wallet = await Wallet.findOne({ userId: player_id });
  if (!wallet || !Array.isArray(wallet.balances) || wallet.balances.length === 0) {
    return 0;
  }

  // collect all crypto symbols for conversion
  const symbols = wallet.balances.map((b) => b.currency.toUpperCase());
  const rates = await getUsdRates(symbols);

  let totalUsd = 0;
  for (const entry of wallet.balances) {
    let b = entry;
    if (typeof b === "string") {
      try { b = JSON.parse(b); } catch (e) { continue; }
    }
    const rate = rates[b.currency.toUpperCase()] || 0;
    totalUsd += (Number(b.amount) || 0) * rate;
  }

  return Number(totalUsd.toFixed(2)); // always return USD equivalent
};

/**
 * Helper to update a specific crypto balance
 */
async function updateBalance(player_id, currency, delta) {
  const wallet = await ensureWallet(player_id, currency);
  const entry = wallet.balances.find(
    (b) => b.currency.toLowerCase() === currency.toLowerCase()
  );
  if (!entry) throw new Error("Currency not found");

  entry.amount = Number(entry.amount) + Number(delta);
  await wallet.save();

  return wallet;
}

/**
 * Generic transaction creator
 */
async function createGameTx({ player_id, amount, currency, game_uuid, transaction_id, type, balance_after_usd }) {
  await GameTransaction.create({
    userId: player_id,
    transaction_id,
    game_uuid,
    amount: Number(amount),
    currency,
    type,
    balance_after: balance_after_usd, // stored in USD equivalent
    status: "confirmed",
  });
}

/**
 * Handle BET (subtract from crypto balance but return USD balance)
 */
exports.handleBet = async (data) => {
  const { player_id, amount, currency, transaction_id, game_uuid } = data;

  // fetch USD balance before bet
  const currentUsd = await exports.getUserBalance(player_id, "USD");
  if (currentUsd < amount) {
    return { error_code: "INSUFFICIENT_FUNDS" };
  }

  // deduct from primary currency (SOL/USDT/BTC etc.)
  await updateBalance(player_id, currency, -amount);

  const newUsd = await exports.getUserBalance(player_id, "USD");
  await createGameTx({ player_id, amount, currency, game_uuid, transaction_id, type: "bet", balance_after_usd: newUsd });

  return { balance: newUsd, transaction_id: `BET_${transaction_id}` };
};

/**
 * Handle WIN (+amount)
 */
exports.handleWin = async (data) => {
  const { player_id, amount, currency, transaction_id, game_uuid } = data;
  await updateBalance(player_id, currency, amount);

  const newUsd = await exports.getUserBalance(player_id, "USD");
  await createGameTx({ player_id, amount, currency, game_uuid, transaction_id, type: "win", balance_after_usd: newUsd });

  return { balance: newUsd, transaction_id: `WIN_${transaction_id}` };
};

/**
 * Handle REFUND (+amount)
 */
exports.handleRefund = async (data) => {
  const { player_id, amount, currency, transaction_id, game_uuid } = data;
  await updateBalance(player_id, currency, amount);

  const newUsd = await exports.getUserBalance(player_id, "USD");
  await createGameTx({ player_id, amount, currency, game_uuid, transaction_id, type: "refund", balance_after_usd: newUsd });

  return { balance: newUsd, transaction_id: `REF_${transaction_id}` };
};

/**
 * Handle ROLLBACK (+amount)
 */
exports.handleRollback = async (data) => {
  const { player_id, amount, currency, transaction_id, game_uuid } = data;
  await updateBalance(player_id, currency, amount);

  const newUsd = await exports.getUserBalance(player_id, "USD");
  await createGameTx({ player_id, amount, currency, game_uuid, transaction_id, type: "rollback", balance_after_usd: newUsd });

  return { balance: newUsd, transaction_id: `ROLL_${transaction_id}` };
};
