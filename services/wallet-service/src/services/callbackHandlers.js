// services/callbackHandlers.js
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const GameTransaction = require("../models/Transaction");

/* -------------------- HELPER FUNCTIONS -------------------- */

// ensure wallet + currency row
async function ensureWallet(userId, currency) {
  const cur = (currency || "SOL").toLowerCase();
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      balances: [{ currency: cur, amount: 0, locked: 0 }],
    });
  }

  if (!Array.isArray(wallet.balances)) wallet.balances = [];

  let entry = wallet.balances.find((b) => b.currency.toLowerCase() === cur);
  if (!entry) {
    entry = { currency: cur, amount: 0, locked: 0 };
    wallet.balances.push(entry);
    await wallet.save();
  }

  return wallet;
}

async function findBalanceEntry(wallet, currency) {
  return wallet.balances.find(
    (b) => (b.currency || "").toLowerCase() === (currency || "SOL").toLowerCase()
  );
}

// ===== Idempotency guard =====
async function alreadyProcessed(txId) {
  if (!txId) return false;
  const existing = await GameTransaction.findOne({ transaction_id: txId });
  return !!existing;
}

/* -------------------- NEW FUNCTION: getUserBalance -------------------- */
exports.getUserBalance = async (player_id, currency = "SOL") => {
  try {
    const wallet = await Wallet.findOne({ userId: player_id });
    if (!wallet) return 0;

    const entry = wallet.balances.find(
      (b) => (b.currency || "").toLowerCase() === currency.toLowerCase()
    );

    // default to 0 if not found
    return entry ? Number(entry.amount || 10) : 10;
  } catch (err) {
    console.error("❌ getUserBalance error:", err.message);
    return 0;
  }
};

/* -------------------- BET -------------------- */
exports.handleBet = async (data) => {
  const { player_id, amount, currency = "SOL", transaction_id, game_uuid } = data;
  const cur = currency.toUpperCase();
  const amt = Number(amount || 0);
  if (amt <= 0) return { error_code: "INVALID_AMOUNT" };

  if (await alreadyProcessed(transaction_id)) {
    const curBal = await exports.getUserBalance(player_id, cur);
    return { balance: Number(curBal.toFixed(2)), transaction_id };
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await ensureWallet(player_id, cur);
    const entry = await findBalanceEntry(wallet, cur);

    if ((entry.amount || 0) < amt) {
      await session.abortTransaction();
      session.endSession();
      return { error_code: "INSUFFICIENT_FUNDS" };
    }

    // move to locked
    entry.amount -= amt;
    entry.locked += amt;
    await wallet.save({ session });

    const newBal = entry.amount;

    await GameTransaction.create(
      [
        {
          userId: player_id,
          transaction_id,
          game_uuid,
          amount: amt,
          currency: cur,
          type: "bet",
          status: "confirmed",
          balance_after: newBal,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return { balance: Number(newBal.toFixed(2)), transaction_id };
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    if (e.code === 11000) {
      const curBal = await exports.getUserBalance(player_id, cur);
      return { balance: Number(curBal.toFixed(2)), transaction_id };
    }
    throw e;
  }
};

/* -------------------- WIN -------------------- */
exports.handleWin = async (data) => {
  const { player_id, amount, currency = "SOL", transaction_id, game_uuid } = data;
  const cur = currency.toUpperCase();
  const amt = Number(amount || 0);
  if (amt < 0) return { error_code: "INVALID_AMOUNT" };

  if (await alreadyProcessed(transaction_id)) {
    const curBal = await exports.getUserBalance(player_id, cur);
    return { balance: Number(curBal.toFixed(2)), transaction_id };
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await ensureWallet(player_id, cur);
    const entry = await findBalanceEntry(wallet, cur);

    entry.amount += amt;
    await wallet.save({ session });

    const newBal = entry.amount;

    await GameTransaction.create(
      [
        {
          userId: player_id,
          transaction_id,
          game_uuid,
          amount: amt,
          currency: cur,
          type: "win",
          status: "confirmed",
          balance_after: newBal,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return { balance: Number(newBal.toFixed(2)), transaction_id };
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    if (e.code === 11000) {
      const curBal = await exports.getUserBalance(player_id, cur);
      return { balance: Number(curBal.toFixed(2)), transaction_id };
    }
    throw e;
  }
};

/* -------------------- REFUND -------------------- */
exports.handleRefund = async (data) => {
  const {
    player_id,
    amount,
    currency = "SOL",
    transaction_id,
    game_uuid,
    ref_transaction_id,
  } = data;
  const cur = currency.toUpperCase();
  const amt = Number(amount || 0);
  if (amt <= 0) return { error_code: "INVALID_AMOUNT" };

  if (await alreadyProcessed(transaction_id)) {
    const curBal = await exports.getUserBalance(player_id, cur);
    return { balance: Number(curBal.toFixed(2)), transaction_id };
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await ensureWallet(player_id, cur);
    const entry = await findBalanceEntry(wallet, cur);

    const release = Math.min(entry.locked || 0, amt);
    entry.locked -= release;
    entry.amount += amt;
    await wallet.save({ session });

    const newBal = entry.amount;

    await GameTransaction.create(
      [
        {
          userId: player_id,
          transaction_id,
          ref_transaction_id,
          game_uuid,
          amount: amt,
          currency: cur,
          type: "refund",
          status: "confirmed",
          balance_after: newBal,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return { balance: Number(newBal.toFixed(2)), transaction_id };
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    if (e.code === 11000) {
      const curBal = await exports.getUserBalance(player_id, cur);
      return { balance: Number(curBal.toFixed(2)), transaction_id };
    }
    throw e;
  }
};

/* -------------------- ROLLBACK -------------------- */
exports.handleRollback = async (data) => {
  const {
    player_id,
    amount,
    currency = "SOL",
    transaction_id,
    game_uuid,
    ref_transaction_id,
  } = data;
  const cur = currency.toUpperCase();
  const amt = Number(amount || 0);
  if (amt <= 0) return { error_code: "INVALID_AMOUNT" };

  if (await alreadyProcessed(transaction_id)) {
    const curBal = await exports.getUserBalance(player_id, cur);
    return { balance: Number(curBal.toFixed(2)), transaction_id };
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await ensureWallet(player_id, cur);
    const entry = await findBalanceEntry(wallet, cur);

    const release = Math.min(entry.locked || 0, amt);
    entry.locked -= release;
    entry.amount += amt;
    await wallet.save({ session });

    const newBal = entry.amount;

    await GameTransaction.create(
      [
        {
          userId: player_id,
          transaction_id,
          ref_transaction_id,
          game_uuid,
          amount: amt,
          currency: cur,
          type: "rollback",
          status: "confirmed",
          balance_after: newBal,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return { balance: Number(newBal.toFixed(2)), transaction_id };
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    if (e.code === 11000) {
      const curBal = await exports.getUserBalance(player_id, cur);
      return { balance: Number(curBal.toFixed(2)), transaction_id };
    }
    throw e;
  }
};
