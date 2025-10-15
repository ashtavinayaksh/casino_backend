const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

exports.handleAction = async (req, res) => {
  const { action, player_id, currency, amount = 0, transaction_id, bet_transaction_id } = req.body;

  try {
    const wallet = await Wallet.findOne({ userId: player_id });
    if (!wallet)
      return res.status(200).json({ error_code: "INTERNAL_ERROR", error_description: "Wallet not found" });

    const entry = wallet.getBalance(currency);
    const amt = Number(amount);

    switch (action) {
      case "balance":
        return res.json({ balance: entry.amount });

      case "bet":
        if (entry.amount < amt)
          return res.json({ error_code: "NOT_ENOUGH_FUNDS", error_description: "Insufficient balance" });
        await Transaction.create({ userId: player_id, type: "bet", currency, amount: amt, status: "finished", externalId: transaction_id });
        entry.amount -= amt;
        break;

      case "win":
        await Transaction.create({ userId: player_id, type: "win", currency, amount: amt, status: "finished", externalId: transaction_id });
        entry.amount += amt;
        break;

      case "refund":
        await Transaction.create({ userId: player_id, type: "refund", currency, amount: amt, status: "finished", externalId: transaction_id });
        entry.amount += amt;
        break;

      case "rollback":
        await Transaction.create({ userId: player_id, type: "rollback", currency, amount: amt, status: "finished", externalId: transaction_id });
        entry.amount += amt;
        break;

      default:
        return res.json({ error_code: "INTERNAL_ERROR", error_description: "Unknown action" });
    }

    await wallet.save();
    return res.json({ balance: entry.amount, transaction_id });
  } catch (e) {
    console.error("Callback error:", e);
    return res.status(200).json({ error_code: "INTERNAL_ERROR", error_description: e.message });
  }
};
