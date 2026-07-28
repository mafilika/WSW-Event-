// Firebase imports

import {
  initializeApp
}
from
"https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";


import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";


// =================================
// PASTE YOUR FIREBASE CONFIG HERE
// =================================

const firebaseConfig = {

  apiKey:
  "PASTE_YOUR_API_KEY",

  authDomain:
  "PASTE_YOUR_AUTH_DOMAIN",

  projectId:
  "PASTE_YOUR_PROJECT_ID",

  storageBucket:
  "PASTE_YOUR_STORAGE_BUCKET",

  messagingSenderId:
  "PASTE_YOUR_MESSAGING_SENDER_ID",

  appId:
  "PASTE_YOUR_APP_ID"

};


// Initialize Firebase

const app =
initializeApp(
  firebaseConfig
);


// Connect Firestore

const db =
getFirestore(
  app
);


// =================================
// PAGE ELEMENTS
// =================================

const ticketInput =
document.getElementById(
  "ticketNumber"
);


const verifyButton =
document.getElementById(
  "verifyButton"
);


const checkInButton =
document.getElementById(
  "checkInButton"
);


const result =
document.getElementById(
  "result"
);


const loading =
document.getElementById(
  "loading"
);


const message =
document.getElementById(
  "message"
);


const statusBox =
document.getElementById(
  "statusBox"
);


let currentTicketId =
null;


// =================================
// VERIFY TICKET
// =================================

async function
verifyTicket() {

  const ticketId =
  ticketInput.value
  .trim()
  .toUpperCase();


  result.classList
  .add("hidden");


  message.classList
  .add("hidden");


  if (
    ticketId === ""
  ) {

    showMessage(
      "Please enter a ticket number."
    );

    return;

  }


  loading.classList
  .remove("hidden");


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
        "INVALID TICKET — Ticket not found."
      );

      return;

    }


    const ticket =
    ticketSnapshot.data();


    currentTicketId =
    ticketId;


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
    "General";


    const status =
    String(
      ticket.Status ||
      ticket.status ||
      ""
    )
    .toLowerCase();


    result.classList
    .remove("hidden");


    if (
      status.includes(
        "checked"
      )
    ) {

      statusBox
      .className =
      "status-box used";


      statusBox
      .textContent =
      "❌ ALREADY CHECKED IN";


      checkInButton
      .disabled =
      true;


      checkInButton
      .textContent =
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

      statusBox
      .className =
      "status-box valid";


      statusBox
      .textContent =
      "✓ VALID — NOT CHECKED IN";


      checkInButton
      .disabled =
      false;


      checkInButton
      .textContent =
      "✓ CHECK IN GUEST";


      document
      .getElementById(
        "checkInTime"
      )
      .textContent =
      "Not checked in";

    }

  }

  catch (
    error
  ) {

    loading.classList
    .add("hidden");


    console.error(
      error
    );


    showMessage(
      "Firebase error: " +
      error.message
    );

  }

}


// =================================
// CHECK IN
// =================================

async function
checkInGuest() {

  if (
    !currentTicketId
  ) {

    return;

  }


  checkInButton
  .disabled =
  true;


  checkInButton
  .textContent =
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


    statusBox
    .className =
    "status-box used";


    statusBox
    .textContent =
    "✓ CHECKED IN SUCCESSFULLY";


    checkInButton
    .textContent =
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

  }

  catch (
    error
  ) {

    console.error(
      error
    );


    showMessage(
      "Check-in failed: " +
      error.message
    );


    checkInButton
    .disabled =
    false;


    checkInButton
    .textContent =
    "✓ CHECK IN GUEST";

  }

}


// =================================
// HELPER FUNCTIONS
// =================================

function
showMessage(
  text
) {

  message
  .textContent =
  text;


  message.classList
  .remove("hidden");

}


function
formatDate(
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


  return
  "Checked in";

}


// =================================
// BUTTON EVENTS
// =================================

verifyButton
.addEventListener(
  "click",
  verifyTicket
);


checkInButton
.addEventListener(
  "click",
  checkInGuest
);


ticketInput
.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key ===
      "Enter"
    ) {

      verifyTicket();

    }

  }
);