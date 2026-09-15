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
const initialPoll = { round: 1, responses: {} };
let poll = initialPoll;
let participantId = localStorage.getItem("gather-participant-id") || crypto.randomUUID();
localStorage.setItem("gather-participant-id", participantId);

function normalize(data) { return { round: data?.round || 1, responses: data?.responses || {} }; }
function tally() { const values = Object.values(poll.responses); return [1, 2, 3, 4, 5].map(choice => values.filter(v => String(v) === String(choice)).length); }
function render() {
  const counts = tally(), total = counts.reduce((a, b) => a + b, 0), selection = poll.responses[participantId];
  options.forEach(button => button.classList.toggle("selected", button.dataset.choice === String(selection)));
  $("#selection-message").textContent = selection ? `Your response: ${selection}. You can change it anytime.` : "Pick an answer to participate.";
  $("#participant-count").textContent = `${total} response${total === 1 ? "" : "s"}`;
  $("#results-note").textContent = total ? "Results update as everyone answers." : "Waiting for the first response.";
  $("#round-label").textContent = `Round ${poll.round}`;
  $("#bars").innerHTML = counts.map((count, i) => `<div class="bar-row"><strong>${i + 1}</strong><div class="track"><div class="fill" style="width:${total ? (count / total) * 100 : 0}%"></div></div><span class="bar-count">${count}</span></div>`).join("");
}

function saveDemo() { localStorage.setItem("gather-demo-poll", JSON.stringify(poll)); render(); }
function startDemo() {
  poll = normalize(JSON.parse(localStorage.getItem("gather-demo-poll") || "null")); render();
  window.addEventListener("storage", event => { if (event.key === "gather-demo-poll") { poll = normalize(JSON.parse(event.newValue)); render(); } });
  $("#connection-label").textContent = "Demo meeting · this browser";
  return { vote(choice) { poll.responses[participantId] = choice; saveDemo(); }, reset() { poll = { round: poll.round + 1, responses: {} }; saveDemo(); } };
}

async function startFirebase() {
  const [{ initializeApp }, { getDatabase, ref, onValue, update, set }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js")
  ]);
  const db = getDatabase(initializeApp(firebaseConfig)), pollRef = ref(db, POLL_PATH);
  onValue(pollRef, snapshot => { poll = normalize(snapshot.val()); render(); });
  $("#connection-label").textContent = "Live meeting";
  return {
    vote(choice) { return update(ref(db, `${POLL_PATH}/responses`), { [participantId]: choice }); },
    reset() { return set(pollRef, { round: (poll.round || 1) + 1, responses: {} }); }
  };
}

let service = startDemo();
if (useFirebase) startFirebase().then(remote => service = remote).catch(error => { console.warn("Firebase unavailable; using demo mode.", error); });
options.forEach(button => button.addEventListener("click", () => service.vote(button.dataset.choice)));

const dialog = $("#host-dialog");
$("#host-trigger").addEventListener("click", () => { $("#host-code").value = ""; $("#form-error").textContent = ""; dialog.showModal(); setTimeout(() => $("#host-code").focus(), 0); });
$("#close-dialog").addEventListener("click", () => dialog.close());
$("#host-form").addEventListener("submit", event => { event.preventDefault(); if ($("#host-code").value !== HOST_CODE) { $("#form-error").textContent = "That host code isn’t correct."; return; } service.reset(); dialog.close(); });
document.addEventListener("keydown", event => { if (!dialog.open && ["1", "2", "3", "4", "5"].includes(event.key) && !event.metaKey && !event.ctrlKey) service.vote(event.key); });
