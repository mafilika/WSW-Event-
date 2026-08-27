// ==========================================
// FIREBASE
// ==========================================

import {
  initializeApp
}
from
"https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";


import {
  getAuth,
  onAuthStateChanged,
  signOut
}
from
"https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";


import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";



// ==========================================
// FIREBASE CONFIG
// ==========================================

const firebaseConfig = {

  apiKey:
    "AIzaSyAT6_OS3lgaXNGldWrpkV7by52cfWfpy9A",

  authDomain:
    "wsw-event.firebaseapp.com",

  projectId:
    "wsw-event",

  storageBucket:
    "wsw-event.firebasestorage.app",

  messagingSenderId:
    "1021036012955",

  appId:
    "1:1021036012955:web:9712358aa7d69252126d3e"

};



const app =
  initializeApp(
    firebaseConfig
  );


const auth =
  getAuth(app);


const db =
  getFirestore(app);



// ==========================================
// ELEMENTS
// ==========================================

const scanTab =
  document.getElementById(
    "scanTab"
  );


const manualTab =
  document.getElementById(
    "manualTab"
  );


const scannerSection =
  document.getElementById(
    "scannerSection"
  );


const manualSection =
  document.getElementById(
    "manualSection"
  );


const startScanner =
  document.getElementById(
    "startScanner"
  );


const stopScanner =
  document.getElementById(
    "stopScanner"
  );


const ticketForm =
  document.getElementById(
    "ticketForm"
  );


const ticketNumber =
  document.getElementById(
    "ticketNumber"
  );


const loading =
  document.getElementById(
    "loading"
  );


const message =
  document.getElementById(
    "message"
  );


const ticketResult =
  document.getElementById(
    "ticketResult"
  );


const statusBox =
  document.getElementById(
    "statusBox"
  );


const checkInButton =
  document.getElementById(
    "checkInButton"
  );


const nextGuestButton =
  document.getElementById(
    "nextGuestButton"
  );


const logoutButton =
  document.getElementById(
    "logoutButton"
  );


const staffEmail =
  document.getElementById(
    "staffEmail"
  );



let scanner = null;

let scannerRunning = false;

let currentTicketId = null;

let currentUser = null;

let processingScan = false;



// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      window.location.href =
        "login.html";

      return;

    }


    currentUser = user;


    staffEmail.textContent =
      user.email;


    // Check role

    const userRef =
      doc(
        db,
        "Users",
        user.uid
      );


    const userSnap =
      await getDoc(
        userRef
      );


    if (
      !userSnap.exists()
    ) {

      await signOut(auth);

      window.location.href =
        "login.html";

      return;

    }


    const role =
      String(
        userSnap.data().role
      )
      .toLowerCase();


    if (
      role !== "staff" &&
      role !== "admin"
    ) {

      await signOut(auth);

      window.location.href =
        "login.html";

    }

  }
);



// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener(
  "click",
  async () => {

    await stopScanner();

    await signOut(auth);

    window.location.href =
      "login.html";

  }
);



// ==========================================
// TABS
// ==========================================

scanTab.addEventListener(
  "click",
  async () => {

    await stopScanner();

    scanTab.classList.add(
      "active"
    );

    manualTab.classList.remove(
      "active"
    );

    scannerSection.classList.remove(
      "hidden"
    );

    manualSection.classList.add(
      "hidden"
    );

  }
);


manualTab.addEventListener(
  "click",
  async () => {

    await stopScanner();

    manualTab.classList.add(
      "active"
    );

    scanTab.classList.remove(
      "active"
    );

    manualSection.classList.remove(
      "hidden"
    );

    scannerSection.classList.add(
      "hidden"
    );

    setTimeout(
      () => ticketNumber.focus(),
      100
    );

  }
);



// ==========================================
// START CAMERA
// ==========================================

async function startCamera() {

  clearMessage();

  ticketResult.classList.add(
    "hidden"
  );


  if (
    typeof Html5Qrcode ===
    "undefined"
  ) {

    showMessage(
      "QR scanner failed to load."
    );

    return;

  }


  try {

    scanner =
      new Html5Qrcode(
        "reader"
      );


    await scanner.start(

      {
        facingMode:
          "environment"
      },

      {

        fps: 10,

        qrbox: {
          width: 250,
          height: 250
        }

      },

      async decodedText => {

        if (
          processingScan
        ) {

          return;

        }


        processingScan =
          true;


        await stopScanner();


        const id =
          extractTicketNumber(
            decodedText
          );


        if (!id) {

          showMessage(
            "The QR code does not contain a valid WSW ticket number."
          );

          processingScan =
            false;

          return;

        }


        await verifyTicket(
          id
        );

      },

      () => {}

    );


    scannerRunning =
      true;


    startScanner.classList.add(
      "hidden"
    );


    stopScanner.classList.remove(
      "hidden"
    );

  }

  catch (error) {

    console.error(
      error
    );


    showMessage(
      "Unable to open camera. Please allow camera access and use HTTPS."
    );

  }

}



// ==========================================
// STOP CAMERA
// ==========================================

async function stopScanner() {

  if (
    scanner &&
    scannerRunning
  ) {

    try {

      await scanner.stop();

      await scanner.clear();

    }

    catch (error) {

      console.log(error);

    }

  }


  scannerRunning =
    false;


  startScanner.classList.remove(
    "hidden"
  );


  stopScanner.classList.add(
    "hidden"
  );

}



// ==========================================
// EXTRACT TICKET NUMBER
// ==========================================

function extractTicketNumber(
  qrText
) {

  const text =
    qrText.trim();


  // QR:
  // Ticket: WSW26-001

  const match =
    text.match(
      /Ticket:\s*([A-Z0-9-]+)/i
    );


  if (match) {

    return match[1]
      .trim()
      .toUpperCase();

  }


  // QR contains only:
  // WSW26-001

  if (
    /^[A-Z0-9-]+$/i.test(text)
  ) {

    return text.toUpperCase();

  }


  return null;

}



// ==========================================
// MANUAL VERIFY
// ==========================================

ticketForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const id =
      ticketNumber.value
        .trim()
        .toUpperCase();


    if (!id) {

      showMessage(
        "Please enter a ticket number."
      );

      return;

    }


    await verifyTicket(
      id
    );

  }
);



// ==========================================
// VERIFY TICKET
// ==========================================

async function verifyTicket(
  id
) {

  loading.classList.remove(
    "hidden"
  );


  ticketResult.classList.add(
    "hidden"
  );


  clearMessage();


  try {

    const reference =
      doc(
        db,
        "Tickets",
        id
      );


    const snapshot =
      await getDoc(
        reference
      );


    loading.classList.add(
      "hidden"
    );


    if (
      !snapshot.exists()
    ) {

      showMessage(
        "❌ INVALID TICKET — Ticket not found."
      );


      processingScan =
        false;


      return;

    }


    const ticket =
      snapshot.data();


    currentTicketId =
      id;


    document.getElementById(
      "eventName"
    ).textContent =
      ticket.Event ||
      ticket.event ||
      "WSW Event";


    document.getElementById(
      "ticketId"
    ).textContent =
      id;


    document.getElementById(
      "guestName"
    ).textContent =
      ticket.Name ||
      ticket.name ||
      "Guest";


    document.getElementById(
      "ticketType"
    ).textContent =
      ticket.TicketType ||
      ticket.ticketType ||
      "General";


    const status =
      String(
        ticket.Status ||
        ticket.status ||
        ""
      )
      .trim()
      .toLowerCase();


    ticketResult.classList.remove(
      "hidden"
    );


    if (
      status ===
      "checked in"
    ) {

      statusBox.className =
        "status-box used";


      statusBox.textContent =
        "❌ ALREADY CHECKED IN";


      checkInButton.disabled =
        true;


      checkInButton.textContent =
        "TICKET ALREADY USED";


      document.getElementById(
        "checkInTime"
      ).textContent =
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
        "✅ VALID TICKET";


      checkInButton.disabled =
        false;


      checkInButton.textContent =
        "✓ CHECK IN GUEST";


      document.getElementById(
        "checkInTime"
      ).textContent =
        "Not checked in";

    }

  }

  catch (error) {

    console.error(
      error
    );


    loading.classList.add(
      "hidden"
    );


    showMessage(
      "Firebase error: " +
      error.message
    );

  }

}



// ==========================================
// CHECK IN
// ==========================================

checkInButton.addEventListener(
  "click",
  checkInGuest
);


async function checkInGuest() {

  if (
    !currentTicketId ||
    !currentUser
  ) {

    return;

  }


  checkInButton.disabled =
    true;


  checkInButton.textContent =
    "CHECKING IN...";


  try {

    const reference =
      doc(
        db,
        "Tickets",
        currentTicketId
      );


    // Transaction prevents
    // two staff members checking
    // the same ticket simultaneously.

    await runTransaction(
      db,
      async transaction => {

        const snapshot =
          await transaction.get(
            reference
          );


        if (
          !snapshot.exists()
        ) {

          throw new Error(
            "Ticket does not exist."
          );

        }


        const ticket =
          snapshot.data();


        const status =
          String(
            ticket.Status ||
            ticket.status ||
            ""
          )
          .trim()
          .toLowerCase();


        if (
          status ===
          "checked in"
        ) {

          throw new Error(
            "ALREADY_CHECKED_IN"
          );

        }


        transaction.update(
          reference,
          {

            Status:
              "Checked In",

            checkedInAt:
              serverTimestamp(),

            checkedInBy:
              currentUser.uid,

            checkedInByEmail:
              currentUser.email

          }
        );

      }
    );


    statusBox.className =
      "status-box valid";


    statusBox.textContent =
      "✅ GUEST CHECKED IN";


    checkInButton.textContent =
      "CHECK-IN COMPLETE";


    document.getElementById(
      "checkInTime"
    ).textContent =
      new Date()
        .toLocaleString(
          "en-ZA"
        );


    processingScan =
      false;

  }

  catch (error) {

    console.error(
      error
    );


    if (
      error.message ===
      "ALREADY_CHECKED_IN"
    ) {

      statusBox.className =
        "status-box used";


      statusBox.textContent =
        "❌ ALREADY CHECKED IN";


      checkInButton.textContent =
        "TICKET ALREADY USED";

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



// ==========================================
// NEXT GUEST
// ==========================================

nextGuestButton.addEventListener(
  "click",
  async () => {

    await stopScanner();


    currentTicketId =
      null;


    processingScan =
      false;


    ticketNumber.value =
      "";


    ticketResult.classList.add(
      "hidden"
    );


    clearMessage();


    loading.classList.add(
      "hidden"
    );


    checkInButton.disabled =
      false;


    checkInButton.textContent =
      "✓ CHECK IN GUEST";


    // Return to scan mode

    scanTab.click();

  }
);



// ==========================================
// MESSAGE
// ==========================================

function showMessage(
  text
) {

  message.textContent =
    text;

  message.classList.remove(
    "hidden"
  );

}


function clearMessage() {

  message.classList.add(
    "hidden"
  );

}



// ==========================================
// DATE
// ==========================================

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



// ==========================================
// CAMERA BUTTONS
// ==========================================

startScanner.addEventListener(
  "click",
  startCamera
);


stopScanner.addEventListener(
  "click",
  stopScanner
);
