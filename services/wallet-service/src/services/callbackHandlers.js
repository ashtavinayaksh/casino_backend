const Wallet = require("../models/Wallet");
const GameTransaction = require("../models/Transaction");

async function ensureWallet(userId, currency) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0, currency });
  }
  if (typeof wallet.balance !== "number" || isNaN(wallet.balance)) {
    wallet.balance = 0;
  }
  return wallet;
}

exports.getUserBalance = async (player_id, currency) => {
  const user = await Wallet.findOne({ userId: player_id });
  if (!user || !Array.isArray(user.balances)) return 0;

  const bal = user.balances.find(b => 
    b.currency.toLowerCase() === currency.toLowerCase()
  );
  return bal ? bal.amount : 0;
};


exports.handleBet = async (data) => {
  const { player_id, amount, currency, transaction_id, game_uuid } = data;
  const wallet = await ensureWallet(player_id, currency);

  if (wallet.balance < amount) {
    return { error_code: "INSUFFICIENT_FUNDS" };
  }

  wallet.balance -= Number(amount);
  await wallet.save();

  await GameTransaction.create({
    userId: player_id,
    transaction_id,
    game_uuid,
    amount: Number(amount),
    currency,
    type: "bet",
    balance_after: Number(wallet.balance),
    status: "confirmed",
  });

  return { balance: wallet.balance, transaction_id: `BET_${transaction_id}` };
};

exports.handleWin = async (data) => {
  const { player_id, amount, currency, transaction_id, game_uuid } = data;
  const wallet = await ensureWallet(player_id, currency);

  wallet.balance += Number(amount);
  await wallet.save();

  await GameTransaction.create({
    userId: player_id,
    transaction_id,
    game_uuid,
    amount: Number(amount),
    currency,
    type: "win",
    balance_after: Number(wallet.balance),
    status: "confirmed",
  });

  return { balance: wallet.balance, transaction_id: `WIN_${transaction_id}` };
};

exports.handleRefund = async (data) => {
  const { player_id, amount, currency, transaction_id, game_uuid } = data;
  const wallet = await ensureWallet(player_id, currency);

  wallet.balance += Number(amount);
  await wallet.save();

  await GameTransaction.create({
    userId: player_id,
    transaction_id,
    game_uuid,
    amount: Number(amount),
    currency,
    type: "refund",
    balance_after: Number(wallet.balance),
    status: "confirmed",
  });

  return { balance: wallet.balance, transaction_id: `REF_${transaction_id}` };
};

exports.handleRollback = async (data) => {
  const { player_id, amount, currency, transaction_id, game_uuid } = data;
  const wallet = await ensureWallet(player_id, currency);

  wallet.balance += Number(amount);
  await wallet.save();

  await GameTransaction.create({
    userId: player_id,
    transaction_id,
    game_uuid,
    amount: Number(amount),
    currency,
    type: "rollback",
    balance_after: Number(wallet.balance),
    status: "confirmed",
  });

  return { balance: wallet.balance, transaction_id: `ROLL_${transaction_id}` };
};
