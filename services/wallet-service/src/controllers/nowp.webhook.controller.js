const svc = require('../services/wallet.service');

/**
 * Handle NOWPayments IPN webhook
 * Body example:
 * {
 *  payment_id, payment_status, actually_paid, pay_currency, order_id (userId), purchase_id, network, etc.
 * }
 */
async function handleIpn(req, res) {
  try {
    const p = req.body;

    if (!p || !p.payment_status) return res.status(400).json({ ok: false });

    if (['confirmed','finished'].includes(p.payment_status)) {
      await svc.creditDeposit({
        userId: String(p.order_id),
        currency: String(p.pay_currency || p.currency || 'sol').toLowerCase(),
        amount: Number(p.actually_paid || p.pay_amount || 0),
        externalId: String(p.payment_id || p.purchase_id || ''),
        txHash: p.payin_hash || p.tx_hash || null,
        metadata: p
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = { handleIpn };
