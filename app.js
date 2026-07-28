// ========================================
// FIREBASE IMPORTS
// ========================================

import {
  initializeApp
} from
"https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";


import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";


// ========================================
// FIREBASE CONFIGURATION
// KEEP YOUR REAL VALUES HERE
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


let html5QrCode = null;

let currentTicketId = null;

let scannerRunning = false;

let scanProcessing = false;


// ========================================
// START QR SCANNER
// ========================================

async function startScanner() {

  // Hide old information

  result.classList.add("hidden");

  message.classList.add("hidden");


  // Check that the scanner library loaded

  if (
    typeof Html5Qrcode === "undefined"
  ) {

    showMessage(
      "QR scanner failed to load. Check your internet connection and reload the page."
    );

    return;

  }


  try {

    // Create scanner

    html5QrCode =
      new Html5Qrcode("reader");


    // Ask for the back camera

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


    startScannerButton.disabled =
      true;


  }

  catch (error) {

    console.error(
      "Camera error:",
      error
    );


    showMessage(
      "Camera could not open. Please allow camera permission and make sure you are using the HTTPS Netlify website."
    );

  }

}


// ========================================
// QR CODE DETECTED
// ========================================

async function onScanSuccess(
  decodedText
) {

  // Prevent the same QR from being
  // processed many times

  if (
    scanProcessing
  ) {

    return;

  }


  scanProcessing = true;


  // Stop camera

  await stopScanner();


  // Extract ticket number

  const ticketId =
    extractTicketNumber(
      decodedText
    );


  if (
    !ticketId
  ) {

    showMessage(
      "This QR code does not contain a valid ticket number."
    );


    scanProcessing = false;

    return;

  }


  // Search Firebase

  await verifyTicket(
    ticketId
  );

}


// ========================================
// IGNORE SCAN ERRORS
// ========================================

function onScanFailure() {

  // This runs continuously while
  // the camera is looking for a QR code.

  // Do not show an error here.

}


// ========================================
// STOP CAMERA
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
        "Scanner stopped"
      );

    }

  }


  scannerRunning = false;


  startScannerButton.disabled =
    false;


  startScannerButton.textContent =
    "📷 SCAN QR CODE";

}


// ========================================
// EXTRACT TICKET NUMBER
// ========================================

function extractTicketNumber(
  qrText
) {

  // Your QR contains:
  // Ticket: WSW26-001

  const match =
    qrText.match(
      /Ticket:\s*([A-Z0-9-]+)/i
    );


  if (
    match
  ) {

    return match[1]
      .trim()
      .toUpperCase();

  }


  // Also accept a QR containing
  // only WSW26-001

  const simpleTicket =
    qrText.trim();


  if (
    /^[A-Z0-9-]+$/i
      .test(simpleTicket)
  ) {

    return simpleTicket
      .toUpperCase();

  }


  return null;

}


// ========================================
// VERIFY TICKET IN FIREBASE
// ========================================

async function verifyTicket(
  ticketId
) {

  loading.classList
    .remove("hidden");


  result.classList
    .add("hidden");


  message.classList
    .add("hidden");


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


    loading.classList
      .add("hidden");


    if (
      !ticketSnapshot.exists()
    ) {

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


    // Display information

    document
      .getElementById(
        "eventName"
      )
      .textContent =
        ticket.Event ||
        ticket.event ||
        "WSW Event";


    document
      .getElementById(
        "ticketId"
      )
      .textContent =
        ticketId;


    document
      .getElementById(
        "guestName"
      )
      .textContent =
        ticket.Name ||
        ticket.name ||
        "Not available";


    document
      .getElementById(
        "ticketType"
      )
      .textContent =
        ticket.TicketType ||
        ticket.ticketType ||
        "General R300";


    const ticketStatus =
      String(
        ticket.Status ||
        ticket.status ||
        ""
      )
      .trim()
      .toLowerCase();


    result.classList
      .remove("hidden");


    // DUPLICATE CHECK

    if (
      ticketStatus ===
      "checked in"
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
        .getElementById(
          "checkInTime"
        )
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
        .getElementById(
          "checkInTime"
        )
        .textContent =
          "Not checked in";

    }

  }

  catch (error) {

    console.error(error);


    loading.classList
      .add("hidden");


    showMessage(
      "Firebase error: " +
      error.message
    );

  }

}


// ========================================
// CHECK IN GUEST
// ========================================

async function checkInGuest() {

  if (
    !currentTicketId
  ) {

    return;

  }


  checkInButton.disabled =
    true;


  checkInButton.textContent =
    "CHECKING IN...";


  try {

    const ticketReference =
      doc(
        db,
        "Tickets",
        currentTicketId
      );


    await updateDoc(

      ticketReference,

      {

        Status:
          "Checked In",

        checkedInAt:
          serverTimestamp()

      }

    );


    statusBox.className =
      "status-box valid";


    statusBox.textContent =
      "✅ CHECKED IN SUCCESSFULLY";


    checkInButton.textContent =
      "CHECK-IN COMPLETE";


    document
      .getElementById(
        "checkInTime"
      )
      .textContent =
        new Date()
          .toLocaleString(
            "en-ZA"
          );


    scanProcessing =
      false;

  }

  catch (error) {

    console.error(error);


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


// ========================================
// SHOW MESSAGE
// ========================================

function showMessage(
  text
) {

  message.textContent =
    text;


  message.classList
    .remove("hidden");

}


// ========================================
// FORMAT FIREBASE DATE
// ========================================

function formatDate(
  timestamp
) {

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
