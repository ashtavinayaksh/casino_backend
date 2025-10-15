const axios = require('axios');
const API_BASE = 'https://api.nowpayments.io/v1';

function headers(apiKey) {
  return { 'x-api-key': apiKey, 'Content-Type': 'application/json' };
}

async function listCoins(apiKey) {
  const { data } = await axios.get(`${API_BASE}/merchant/coins`, {
    headers: headers(apiKey),
  });
  return data;
}

async function createPayment({
  apiKey,
  price_amount,
  price_currency,
  pay_currency,
  order_id,
  ipn_callback_url,
  is_fixed_rate = false,
}) {
  const payload = {
    price_amount,
    price_currency,
    pay_currency,
    order_id,
    ipn_callback_url,
    is_fixed_rate,
  };
  const { data } = await axios.post(`${API_BASE}/payment`, payload, {
    headers: headers(apiKey),
  });
  return data;
}

async function getPayment({ apiKey, payment_id }) {
  const { data } = await axios.get(`${API_BASE}/payment/${payment_id}`, {
    headers: headers(apiKey),
  });
  return data;
}

async function getAuthToken(email, password) {
  const { data } = await axios.post(`${API_BASE}/auth`, { email, password });
  return data.token;
}

async function createPayout({ email, password, withdrawals }) {
  const token = await getAuthToken(email, password);
  const { data } = await axios.post(
    `${API_BASE}/payout`,
    { withdrawals },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return data;
}

module.exports = { listCoins, createPayment, getPayment, createPayout };
