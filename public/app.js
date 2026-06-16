const state = {token: null, user: null};

function setMessage(msg, type = 'info') {
  const el = document.getElementById('message');
  el.textContent = msg;
  el.className = type;
}

function api(path, options = {}) {
  const headers = {'Content-Type': 'application/json'};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const opts = {headers, ...options};
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  return fetch(`/api${path}`, opts).then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data;
    return data;
  });
}

function showSection(name) {
  document.querySelectorAll('.page-section').forEach(sec => sec.style.display = sec.id === name ? 'block' : 'none');
}

function saveToken(token) {
  state.token = token;
  localStorage.setItem('ama_token', token);
}

function loadToken() {
  const token = localStorage.getItem('ama_token');
  if (token) state.token = token;
}

function updateAuthUI() {
  const loggedIn = Boolean(state.user);
  document.getElementById('auth-area').style.display = loggedIn ? 'none' : 'block';
  document.getElementById('dashboard-area').style.display = loggedIn ? 'block' : 'none';
  document.getElementById('welcome-name').textContent = state.user ? state.user.name : '';
  document.getElementById('user-email').textContent = state.user ? state.user.email : '';
  document.getElementById('user-balance').textContent = state.user ? `${state.user.balance} NGN` : '0 NGN';
  document.getElementById('admin-area').style.display = state.user && state.user.is_admin ? 'block' : 'none';
}

async function loadUser() {
  if (!state.token) return;
  try {
    const data = await api('/auth/me');
    state.user = data.user;
    updateAuthUI();
    await refreshHistory();
    if (state.user.is_admin) {
      await loadAdmin();
    }
  } catch (e) {
    console.error(e);
    state.token = null;
    localStorage.removeItem('ama_token');
    state.user = null;
    updateAuthUI();
  }
}

async function refreshHistory() {
  if (!state.user) return;
  const data = await api('/payments/history');
  const paymentsEl = document.getElementById('payment-history');
  const withdrawalsEl = document.getElementById('withdrawal-history');
  const winnersEl = document.getElementById('winner-history');
  paymentsEl.innerHTML = data.payments.length ? data.payments.map(p => `<li>${p.created_at}: ${p.amount} NGN (${p.status})</li>`).join('') : '<li>No payments yet.</li>';
  withdrawalsEl.innerHTML = data.withdrawals.length ? data.withdrawals.map(w => `<li>${w.created_at}: ${w.amount} NGN (${w.status})</li>`).join('') : '<li>No withdrawals yet.</li>';
  winnersEl.innerHTML = data.winners.length ? data.winners.map(w => `<li>${w.created_at}: ${w.amount} NGN</li>`).join('') : '<li>No winnings yet.</li>';
}

async function loadQuestions() {
  try {
    const data = await api('/contest/questions');
    const container = document.getElementById('questions-container');
    container.innerHTML = data.map(q => `
      <div class="question-card">
        <div class="question-title">${q.id}. ${q.title}</div>
        <select data-qid="${q.id}">
          <option value="">Select an answer</option>
          ${q.choices.map(choice => `<option value="${choice}">${choice}</option>`).join('')}
        </select>
      </div>
    `).join('');
    showSection('contest-section');
  } catch (err) {
    setMessage(err.error || 'Could not load questions', 'error');
  }
}

async function register(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  try {
    const data = await api('/auth/register', {method: 'POST', body: {name, email, password}});
    saveToken(data.token);
    state.user = data.user;
    updateAuthUI();
    setMessage('Registered and logged in successfully', 'success');
    await refreshHistory();
  } catch (err) {
    setMessage(err.error || 'Registration failed', 'error');
  }
}

async function login(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  try {
    const data = await api('/auth/login', {method: 'POST', body: {email, password}});
    saveToken(data.token);
    state.user = data.user;
    updateAuthUI();
    setMessage('Logged in successfully', 'success');
    await refreshHistory();
  } catch (err) {
    setMessage(err.error || 'Login failed', 'error');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('ama_token');
  updateAuthUI();
  showSection('auth-section');
  setMessage('Logged out', 'info');
}

async function payEntry() {
  try {
    await api('/payments/record', {method: 'POST', body: {amount: 4700, provider: 'opay', status: 'paid'}});
    setMessage('Entry fee recorded. You can now submit answers.', 'success');
    await refreshHistory();
  } catch (err) {
    setMessage(err.error || 'Payment recording failed', 'error');
  }
}

async function submitAttempt(event) {
  event.preventDefault();
  const answers = {};
  document.querySelectorAll('#questions-container select').forEach(select => {
    if (select.value) answers[select.dataset.qid] = select.value;
  });
  try {
    const data = await api('/contest/attempt', {method: 'POST', body: {answers}});
    setMessage(`You got ${data.correct} out of ${data.total} correct.`, 'success');
    await loadUser();
  } catch (err) {
    setMessage(err.error || 'Attempt submission failed', 'error');
  }
}

async function requestWithdrawal(event) {
  event.preventDefault();
  const amount = event.target.amount.value.trim();
  try {
    await api('/payments/withdraw', {method: 'POST', body: {amount}});
    setMessage('Withdrawal request submitted. Admin will review it.', 'success');
    await refreshHistory();
  } catch (err) {
    setMessage(err.error || 'Withdrawal request failed', 'error');
  }
}

async function loadAdmin() {
  try {
    const analytics = await api('/admin/analytics');
    const withdrawals = await api('/admin/withdrawals');
    document.getElementById('admin-total-users').textContent = analytics.totalUsers;
    document.getElementById('admin-total-payments').textContent = `${analytics.payments.total || 0} NGN from ${analytics.payments.count || 0} payments`;
    document.getElementById('admin-winners-count').textContent = analytics.winners;
    document.getElementById('admin-withdrawals').innerHTML = withdrawals.map(w => `<li>${w.created_at}: ${w.name} (${w.email}) ${w.amount} NGN - ${w.status}</li>`).join('') || '<li>No withdrawals yet.</li>';
  } catch (err) {
    console.error(err);
  }
}

function init() {
  loadToken();
  if (state.token) loadUser();
  document.getElementById('register-form').addEventListener('submit', register);
  document.getElementById('login-form').addEventListener('submit', login);
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('load-questions-btn').addEventListener('click', loadQuestions);
  document.getElementById('submit-attempt-form').addEventListener('submit', submitAttempt);
  document.getElementById('pay-entry-btn').addEventListener('click', payEntry);
  document.getElementById('withdraw-form').addEventListener('submit', requestWithdrawal);
  showSection(state.token ? 'dashboard-section' : 'auth-section');
}

window.addEventListener('DOMContentLoaded', init);
