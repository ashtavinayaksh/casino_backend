const Wallet = require('../../../wallet-service/src/models/Wallet');
const Transaction = require('../../../wallet-service/src/models/Transaction');

exports.handleAction = async (req, res) => {
  const { action, player_id, currency, amount = 0, transaction_id, bet_transaction_id } = req.body;
  console.log("🎮 Slotgrator Callback:", action, req.body);

  try {
    const ccy = currency.toLowerCase();
    const wallet = await Wallet.findOne({ userId: player_id });
    if (!wallet) {
      return res.status(200).json({
        error_code: "INTERNAL_ERROR",
        error_description: "Wallet not found",
      });
    }

    // helper for finding / creating balance entry
    const balanceEntry = wallet.getBalance(ccy);

    switch (action) {
      case 'balance': {
        return res.json({ balance: balanceEntry.amount });
      }

      case 'bet': {
        if (balanceEntry.amount < Number(amount)) {
          return res.json({
            error_code: "NOT_ENOUGH_FUNDS",
            error_description: "Insufficient balance",
          });
        }
        await Transaction.create({
          userId: player_id,
          type: 'bet',
          amount: Number(amount),
          currency: ccy,
          status: 'finished',
          externalId: transaction_id,
        });
        balanceEntry.amount -= Number(amount);
        break;
      }

      case 'win': {
        await Transaction.create({
          userId: player_id,
          type: 'win',
          amount: Number(amount),
          currency: ccy,
          status: 'finished',
          externalId: transaction_id,
          metadata: { bet_transaction_id },
        });
        balanceEntry.amount += Number(amount);
        break;
      }

      case 'refund': {
        await Transaction.create({
          userId: player_id,
          type: 'refund',
          amount: Number(amount),
          currency: ccy,
          status: 'finished',
          externalId: transaction_id,
          metadata: { bet_transaction_id },
        });
        balanceEntry.amount += Number(amount);
        break;
      }

      case 'rollback': {
        await Transaction.create({
          userId: player_id,
          type: 'rollback',
          amount: Number(amount),
          currency: ccy,
          status: 'finished',
          externalId: transaction_id,
          metadata: { bet_transaction_id },
        });
        balanceEntry.amount += Number(amount);
        break;
      }

      default:
        return res.json({
          error_code: "INTERNAL_ERROR",
          error_description: "Unknown action",
        });
    }

    await wallet.save();
    return res.json({ balance: balanceEntry.amount, transaction_id });
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(200).json({
      error_code: "INTERNAL_ERROR",
      error_description: err.message,
    });
  }
};
