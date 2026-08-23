// ========================================
// FIREBASE IMPORTS
// ========================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";


// ========================================
// FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {
  apiKey: "AIzaSyAT6_OS3lgaXNGldWrpkV7by52cfWfpy9A",
  authDomain: "wsw-event.firebaseapp.com",
  projectId: "wsw-event",
  storageBucket: "wsw-event.firebasestorage.app",
  messagingSenderId: "1021036012955",
  appId: "1:1021036012955:web:9712358aa7d69252126d3e"
};


// ========================================
// INITIALIZE FIREBASE
// ========================================

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


// ========================================
// PAGE ELEMENTS
// ========================================

const startScannerButton =
  document.getElementById("startScanner");

const reader =
  document.getElementById("reader");

const loading =
  document.getElementById("loading");

const result =
  document.getElementById("result");

const message =
  document.getElementById("message");

const statusBox =
  document.getElementById("statusBox");

const checkInButton =
  document.getElementById("checkInButton");


// ========================================
// VARIABLES
// ========================================

let html5QrCode = null;

let currentTicketId = null;

let scannerRunning = false;

let scanProcessing = false;


// ========================================
// START QR SCANNER
// ========================================

async function startScanner() {

  result.classList.add("hidden");

  message.classList.add("hidden");

  if (typeof Html5Qrcode === "undefined") {

    showMessage(
      "QR scanner failed to load. Please check your internet connection."
    );

    return;
  }


  try {

    html5QrCode =
      new Html5Qrcode("reader");


    await html5QrCode.start(

      {
        facingMode: "environment"
      },

      {
        fps: 10,

        qrbox: {
          width: 250,
          height: 250
        }
      },

      onScanSuccess,

      onScanFailure

    );


    scannerRunning = true;

    startScannerButton.textContent =
      "📷 CAMERA IS OPEN";

    startScannerButton.disabled = true;

  }

  catch (error) {

    console.error(error);

    showMessage(
      "Camera could not open. Please allow camera access and make sure this page is running on HTTPS."
    );

  }

}


// ========================================
// QR DETECTED
// ========================================

async function onScanSuccess(decodedText) {

  if (scanProcessing) {
    return;
  }

  scanProcessing = true;


  await stopScanner();


  const ticketId =
    extractTicketNumber(decodedText);


  if (!ticketId) {

    showMessage(
      "This QR code does not contain a valid WSW ticket number."
    );

    scanProcessing = false;

    return;
  }


  await verifyTicket(ticketId);

}


// ========================================
// SCAN FAILURE
// ========================================

function onScanFailure() {

  // Ignore continuous scanner errors.

}


// ========================================
// STOP SCANNER
// ========================================

async function stopScanner() {

  if (
    html5QrCode &&
    scannerRunning
  ) {

    try {

      await html5QrCode.stop();

      await html5QrCode.clear();

    }

    catch (error) {

      console.log(
        "Scanner stopped."
      );

    }

  }


  scannerRunning = false;

  startScannerButton.disabled = false;

  startScannerButton.textContent =
    "📷 SCAN QR CODE";

}


// ========================================
// EXTRACT TICKET NUMBER
// ========================================

function extractTicketNumber(qrText) {

  const match =
    qrText.match(
      /Ticket:\s*([A-Z0-9-]+)/i
    );


  if (match) {

    return match[1]
      .trim()
      .toUpperCase();

  }


  const simpleTicket =
    qrText.trim();


  if (
    /^[A-Z0-9-]+$/i.test(
      simpleTicket
    )
  ) {

    return simpleTicket
      .toUpperCase();

  }


  return null;

}


// ========================================
// VERIFY TICKET
// ========================================

async function verifyTicket(ticketId) {

  loading.classList.remove("hidden");

  result.classList.add("hidden");

  message.classList.add("hidden");


  try {

    const ticketReference =
      doc(
        db,
        "Tickets",
        ticketId
      );


    const ticketSnapshot =
      await getDoc(
        ticketReference
      );


    loading.classList.add("hidden");


    if (!ticketSnapshot.exists()) {

      showMessage(
        "❌ INVALID TICKET — This ticket was not found."
      );

      scanProcessing = false;

      return;
    }


    const ticket =
      ticketSnapshot.data();


    currentTicketId =
      ticketId;


    // ========================================
    // DISPLAY TICKET
    // ========================================

    document
      .getElementById("eventName")
      .textContent =
        ticket.Event ||
        ticket.event ||
        "WSW Event";


    document
      .getElementById("ticketId")
      .textContent =
        ticketId;


    document
      .getElementById("guestName")
      .textContent =
        ticket.Name ||
        ticket.name ||
        "Not available";


    document
      .getElementById("ticketType")
      .textContent =
        ticket.TicketType ||
        ticket.ticketType ||
        "General";


    const ticketStatus =
      String(
        ticket.Status ||
        ticket.status ||
        ""
      )
      .trim()
      .toLowerCase();


    result.classList.remove("hidden");


    // ========================================
    // ALREADY CHECKED IN
    // ========================================

    if (
      ticketStatus === "checked in"
    ) {

      statusBox.className =
        "status-box used";


      statusBox.textContent =
        "❌ DUPLICATE — ALREADY CHECKED IN";


      checkInButton.disabled =
        true;


      checkInButton.textContent =
        "TICKET ALREADY USED";


      document
        .getElementById("checkInTime")
        .textContent =
          ticket.checkedInAt
          ?
          formatDate(
            ticket.checkedInAt
          )
          :
          "Previously checked in";

    }

    else {

      statusBox.className =
        "status-box valid";


      statusBox.textContent =
        "✅ VALID — NOT CHECKED IN";


      checkInButton.disabled =
        false;


      checkInButton.textContent =
        "✓ CHECK IN GUEST";


      document
        .getElementById("checkInTime")
        .textContent =
          "Not checked in";

    }

  }

  catch (error) {

    console.error(error);

    loading.classList.add("hidden");

    showMessage(
      "Firebase error: " +
      error.message
    );

    scanProcessing = false;

  }

}


// ========================================
// SECURE CHECK-IN
// ========================================

async function checkInGuest() {

  if (!currentTicketId) {
    return;
  }


  checkInButton.disabled = true;

  checkInButton.textContent =
    "CHECKING IN...";


  try {

    const ticketReference =
      doc(
        db,
        "Tickets",
        currentTicketId
      );


    await runTransaction(
      db,
      async (transaction) => {

        const ticketSnapshot =
          await transaction.get(
            ticketReference
          );


        if (!ticketSnapshot.exists()) {

          throw new Error(
            "Ticket no longer exists."
          );

        }


        const ticket =
          ticketSnapshot.data();


        const currentStatus =
          String(
            ticket.Status ||
            ticket.status ||
            ""
          )
          .trim()
          .toLowerCase();


        // ========================================
        // PREVENT DOUBLE CHECK-IN
        // ========================================

        if (
          currentStatus === "checked in"
        ) {

          throw new Error(
            "DUPLICATE_TICKET"
          );

        }


        transaction.update(

          ticketReference,

          {
            Status: "Checked In",

            checkedInAt:
              serverTimestamp()
          }

        );

      }
    );


    // ========================================
    // SUCCESS
    // ========================================

    statusBox.className =
      "status-box valid";


    statusBox.textContent =
      "✅ CHECKED IN SUCCESSFULLY";


    checkInButton.textContent =
      "CHECK-IN COMPLETE";


    document
      .getElementById("checkInTime")
      .textContent =
        new Date()
          .toLocaleString("en-ZA");


    scanProcessing = false;

  }

  catch (error) {

    console.error(error);


    if (
      error.message ===
      "DUPLICATE_TICKET"
    ) {

      statusBox.className =
        "status-box used";


      statusBox.textContent =
        "❌ DUPLICATE — ALREADY CHECKED IN";


      checkInButton.textContent =
        "TICKET ALREADY USED";


      checkInButton.disabled =
        true;

    }

    else {

      showMessage(
        "Check-in failed: " +
        error.message
      );


      checkInButton.disabled =
        false;


      checkInButton.textContent =
        "✓ CHECK IN GUEST";

    }

  }

}


// ========================================
// SHOW MESSAGE
// ========================================

function showMessage(text) {

  message.textContent =
    text;

  message.classList.remove(
    "hidden"
  );

}


// ========================================
// FORMAT FIREBASE TIMESTAMP
// ========================================

function formatDate(timestamp) {

  if (
    timestamp &&
    timestamp.toDate
  ) {

    return timestamp
      .toDate()
      .toLocaleString(
        "en-ZA"
      );

  }

  return "Checked in";

}


// ========================================
// BUTTON EVENTS
// ========================================

startScannerButton
  .addEventListener(
    "click",
    startScanner
  );


checkInButton
  .addEventListener(
    "click",
    checkInGuest
  );
