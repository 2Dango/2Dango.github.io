/*
  Add your Firebase web app values below to make this a shared, realtime poll.
  Leave useFirebase false to run the no-setup, single-browser demo.
*/
const firebaseConfig = {
  apiKey: "AIzaSyA4EWZPVfwl4iWcolz8adMjFWTdOmekp7s",
  authDomain: "meeting-poll-54585.firebaseapp.com",
  databaseURL: "https://meeting-poll-54585-default-rtdb.firebaseio.com",
  projectId: "meeting-poll-54585",
  appId: "1:946433200656:web:745522fbf059ce452b3095"
};
const useFirebase = true;
const POLL_PATH = "meetings/default-poll";
const HOST_CODE = "123456";

const $ = (selector) => document.querySelector(selector);
const options = [...document.querySelectorAll(".option")];
const initialPoll = { round: 1, question: "Choose your answer", options: ["Option 1", "Option 2", "Option 3", "Option 4"], correctAnswer: null, answerRevealed: false, showResults: true, startedAt: null, responses: {}, presence: {} };
let poll = initialPoll;
let participantId = localStorage.getItem("gather-participant-id") || crypto.randomUUID();
const pageRole = document.body.dataset.role || "participant";
let hostSignedIn = localStorage.getItem("gather-host-signed-in") === "true";
let isHost = pageRole === "host" && hostSignedIn;
localStorage.setItem("gather-participant-id", participantId);

function normalize(data) { return { ...initialPoll, ...data, responses: data?.responses || {}, presence: data?.presence || {}, options: data?.options || initialPoll.options }; }
function tally() { const values = Object.values(poll.responses); return [1, 2, 3, 4].map(choice => values.filter(v => String(v) === String(choice)).length); }
function renderHostControls() {
  $("#host-actions").hidden = !isHost;
  $("#host-trigger").textContent = "Host signed in";
  $("#reset-poll").disabled = !isHost;
  $("#reset-poll").title = isHost ? "Start a new poll round" : "Sign in as host to reset the poll";
  $("#host-editor").hidden = !isHost; $("#toggle-results").hidden = !isHost; $("#change-round").hidden = !isHost; $("#reveal-answer").hidden = !isHost;
  $("#toggle-results").textContent = poll.showResults === false ? "Show results" : "Hide results";
  $("#reveal-answer").disabled = poll.answerRevealed; $("#reveal-answer").textContent = poll.answerRevealed ? "Answer revealed" : "Reveal answer";
}
function render() {
  const counts = tally(), total = counts.reduce((a, b) => a + b, 0), selection = poll.responses[participantId];
  options.forEach(button => button.classList.toggle("selected", button.dataset.choice === String(selection)));
  $("#selection-message").textContent = selection ? `Your response: ${selection}. You can change it anytime.` : "Pick an answer to participate.";
  const feedback = $("#answer-feedback");
  if (poll.answerRevealed && poll.correctAnswer) {
    const correct = String(selection) === String(poll.correctAnswer);
    feedback.hidden = false; feedback.classList.toggle("incorrect", !correct);
    feedback.textContent = selection ? `Correct answer: ${poll.correctAnswer}. You were ${correct ? "correct" : "incorrect"}.` : `Correct answer: ${poll.correctAnswer}. You did not answer.`;
  } else feedback.hidden = true;
  $("#participant-count").textContent = `${total} / ${Math.max(1, Object.keys(poll.presence).length)} participants`;
  $("#results-note").textContent = total ? "Results update as everyone answers." : "Waiting for the first response.";
  $("#round-value").textContent = `Round ${poll.round}`;
  $("#poll-title").textContent = poll.question;
  options.forEach((button, index) => button.querySelector("b").textContent = poll.options[index] || `Option ${index + 1}`);
  const online = Math.max(1, Object.keys(poll.presence).length);
  $("#online-count").textContent = `${online} participant${online === 1 ? "" : "s"} online`;
  const resultsVisible = isHost || poll.showResults !== false;
  $("#results-content").hidden = !resultsVisible; $("#results-hidden-message").hidden = resultsVisible;
  renderHostControls();
  $("#bars").innerHTML = counts.map((count, i) => `<div class="bar-row"><strong>${i + 1}</strong><div class="track"><div class="fill" style="width:${total ? (count / total) * 100 : 0}%"></div></div><span class="bar-count">${count}</span></div>`).join("");
}
function renderElapsedTimer() {
  if (!poll.startedAt) { $("#elapsed-timer").textContent = "Not started"; return; }
  const elapsed = Math.max(0, Math.floor((Date.now() - poll.startedAt) / 1000));
  const hours = Math.floor(elapsed / 3600), minutes = Math.floor((elapsed % 3600) / 60), seconds = elapsed % 60;
  $("#elapsed-timer").textContent = `Elapsed ${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function saveDemo() { localStorage.setItem("gather-demo-poll", JSON.stringify(poll)); render(); }
function startDemo() {
  poll = normalize(JSON.parse(localStorage.getItem("gather-demo-poll") || "null")); render();
  window.addEventListener("storage", event => { if (event.key === "gather-demo-poll") { poll = normalize(JSON.parse(event.newValue)); render(); } });
  $("#connection-label").textContent = "Demo meeting · this browser";
  poll.presence[participantId] = true; saveDemo();
  return { vote(choice) { poll.responses[participantId] = choice; saveDemo(); }, reset() { poll.responses = {}; saveDemo(); }, setRound(round) { poll.round = round; saveDemo(); }, setPoll(question, options, correctAnswer) { Object.assign(poll, { question, options, correctAnswer, answerRevealed: false, startedAt: Date.now(), round: poll.round + 1, responses: {} }); saveDemo(); }, setResultsVisible(showResults) { poll.showResults = showResults; saveDemo(); }, revealAnswer() { poll.answerRevealed = true; saveDemo(); } };
}

async function startFirebase() {
  const [{ initializeApp }, { getDatabase, ref, onValue, update, set, onDisconnect }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js")
  ]);
  const db = getDatabase(initializeApp(firebaseConfig)), pollRef = ref(db, POLL_PATH);
  onValue(pollRef, snapshot => { poll = normalize(snapshot.val()); render(); });
  const presenceRef = ref(db, `${POLL_PATH}/presence/${participantId}`);
  await onDisconnect(presenceRef).remove(); await set(presenceRef, true);
  $("#connection-label").textContent = "Live meeting";
  return {
    vote(choice) { return update(ref(db, `${POLL_PATH}/responses`), { [participantId]: choice }); },
    reset() { return set(ref(db, `${POLL_PATH}/responses`), {}); },
    setRound(round) { return update(pollRef, { round }); },
    setPoll(question, options, correctAnswer) { return update(pollRef, { question, options, correctAnswer, answerRevealed: false, startedAt: Date.now(), round: (poll.round || 1) + 1, responses: {} }); },
    setResultsVisible(showResults) { return update(pollRef, { showResults }); },
    revealAnswer() { return update(pollRef, { answerRevealed: true }); }
  };
}

let service = startDemo();
if (useFirebase) startFirebase().then(remote => service = remote).catch(error => { console.warn("Firebase unavailable; using demo mode.", error); });
options.forEach(button => button.addEventListener("click", () => service.vote(button.dataset.choice)));
renderHostControls();

const dialog = $("#host-dialog");
function openHostDialog() { $("#host-code").value = ""; $("#form-error").textContent = ""; dialog.showModal(); setTimeout(() => $("#host-code").focus(), 0); }
$("#host-trigger").addEventListener("click", openHostDialog);
$("#close-dialog").addEventListener("click", () => dialog.close());
$("#host-form").addEventListener("submit", event => { event.preventDefault(); if ($("#host-code").value !== HOST_CODE) { $("#form-error").textContent = "That host code isn’t correct."; return; } hostSignedIn = true; isHost = true; localStorage.setItem("gather-host-signed-in", "true"); dialog.close(); render(); });
$("#reset-poll").addEventListener("click", () => { if (isHost) service.reset(); });
$("#change-round").addEventListener("click", () => { const next = window.prompt("Set round number", String(poll.round)); const round = Number.parseInt(next, 10); if (isHost && Number.isInteger(round) && round > 0) service.setRound(round); });
$("#confirm-poll").addEventListener("click", () => { const lines = $("#poll-text").value.split(/\r?\n/).map(line => line.trim()).filter(Boolean); if (lines.length !== 6 || !["1", "2", "3", "4"].includes(lines[5])) { $("#poll-text-error").textContent = "Enter six non-empty lines; the final line must be 1, 2, 3, or 4."; return; } $("#poll-text-error").textContent = ""; service.setPoll(lines[0], lines.slice(1, 5), lines[5]); $("#poll-text").value = ""; });
$("#toggle-results").addEventListener("click", () => { if (isHost) service.setResultsVisible(poll.showResults === false); });
$("#reveal-answer").addEventListener("click", () => { if (isHost && !poll.answerRevealed) service.revealAnswer(); });
document.addEventListener("keydown", event => { if (!dialog.open && ["1", "2", "3", "4"].includes(event.key) && !event.metaKey && !event.ctrlKey) service.vote(event.key); });
renderElapsedTimer(); setInterval(renderElapsedTimer, 1000);
if (pageRole === "host" && !hostSignedIn) openHostDialog();
